const http = require('http');
const jwt = require('jsonwebtoken');

// Payload for a 'profesor' user (Camila)
const payload = {
    id: 4,
    username: 'camila',
    rol: 'profesor'
};

// Use the JWT secret from environment
const JWT_SECRET = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token valid for 1 hour

console.log('🔑 Generated JWT token for Camila:', token.substring(0, 50) + '...');

const studentRut = '246866996'; // RUT without dots and hyphen

async function getStudentAndGuardians() {
    try {
        // 1. Search for the student by RUT
        const searchOptions = {
            hostname: 'localhost',
            port: 5003,
            path: `/api/students/search?query=${studentRut}`,
            method: 'GET',
            headers: {
                'Cookie': `jwtToken=${token}`,
                'Content-Type': 'application/json'
            }
        };

        console.log(`
📡 Searching for student with RUT: ${studentRut}...`);
        const studentSearchResponse = await makeRequest(searchOptions);

        if (studentSearchResponse.statusCode !== 200) {
            console.error(`❌ Error searching for student: ${studentSearchResponse.message || studentSearchResponse.body}`);
            return;
        }

        const students = JSON.parse(studentSearchResponse.body);

        if (students.length === 0) {
            console.log(`❌ Student with RUT ${studentRut} not found.`);
            return;
        }

        const student = students[0]; // Assuming the first result is the correct one
        console.log(`✅ Student found: ${student.nombres} ${student.apellido_paterno} (ID: ${student.id})`);
        console.log('Datos del Estudiante:', student);

        // 2. Get guardians for the found student
        const guardiansOptions = {
            hostname: 'localhost',
            port: 5003,
            path: `/api/students/${student.id}/apoderados`,
            method: 'GET',
            headers: {
                'Cookie': `jwtToken=${token}`,
                'Content-Type': 'application/json'
            }
        };

        console.log(`
📡 Getting guardians for student ID: ${student.id}...`);
        const guardiansResponse = await makeRequest(guardiansOptions);

        if (guardiansResponse.statusCode !== 200) {
            console.error(`❌ Error getting guardians: ${guardiansResponse.message || guardiansResponse.body}`);
            return;
        }

        const guardians = JSON.parse(guardiansResponse.body);
        console.log(`✅ Found ${guardians.length} guardians for student ${student.nombres}:`);
        guardians.forEach((guardian, index) => {
            console.log(`  Apoderado ${index + 1}: ${guardian.nombre} ${guardian.apellido_paterno} (Principal: ${guardian.es_principal ? 'Sí' : 'No'}, Parentesco: ${guardian.parentesco})`);
            console.log(`    RUT: ${guardian.rut}-${guardian.dv}, Celular: ${guardian.celular}, Email: ${guardian.email || 'N/A'}`);
        });

    } catch (error) {
        console.error('❌ An error occurred:', error);
    }
}

function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: body });
            });
        });
        req.on('error', (error) => reject(error));
        req.end();
    });
}

getStudentAndGuardians();
