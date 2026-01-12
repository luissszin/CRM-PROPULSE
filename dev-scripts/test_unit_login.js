
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/admin/login';

async function testLogin(email, password, unitSlug, description) {
    console.log(`\n--- ${description} ---`);
    console.log(`Payload:`, { email, password, unitSlug });

    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, unitSlug })
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.status === 200) {
            console.log('Success! User:', data.user.email);
            if (data.targetUnit) {
                console.log('Resolved context to Unit:', data.targetUnit.name);
            }
        } else {
            console.log('Failed:', data.error);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

(async () => {
    // 1. Super Admin Login (Global) - Should Success
    await testLogin('admin@propulse.com', 'admin123', undefined, 'Super Admin Global Login');

    // 2. Super Admin Login (Specific Unit) - Should Success (Access All)
    await testLogin('admin@propulse.com', 'admin123', 'test-unit-1766835421163', 'Super Admin Unit Login (test-unit...)');

    // 3. Agent Login (Correct Unit)
    // We need to know a user's unit. The seed creates 'Agente Demo' in 'Demo Unit'.
    // BUT we found 'Test Unit...' which might be different from seed data if persistence is on.
    // Let's assume there is NO agent for this unit yet unless we created one.
    // So this test might fail if user doesn't exist.
    // For now, let's just test Super Admin first.
    // await testLogin('agente@propulse.com', '123', 'test-unit-1766835421163', 'Agent Correct Unit Login');
    // Wait, can't import typescript or frontend files directly in node script easily without build.
    // I will rely on my knowledge of the seed data in serve.js:
    // User: agente@propulse.com / 123
    // Unit: demo (slug)
    await testLogin('agente@propulse.com', '123', 'demo', 'Agent Correct Unit Login');

    // 4. Agent Login (Wrong Unit)
    // I'll try to login to 'non-existent-unit' or just a fake slug 'other-unit' if it existed.
    // Since I only have 1 unit (demo) likely, I'll pass a non-existent fake slug first to test 404,
    // or if I had a second unit, I'd test 403.
    // Let's test non-existent slug first.
    await testLogin('agente@propulse.com', '123', 'invalid-slug-999', 'Agent Invalid Unit Slug');

    // 5. Agent Login (Correct Credentials, but missing permission for existing unit)
    // To test this properly I need a second unit.
    // But for now verifying 1-3 works is good start.
})();
