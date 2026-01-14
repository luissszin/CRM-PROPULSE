import axios from 'axios';

async function checkEvolutionHealth() {
    const url = process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080';
    console.log(`Checking Evolution API at: ${url}`);
    
    try {
        const response = await axios.get(`${url}/instance/instanceNames`);
        console.log('Evolution API Response Status:', response.status);
        console.log('Active Instances:', response.data);
    } catch (err) {
        console.error('Error connecting to Evolution API:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}

checkEvolutionHealth();
