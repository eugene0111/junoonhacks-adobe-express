# Quick test command - copy and paste this into PowerShell

# Make sure server is running first: npm start

Write-Host "Testing BrandGuard API..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    brand_name = "TechStart"
    brand_statement = "Fintech startup for Gen Z"
    format = "instagram_post"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $body -ContentType "application/json"
    
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Full Response (JSON):" -ForegroundColor Yellow
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
    Write-Host ""
    Write-Host "Quick Summary:" -ForegroundColor Yellow
    Write-Host "  Format: instagram_post" -ForegroundColor White
    Write-Host "  Heading Font: $($response.brand_profile.fonts.heading)" -ForegroundColor White
    Write-Host "  Body Font: $($response.brand_profile.fonts.body)" -ForegroundColor White
    Write-Host "  Primary Color: $($response.brand_profile.colors.primary)" -ForegroundColor White
    Write-Host "  Tone: $($response.brand_profile.tone)" -ForegroundColor White
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
