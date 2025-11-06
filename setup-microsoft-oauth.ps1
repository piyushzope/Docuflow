# PowerShell script to create Microsoft OAuth app registration and retrieve credentials
# Prerequisites: Azure CLI must be installed and you must be logged in

param(
    [string]$AppName = "Docuflow",
    [string]$RedirectUri = "http://localhost:3000/auth/microsoft/callback",
    [string]$ResourceGroup = ""
)

Write-Host "🚀 Microsoft OAuth Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
$azCli = Get-Command az -ErrorAction SilentlyContinue
if (-not $azCli) {
    Write-Host "❌ Azure CLI is not installed!" -ForegroundColor Red
    Write-Host "Please install it from: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Azure CLI found" -ForegroundColor Green

# Check if user is logged in
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Azure. Please run: az login" -ForegroundColor Yellow
    Write-Host "Attempting to login..." -ForegroundColor Yellow
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        exit 1
    }
}

$account = az account show | ConvertFrom-Json
Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "   Tenant: $($account.tenantId)" -ForegroundColor Gray
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
Write-Host ""

# Step 1: Create App Registration
Write-Host "📝 Step 1: Creating app registration '$AppName'..." -ForegroundColor Cyan

$appRegistration = az ad app create `
    --display-name $AppName `
    --web-redirect-uris $RedirectUri `
    --enable-id-token-issuance true | ConvertFrom-Json

if (-not $appRegistration) {
    Write-Host "❌ Failed to create app registration!" -ForegroundColor Red
    exit 1
}

$appId = $appRegistration.appId
Write-Host "✅ App registration created!" -ForegroundColor Green
Write-Host "   App ID: $appId" -ForegroundColor Gray
Write-Host ""

# Step 2: Create Client Secret
Write-Host "🔐 Step 2: Creating client secret..." -ForegroundColor Cyan

$secretExpiry = (Get-Date).AddMonths(24).ToString("yyyy-MM-dd")
$secret = az ad app credential reset `
    --id $appId `
    --display-name "Docuflow OAuth Secret" `
    --end-date $secretExpiry | ConvertFrom-Json

if (-not $secret -or -not $secret.password) {
    Write-Host "❌ Failed to create client secret!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Client secret created!" -ForegroundColor Green
Write-Host ""

# Step 3: Configure API Permissions
Write-Host "🔑 Step 3: Configuring API permissions..." -ForegroundColor Cyan

# Microsoft Graph ID
$graphId = "00000003-0000-0000-c000-000000000000"

# Get Microsoft Graph service principal
$graphSp = az ad sp show --id $graphId | ConvertFrom-Json

if ($graphSp) {
    # Note: API permissions must be added manually in Azure Portal or via Graph API
    # The Azure CLI doesn't fully support adding OAuth2 permissions programmatically
    Write-Host "   ⚠️  API permissions need to be configured manually:" -ForegroundColor Yellow
    Write-Host "      1. Go to Azure Portal → App registrations → $AppName" -ForegroundColor Gray
    Write-Host "      2. Go to API permissions → Add a permission" -ForegroundColor Gray
    Write-Host "      3. Select Microsoft Graph → Delegated permissions" -ForegroundColor Gray
    Write-Host "      4. Add: Mail.Read, Mail.Send, User.Read, offline_access" -ForegroundColor Gray
    Write-Host "      5. Click 'Grant admin consent' if needed" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Quick link:" -ForegroundColor Cyan
    Write-Host "   https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/ApiPermissions/appId/$appId" -ForegroundColor White
} else {
    Write-Host "   ⚠️  Could not retrieve Microsoft Graph service principal" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Display Results
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 Credentials - Add these to your .env.local file:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "MICROSOFT_CLIENT_ID=$appId" -ForegroundColor White
Write-Host "MICROSOFT_CLIENT_SECRET=$($secret.password)" -ForegroundColor White
Write-Host "MICROSOFT_REDIRECT_URI=$RedirectUri" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Save to file
$envContent = @"
# Microsoft OAuth Credentials
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
MICROSOFT_CLIENT_ID=$appId
MICROSOFT_CLIENT_SECRET=$($secret.password)
MICROSOFT_REDIRECT_URI=$RedirectUri
"@

$outputFile = "microsoft-oauth-credentials.env"
$envContent | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "💾 Credentials saved to: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Save these credentials securely!" -ForegroundColor Yellow
Write-Host "   The client secret will not be shown again." -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Copy the credentials above to apps/web/.env.local" -ForegroundColor White
Write-Host "   2. Or append the contents of $outputFile to your .env.local" -ForegroundColor White
Write-Host "   3. Restart your dev server" -ForegroundColor White
Write-Host ""

# Optionally grant admin consent (commented out - requires admin rights)
Write-Host "💡 Note: For organizational accounts, you may need to grant admin consent:" -ForegroundColor Yellow
Write-Host "   Visit: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Authentication/appId/$appId" -ForegroundColor Gray
Write-Host ""

