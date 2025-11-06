# Microsoft OAuth Setup Guide

## Step 1: Register Your Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** (or **Microsoft Entra ID**)
3. Go to **App registrations** → **New registration**
4. Fill in the details:
   - **Name**: Docuflow (or your app name)
   - **Supported account types**: 
     - Choose based on your needs:
       - "Accounts in any organizational directory and personal Microsoft accounts" (recommended for testing)
       - "Accounts in this organizational directory only" (for single tenant)
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `http://localhost:3000/auth/microsoft/callback` (for local development)
     - For production, add: `https://yourdomain.com/auth/microsoft/callback`
5. Click **Register**

## Step 2: Get Your Client ID and Secret

1. After registration, you'll see the **Overview** page
2. Copy the **Application (client) ID** - this is your `MICROSOFT_CLIENT_ID`
3. Go to **Certificates & secrets** → **New client secret**
4. Add a description (e.g., "Docuflow OAuth Secret")
5. Choose expiration (recommended: 24 months for development)
6. Click **Add**
7. **Important**: Copy the **Value** immediately (you won't see it again!)
   - This is your `MICROSOFT_CLIENT_SECRET`

## Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
3. Add the following permissions:
   - `Mail.Read` - Read user mail
   - `Mail.Send` - Send mail as the user
   - `User.Read` - Sign in and read user profile (already added by default)
   - `offline_access` - Maintain access to data (already added by default)
4. Click **Add permissions**
5. **Important**: Click **Grant admin consent** if you're testing with an organizational account
   - For personal Microsoft accounts, consent happens on first sign-in

## Step 4: Add Environment Variables

Add these to your `apps/web/.env.local` file:

```env
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
```

**Important**: 
- Replace `your_client_id_here` with your actual Application (client) ID
- Replace `your_client_secret_here` with your actual client secret value
- For production, update `MICROSOFT_REDIRECT_URI` to your production URL

## Step 5: Restart Your Dev Server

After adding the environment variables:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## Troubleshooting

### Error: "Application with identifier 'your_microsoft_client_id' was not found"

- Make sure `MICROSOFT_CLIENT_ID` is set correctly in `.env.local`
- Restart your dev server after adding environment variables
- Check that there are no spaces or quotes around the values in `.env.local`

### Error: "AADSTS700016: Application was not found in the directory"

- Verify the Client ID is correct
- Make sure you're using the right tenant (common vs. your tenant)
- The app registration might be in a different Azure AD tenant than your email domain

### Error: "Insufficient privileges to complete the operation"

- Make sure you've granted admin consent for the API permissions
- Check that you're using an account that has permissions in the tenant

## Testing

1. Go to `/dashboard/integrations`
2. Click "Connect Microsoft" or "Connect Outlook"
3. You should be redirected to Microsoft sign-in
4. After signing in and granting permissions, you'll be redirected back

## Production Setup

For production:

1. Add your production redirect URI in Azure Portal:
   - `https://yourdomain.com/auth/microsoft/callback`
2. Update `.env.local` (or your production environment variables):
   ```env
   MICROSOFT_REDIRECT_URI=https://yourdomain.com/auth/microsoft/callback
   ```
3. Ensure your production URL matches exactly what's configured in Azure

