const http = require('http');
const jwt = require('jsonwebtoken');

// Payload for a 'profesor' user (Camila)
const payload = {
    id: 4,
    username: 'camila',
    rol: 'profesor'
};

// Use the JWT secret from environment or a default test secret
const JWT_SECRET = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token valid for 1 hour

console.log('🔑 Generated JWT token for Camila:', token.substring(0, 50) + '...');

const rutToCheck = '17194600';
const options = {
    hostname: 'localhost',
    port: 5003, // Backend runs on port 5003
    path: `/api/guardians/check/${rutToCheck}`,
    method: 'GET',
    headers: {
        'Cookie': `jwtToken=${token}`,
        'Content-Type': 'application/json'
    }
};

console.log(`\n📡 Making request to /api/guardians/check/${rutToCheck} with Camila's token...`);

const req = http.request(options, (res) => {
    console.log(`📈 Response Status: ${res.statusCode}`);

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n📄 Response Body:');
        try {
            const jsonData = JSON.parse(data);
            if (res.statusCode === 200 && jsonData.exists) {
                console.log(`✅ El RUT ${rutToCheck} existe en la tabla apoderados_ok.`);
                console.log('Detalles:', jsonData.guardian);
            } else if (res.statusCode === 200 && !jsonData.exists) {
                console.log(`❌ El RUT ${rutToCheck} NO existe en la tabla apoderados_ok.`);
            } else {
                console.error('Error en la respuesta del servidor:', jsonData.message || data);
            }
        } catch (error) {
            console.error('Error parsing JSON or unexpected response:', error);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error);
});

req.end();
