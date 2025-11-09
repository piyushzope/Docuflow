import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  website: z.string().optional(), // Honeypot
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Honeypot check
    if (body.website) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Validate input
    const validated = contactSchema.parse(body);

    // Get IP and user agent for rate limiting
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || headersList.get('x-real-ip') 
      || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Rate limiting: 5 requests per 15 minutes per IP
    const rateLimitKey = `${ipAddress}:${userAgent}`;
    const rateLimit = checkRateLimit(rateLimitKey, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    // Insert into database
    const supabase = await createClient();
    const { error } = await supabase.from('cms_contact_requests').insert({
      name: validated.name,
      email: validated.email,
      company: validated.company || null,
      phone: validated.phone || null,
      subject: validated.subject || null,
      message: validated.message,
      source: body.utm_source 
        ? `website:${body.utm_source}:${body.utm_medium || 'unknown'}`
        : 'website',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('Error inserting contact request:', error);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error processing contact request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

