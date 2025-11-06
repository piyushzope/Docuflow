# Employee Directory Setup Guide

## Environment Variables Required

To enable automatic employee account creation, you need to configure the Supabase service role key:

### Required Environment Variables

Add these to your `apps/web/.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ← Required for creating employee accounts
```

### How to Get Your Service Role Key

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Find the **service_role** key (under "Project API keys")
5. Copy it to your `.env.local` file

⚠️ **Important**: The service_role key has admin privileges. Keep it secret and never commit it to version control!

### Adding Employees Without Service Role Key

If `SUPABASE_SERVICE_ROLE_KEY` is not configured:

- You can still add employees, but they **must sign up first** at `/signup`
- After they sign up, you can add them to your organization via the "Add Employee" form
- Their profile will be updated with the information you provide

### Troubleshooting

#### Error: "Invalid API key"

- **Check 1**: Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `apps/web/.env.local`
- **Check 2**: Make sure you copied the **service_role** key (not the anon key)
- **Check 3**: Restart your Next.js dev server after adding the environment variable
- **Check 4**: Verify the key starts with `eyJ...` (it's a JWT token)

#### Error: "Service role key not configured"

- Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local` file
- Restart your dev server: `npm run dev`

### Workflow

#### With Service Role Key (Recommended)
1. Admin adds employee via "Add Employee" form
2. System automatically creates their account
3. Employee receives email to set password
4. Employee can login immediately

#### Without Service Role Key
1. Employee signs up at `/signup` first
2. Admin adds them via "Add Employee" form
3. System updates their existing profile with organization info
4. Employee is added to the directory

### Security Notes

- The service role key bypasses Row Level Security (RLS)
- Only use it server-side (API routes)
- Never expose it in client-side code
- Rotate it if accidentally exposed

