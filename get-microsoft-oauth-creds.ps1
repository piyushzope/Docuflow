# PowerShell script to retrieve existing Microsoft OAuth app registration credentials
# Useful if you already created an app registration and need to retrieve or regenerate secrets

param(
    [string]$AppId = "",
    [string]$AppName = "Docuflow"
)

Write-Host "🔍 Microsoft OAuth Credential Retrieval" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
$azCli = Get-Command az -ErrorAction SilentlyContinue
if (-not $azCli) {
    Write-Host "❌ Azure CLI is not installed!" -ForegroundColor Red
    Write-Host "Please install it from: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in. Running: az login" -ForegroundColor Yellow
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Azure CLI ready" -ForegroundColor Green
Write-Host ""

# If AppId not provided, search by name
if ([string]::IsNullOrEmpty($AppId)) {
    Write-Host "🔍 Searching for app registration named '$AppName'..." -ForegroundColor Cyan
    $apps = az ad app list --display-name $AppName | ConvertFrom-Json
    
    if ($apps.Count -eq 0) {
        Write-Host "❌ No app registration found with name '$AppName'" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available app registrations:" -ForegroundColor Yellow
        az ad app list --query "[].{Name:displayName, AppId:appId}" --output table
        exit 1
    }
    
    if ($apps.Count -gt 1) {
        Write-Host "⚠️  Multiple app registrations found:" -ForegroundColor Yellow
        $apps | ForEach-Object { Write-Host "   - $($_.displayName) ($($_.appId))" -ForegroundColor Gray }
        Write-Host ""
        Write-Host "Please specify the App ID:" -ForegroundColor Yellow
        Write-Host "  .\get-microsoft-oauth-creds.ps1 -AppId 'your-app-id-here'" -ForegroundColor White
        exit 1
    }
    
    $appId = $apps[0].appId
    Write-Host "✅ Found: $($apps[0].displayName) ($appId)" -ForegroundColor Green
} else {
    $appId = $AppId
}

Write-Host ""

# Get app details
Write-Host "📋 App Registration Details:" -ForegroundColor Cyan
$app = az ad app show --id $appId | ConvertFrom-Json
Write-Host "   Name: $($app.displayName)" -ForegroundColor Gray
Write-Host "   App ID: $($app.appId)" -ForegroundColor Gray
Write-Host "   Object ID: $($app.id)" -ForegroundColor Gray

# Get redirect URIs
if ($app.web.redirectUris.Count -gt 0) {
    Write-Host "   Redirect URIs:" -ForegroundColor Gray
    $app.web.redirectUris | ForEach-Object { Write-Host "     - $_" -ForegroundColor Gray }
}

Write-Host ""

# List existing credentials
Write-Host "🔐 Existing Client Secrets:" -ForegroundColor Cyan
$credentials = az ad app credential list --id $appId | ConvertFrom-Json

if ($credentials.Count -eq 0) {
    Write-Host "   No client secrets found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Would you like to create a new client secret? (Y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        $secretExpiry = (Get-Date).AddMonths(24).ToString("yyyy-MM-dd")
        $secret = az ad app credential reset --id $appId --display-name "Docuflow OAuth Secret $(Get-Date -Format 'yyyy-MM-dd')" --end-date $secretExpiry | ConvertFrom-Json
        
        if ($secret.password) {
            Write-Host ""
            Write-Host "✅ New client secret created!" -ForegroundColor Green
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
            Write-Host "📋 Credentials:" -ForegroundColor Yellow
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "MICROSOFT_CLIENT_ID=$appId" -ForegroundColor White
            Write-Host "MICROSOFT_CLIENT_SECRET=$($secret.password)" -ForegroundColor White
            Write-Host ""
            Write-Host "⚠️  IMPORTANT: Save this secret now! It won't be shown again." -ForegroundColor Red
        }
    }
} else {
    Write-Host "   Found $($credentials.Count) secret(s):" -ForegroundColor Gray
    foreach ($cred in $credentials) {
        $expiry = if ($cred.endDate) { [DateTimeOffset]::Parse($cred.endDate).LocalDateTime.ToString("yyyy-MM-dd HH:mm") } else { "Never" }
        Write-Host "     - $($cred.displayName) (Expires: $expiry)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "⚠️  Client secret values cannot be retrieved after creation." -ForegroundColor Yellow
    Write-Host "   If you don't have the secret saved, create a new one:" -ForegroundColor Yellow
    Write-Host "   az ad app credential reset --id $appId --display-name 'New Secret Name'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 Current Configuration:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "MICROSOFT_CLIENT_ID=$appId" -ForegroundColor White
Write-Host "MICROSOFT_CLIENT_SECRET=<your-secret-value>" -ForegroundColor Gray
Write-Host ""
Write-Host "To get your redirect URI, check the Azure Portal or run:" -ForegroundColor Yellow
Write-Host "az ad app show --id $appId --query 'web.redirectUris'" -ForegroundColor Gray
Write-Host ""

