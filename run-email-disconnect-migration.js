import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function showMigration() {
  console.log('🔧 Email Disconnect Migration');
  console.log('='.repeat(80));
  console.log('');
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'supabase/migrations/20250104000000_allow_all_users_disconnect_email.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Copy and paste this SQL into your Supabase SQL Editor:');
    console.log('');
    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
    console.log('');
    console.log('📋 Step-by-Step Instructions:');
    console.log('');
    console.log('1. Open your Supabase Dashboard: https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Click on "SQL Editor" in the left sidebar');
    console.log('4. Click "New Query"');
    console.log('5. Copy the entire SQL above (between the === lines)');
    console.log('6. Paste it into the SQL Editor');
    console.log('7. Click "Run" (or press Cmd+Enter / Ctrl+Enter)');
    console.log('8. Wait for "Success" confirmation');
    console.log('');
    console.log('✅ After running, you can disconnect email accounts successfully!');
    console.log('');
    console.log('🔍 Verify the migration ran:');
    console.log('Run this query to check if the constraint was dropped:');
    console.log('');
    console.log('SELECT column_name, is_nullable');
    console.log('FROM information_schema.columns');
    console.log("WHERE table_name = 'email_accounts'");
    console.log("AND column_name = 'encrypted_access_token';");
    console.log('');
    console.log('You should see: is_nullable = YES');
    console.log('');
    
  } catch (err) {
    console.error('❌ Error reading migration file:', err.message);
    console.error('');
    console.error('Make sure the file exists at:');
    console.error('  supabase/migrations/20250104000000_allow_all_users_disconnect_email.sql');
    process.exit(1);
  }
}

showMigration();

