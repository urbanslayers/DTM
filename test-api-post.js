async function testRulesAPIPost() {
  try {
    console.log('Testing Rules API POST endpoint...')

    // Test creating a new rule
    const response = await fetch('http://localhost:3000/api/rules', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Rule from API',
        condition: { type: 'contains', value: 'test' },
        action: { type: 'forward', value: '1234567890' },
        enabled: true,
        userId: '1'
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Rules API POST working! Response:', data)
    } else {
      const errorText = await response.text()
      console.log('❌ Rules API POST error:', response.status, errorText)
    }
  } catch (error) {
    console.error('❌ Error testing Rules API POST:', error.message)
  }
}

testRulesAPIPost()
