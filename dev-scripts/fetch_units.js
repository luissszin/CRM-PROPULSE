
import fetch from 'node-fetch';

const UNITS_URL = 'http://localhost:3000/admin/units';

(async () => {
    try {
        const res = await fetch(UNITS_URL);
        const data = await res.json();
        console.log('Units found:', data.length);
        data.forEach(u => console.log(`- Name: ${u.name}, Slug: ${u.slug}, ID: ${u.id}`));
    } catch (e) {
        console.error('Error fetching units:', e.message);
    }
})();
