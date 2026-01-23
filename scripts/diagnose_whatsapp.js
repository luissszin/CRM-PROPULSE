
import http from 'http';
import { exec } from 'child_process';

const EVOLUTION_PORT = 8080;
const BACKEND_PORT = 3000;

function checkPort(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/`, (res) => {
            resolve(true);
        }).on('error', () => {
            resolve(false);
        });
        req.end();
    });
}


console.log('--- WhatsApp Integration Diagnostic ---');

// 1. Check Backend
checkPort(BACKEND_PORT).then(backendUp => {
    console.log(`[1] CRM Backend (Port ${BACKEND_PORT}): ${backendUp ? '✅ ONLINE' : '❌ OFFLINE'}`);
    if (!backendUp) console.log('    -> Run "npm run dev:backend" to start.');
    
    // 2. Check Evolution API
    checkPort(EVOLUTION_PORT).then(evolutionUp => {
        console.log(`[2] Evolution API (Port ${EVOLUTION_PORT}): ${evolutionUp ? '✅ ONLINE' : '❌ OFFLINE'}`);
        
        if (!evolutionUp) {
            console.log('\n❌ Evolution API is NOT running. Connection will fail.');
            console.log('--- FIX INSTRUCTIONS ---');
            console.log('1. Ensure Docker Desktop is running.');
            console.log('2. Open a terminal in this project root.');
            console.log('3. Run command: docker-compose up -d');
            console.log('4. Wait ~30 seconds for it to start.');
            console.log('------------------------');
        } else {
            console.log('\n✅ Evolution API is ready! You can see the QR Code in the frontend.');
        }
    });
});
