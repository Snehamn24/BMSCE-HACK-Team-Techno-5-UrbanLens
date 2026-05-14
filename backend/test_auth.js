// using native fetch

async function testAuth() {
  const ts = Date.now();
  const username = `testuser_${ts}`;
  const password = `Password123!`;
  
  try {
    console.log(`[1] Signing up user: ${username}`);
    const resSignup = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        username: username,
        phone: '9876543210',
        password: password
      })
    });
    
    const signupData = await resSignup.json();
    console.log('Signup Response:', resSignup.status, signupData);
    
    if (resSignup.status !== 201) {
      console.log('Signup failed, aborting test.');
      return;
    }
    
    console.log(`\n[2] Logging in user: ${username}`);
    const resLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    
    const loginData = await resLogin.json();
    console.log('Login Response:', resLogin.status, loginData);
    
  } catch (err) {
    console.error('Test error:', err);
  }
}

testAuth();
