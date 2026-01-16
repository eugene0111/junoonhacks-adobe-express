# Script to check if .env file and API key are configured correctly

Write-Host "Checking Environment Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    
    # Read .env file
    $envContent = Get-Content ".env" -Raw
    
    # Check for GEMINI_API_KEY
    if ($envContent -match "GEMINI_API_KEY\s*=\s*(.+)") {
        $apiKey = $matches[1].Trim()
        
        if ($apiKey -and $apiKey -ne "your_gemini_api_key_here" -and $apiKey.Length -gt 10) {
            Write-Host "✓ GEMINI_API_KEY is set" -ForegroundColor Green
            Write-Host "  Key length: $($apiKey.Length) characters" -ForegroundColor Gray
            Write-Host "  Key preview: $($apiKey.Substring(0, [Math]::Min(15, $apiKey.Length)))..." -ForegroundColor Gray
        } else {
            Write-Host "✗ GEMINI_API_KEY is not properly configured" -ForegroundColor Red
            Write-Host "  Please set a valid API key in .env file" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ GEMINI_API_KEY not found in .env file" -ForegroundColor Red
        Write-Host "  Add: GEMINI_API_KEY=your_actual_api_key_here" -ForegroundColor Yellow
    }
    
    # Check for PORT
    if ($envContent -match "PORT\s*=\s*(.+)") {
        $port = $matches[1].Trim()
        Write-Host "✓ PORT is set to: $port" -ForegroundColor Green
    } else {
        Write-Host "⚠ PORT not set (will default to 3000)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Create a .env file with:" -ForegroundColor Yellow
    Write-Host "  GEMINI_API_KEY=your_gemini_api_key_here" -ForegroundColor White
    Write-Host "  PORT=3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Get your API key from: https://makersuite.google.com/app/apikey" -ForegroundColor Cyan
}

Write-Host ""
