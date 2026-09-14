# Test the /api/forecast/compact endpoint
# Run in PowerShell

Write-Host "🧪 Testing /api/forecast/compact endpoint" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Wait for server to be ready
Write-Host "⏳ Waiting for server..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test with debug flag to get JSON response
Write-Host "📨 Testing compact endpoint with debug flag..." -ForegroundColor Green
Write-Host ""

try {
  $response = Invoke-WebRequest -Uri "http://localhost:3000/api/forecast/compact?lat=6.8495&lon=101.9674&debug=true" -Method GET -ErrorAction Stop
  
  Write-Host "✅ Request successful!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Response Headers:" -ForegroundColor Cyan
  $response.Headers | Format-Table -AutoSize
  
  Write-Host ""
  Write-Host "Response Body:" -ForegroundColor Cyan
  $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
  
} catch {
  Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Error: $($_.Exception)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ API Test Complete" -ForegroundColor Green
