async function testRulesAPI() {
  try {
    console.log('Testing Rules API endpoint...')

    // Test the API endpoint directly
    const response = await fetch('http://localhost:3000/api/rules?userId=1', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Rules API working! Response:', data)
    } else {
      const errorText = await response.text()
      console.log('❌ Rules API error:', response.status, errorText)
    }
  } catch (error) {
    console.error('❌ Error testing Rules API:', error.message)
  }
}

testRulesAPI()
