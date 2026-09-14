#!/bin/bash
# Test the /api/forecast/compact endpoint

echo "🧪 Testing /api/forecast/compact endpoint"
echo "=========================================="
echo ""

# Wait for server to be ready
echo "⏳ Waiting for server..."
sleep 3

# Test with debug flag to get JSON response
echo "📨 Calling: GET /api/forecast/compact?lat=6.8495&lon=101.9674&debug=true"
echo ""

curl -v "http://localhost:3000/api/forecast/compact?lat=6.8495&lon=101.9674&debug=true" 2>&1 | head -50

echo ""
echo ""
echo "=========================================="
echo "✅ API Test Complete"
