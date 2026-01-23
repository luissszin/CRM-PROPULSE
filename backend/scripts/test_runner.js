
import { spawn, exec } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to kill process on port 3000
function killPort(port) {
    return new Promise((resolve) => {
        let command = '';
        if (process.platform === 'win32') {
            command = `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`;
        } else {
            command = `lsof -i :${port} -t | xargs kill -9`;
        }
        
        exec(command, (err) => {
            // It might fail if no process found, which is fine
            resolve();
        });
    });
}

// Helper to check if port is in use
function checkPort(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
            resolve(true); // Server is running
        }).on('error', () => {
            resolve(false); // Server is not running
        });
        req.end();
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(port, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await checkPort(port)) {
            return true;
        }
        await wait(1000);
    }
    return false;
}

async function run() {
    console.log('--- Test Runner ---');
    
    console.log('Ensure clean state: Killing any process on port 3000...');
    try {
        await killPort(3000);
        // Give it a second to die
        await wait(2000);
    } catch (e) {
        console.log('Kill port error (ignored):', e.message);
    }
    
    // Double check
    if (await checkPort(3000)) {
        console.warn('WARNING: Port 3000 still in use?');
    }

    console.log('Starting backend server...');
    const serverPath = path.join(__dirname, '../serve.js');
    const serverProcess = spawn('node', [serverPath], { 
        stdio: 'inherit',
        env: { ...process.env, PORT: '3000' }
    });

    const ready = await waitForServer(3000);
    if (!ready) {
        console.error('Server failed to start within timeout.');
        if (serverProcess) serverProcess.kill();
        process.exit(1);
    }
    console.log('Server is up!');

    // Run tests
    console.log('Running tests...');
    const jestParams = process.argv.slice(2);
    const jestArgs = ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', ...jestParams];
    
    const testProcess = spawn('node', jestArgs, { stdio: 'inherit', env: process.env });

    testProcess.on('close', (code) => {
        console.log(`Test process exited with code ${code}`);
        
        if (serverProcess) {
            console.log('Stopping temporary server...');
            serverProcess.kill();
        }
        
        process.exit(code);
    });
}

run();
