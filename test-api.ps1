# PowerShell script to test the BrandGuard API

Write-Host "Testing BrandGuard API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000" -Method Get
    Write-Host "✓ Server is running" -ForegroundColor Green
    Write-Host "Response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Server is not running. Please start it with: npm start" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Generate brand profile with brand statement
Write-Host "Test 2: Generate Brand Profile (with brand statement)" -ForegroundColor Yellow
$testBody = @{
    brand_name = "TechStart"
    brand_statement = "Fintech startup for Gen Z focusing on mobile-first banking solutions"
    format = "instagram_post"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $testBody -ContentType "application/json"
    Write-Host "✓ Brand profile generated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Brand Profile:" -ForegroundColor Cyan
    $response.brand_profile | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "✗ Error generating brand profile" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Generate brand profile with website URL (optional - comment out if you don't want to test crawling)
Write-Host "Test 3: Generate Brand Profile (with website URL)" -ForegroundColor Yellow
Write-Host "Note: This test is skipped by default. Uncomment to test website crawling." -ForegroundColor Gray
# Uncomment the following lines to test website crawling:
# $testBody2 = @{
#     brand_name = "Example Brand"
#     website_url = "https://example.com"
#     format = "facebook_post"
# } | ConvertTo-Json
# 
# try {
#     $response2 = Invoke-RestMethod -Uri "http://localhost:3000/brand/generate" -Method Post -Body $testBody2 -ContentType "application/json"
#     Write-Host "✓ Brand profile generated from website successfully" -ForegroundColor Green
#     Write-Host ""
#     Write-Host "Brand Profile:" -ForegroundColor Cyan
#     $response2.brand_profile | ConvertTo-Json -Depth 10
# } catch {
#     Write-Host "✗ Error generating brand profile from website" -ForegroundColor Red
#     Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
# }

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Cyan
