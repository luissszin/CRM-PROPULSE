import axios from 'axios';

const BASE_URL = 'http://localhost:8085';
const API_KEY = 'MINHA_API_KEY';

async function cleanup() {
    try {
        console.log('Fetching instances...');
        const res = await axios.get(`${BASE_URL}/instance/fetchInstances`, { headers: { apikey: API_KEY } });
        const instances = res.data;
        
        for (const inst of instances) {
            const name = inst.instance.instanceName;
            console.log(`Deleting instance: ${name}...`);
            try {
                await axios.delete(`${BASE_URL}/instance/delete/${name}`, { headers: { apikey: API_KEY } });
                console.log(`Deleted ${name}`);
            } catch (e) {
                console.error(`Failed to delete ${name}: ${e.message}`);
            }
        }
        console.log('Cleanup complete.');
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

cleanup();
