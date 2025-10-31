#!/bin/bash
echo "🔄 Testing database persistence fix..."
echo "📋 Current users in database:"
curl -s -X GET "http://localhost:3000/api/admin/users?page=1&limit=100" \
  -H "Authorization: Bearer admin_token" \
  | jq -r '.users[] | "\(.username) (\(.id)) - \(.email) - Active: \(.isActive)"' 2>/dev/null || echo "Could not fetch users"

echo ""
echo "🔑 Testing login with existing users..."
echo "Testing admin login..."
curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | jq -r '.error_description // "Login successful!"' 2>/dev/null || echo "Could not test login"

echo ""
echo "Testing demo login..."
curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "password123"}' \
  | jq -r '.error_description // "Login successful!"' 2>/dev/null || echo "Could not test login"

echo ""
echo "✅ Database persistence test complete!"
