Write-Host "Testing /api/forecast/compact endpoint" -ForegroundColor Cyan
Start-Sleep -Seconds 2

$url = "http://localhost:3000/api/forecast/compact?lat=6.8495&lon=101.9674&debug=true"

try {
  $response = Invoke-WebRequest -Uri $url -Method GET -ErrorAction Stop
  Write-Host "OK - Response received" -ForegroundColor Green
  Write-Host $response.Content
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
