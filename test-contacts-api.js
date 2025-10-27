async function testContactsAPIPost() {
  try {
    console.log('Testing Contacts API POST endpoint...')

    // Test creating a new contact using a valid user ID
    const response = await fetch('http://localhost:3000/api/contacts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer user_1', // Using valid user ID '1'
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Contact',
        phoneNumber: '0412345678',
        email: 'test@example.com',
        category: 'personal',
        userId: '1' // Using valid user ID '1'
      })
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Contacts API POST working! Response:', data)
    } else {
      const errorText = await response.text()
      console.log('❌ Contacts API POST error:', response.status)
      console.log('Error response:', errorText)

      // Try to parse as JSON if possible
      try {
        const errorData = JSON.parse(errorText)
        console.log('Parsed error:', errorData)
      } catch (parseError) {
        console.log('Could not parse error as JSON')
      }
    }
  } catch (error) {
    console.error('❌ Error testing Contacts API POST:', error.message)
  }
}

testContactsAPIPost()
