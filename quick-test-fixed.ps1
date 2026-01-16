# Quick test with proper JSON display

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
    Write-Host "Brand Profile Details:" -ForegroundColor Cyan
    Write-Host "  Fonts:" -ForegroundColor Yellow
    Write-Host "    Heading: $($response.brand_profile.fonts.heading)"
    Write-Host "    Body: $($response.brand_profile.fonts.body)"
    Write-Host "    H1 Size: $($response.brand_profile.fonts.h1_size)"
    Write-Host "    Body Size: $($response.brand_profile.fonts.body_size)"
    Write-Host ""
    Write-Host "  Colors:" -ForegroundColor Yellow
    Write-Host "    Primary: $($response.brand_profile.colors.primary)"
    Write-Host "    Secondary: $($response.brand_profile.colors.secondary)"
    Write-Host "    Accent: $($response.brand_profile.colors.accent)"
    Write-Host ""
    Write-Host "  Tone: $($response.brand_profile.tone)" -ForegroundColor Yellow
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
