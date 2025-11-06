import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials from environment or .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('You can set them like:');
  console.error('  export SUPABASE_URL="your-project-url"');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('');
  console.error('Or create a .env.local file with these values.');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running migration: create_link_organization_function');
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'supabase/migrations/20240101000006_create_link_organization_function.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('');
    
    // Execute the migration
    console.log('⚡ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If exec_sql doesn't exist, try using PostgREST raw SQL (won't work directly)
      // Instead, let's split by semicolons and run each statement
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Actually, Supabase JS doesn't support raw SQL execution
      // We need to use the REST API or psql
      console.log('');
      console.log('❌ Cannot execute SQL directly via Supabase JS client.');
      console.log('');
      console.log('Please run this SQL in your Supabase Dashboard:');
      console.log('1. Go to https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Copy and paste the SQL below:');
      console.log('');
      console.log('='.repeat(80));
      console.log(migrationSQL);
      console.log('='.repeat(80));
      process.exit(1);
    }
    
    console.log('✅ Migration executed successfully!');
    console.log('Response:', data);
  } catch (err) {
    console.error('❌ Error running migration:', err.message);
    process.exit(1);
  }
}

runMigration();

