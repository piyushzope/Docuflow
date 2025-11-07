// Supabase Edge Function: Validation Worker
// Processes queued validation jobs with retry logic and exponential backoff
// Runs via cron job or can be triggered manually

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ProcessingResult {
  processed: number;
  completed: number;
  failed: number;
  movedToDLQ: number;
  errors: string[];
}

/**
 * Process a single validation job
 */
async function processValidationJob(
  supabase: any,
  job: any,
  encryptionKey: string,
  openAiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Mark job as processing
    await supabase
      .from('validation_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Call the validate-document function
    const validateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-document`;
    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentId: job.document_id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Validation failed: ${response.status} ${errorText}`);
    }

    // Mark job as completed
    await supabase
      .from('validation_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    
    // Check if we've reached max attempts
    if (job.attempt >= job.max_attempts) {
      // Move to DLQ
      await supabase.rpc('move_job_to_dlq', {
        p_job_id: job.id,
        p_error_message: errorMessage,
        p_error_details: {
          attempt: job.attempt,
          document_id: job.document_id,
          error: errorMessage,
        },
      });

      return {
        success: false,
        error: `Max attempts reached. Moved to DLQ: ${errorMessage}`,
      };
    }

    // Calculate next retry time using exponential backoff
    const { data: nextRetryInterval } = await supabase.rpc('calculate_next_retry_time', {
      attempt_number: job.attempt + 1,
    });

    const nextRunAt = new Date();
    nextRunAt.setTime(nextRunAt.getTime() + (nextRetryInterval?.minutes || 1) * 60 * 1000);

    // Update job with error and schedule retry
    await supabase
      .from('validation_jobs')
      .update({
        status: 'pending',
        attempt: job.attempt + 1,
        next_run_at: nextRunAt.toISOString(),
        error_message: errorMessage,
        error_details: {
          attempt: job.attempt,
          error: errorMessage,
          next_retry: nextRunAt.toISOString(),
        },
        started_at: null, // Reset started_at for next attempt
      })
      .eq('id', job.id);

    return {
      success: false,
      error: `Will retry (attempt ${job.attempt + 1}/${job.max_attempts}): ${errorMessage}`,
    };
  }
}

/**
 * Process pending validation jobs
 */
async function processValidationQueue(
  supabase: any,
  encryptionKey: string,
  openAiKey: string,
  batchSize: number = 10
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    movedToDLQ: 0,
    errors: [],
  };

  try {
    // Get pending jobs that are due
    const { data: jobs, error: fetchError } = await supabase
      .from('validation_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('No pending validation jobs found');
      return result;
    }

    console.log(`Processing ${jobs.length} validation job(s)...`);

    // Process each job
    for (const job of jobs) {
      result.processed++;
      
      try {
        const jobResult = await processValidationJob(supabase, job, encryptionKey, openAiKey);
        
        if (jobResult.success) {
          result.completed++;
        } else {
          result.failed++;
          if (jobResult.error?.includes('Moved to DLQ')) {
            result.movedToDLQ++;
          }
          result.errors.push(`Job ${job.id}: ${jobResult.error}`);
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Job ${job.id}: ${error.message}`);
        console.error(`Error processing job ${job.id}:`, error);
      }
    }

    return result;
  } catch (error: any) {
    console.error('Error processing validation queue:', error);
    result.errors.push(`Queue processing error: ${error.message}`);
    return result;
  }
}

/**
 * Main serve handler
 */
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get batch size from query params or use default
    const url = new URL(req.url);
    const batchSize = parseInt(url.searchParams.get('batchSize') || '10', 10);

    // Process the queue
    const result = await processValidationQueue(supabase, encryptionKey, openAiKey, batchSize);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Validation worker error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Validation worker failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

