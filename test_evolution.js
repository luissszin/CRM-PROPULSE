
const run = async () => {
    try {
        const response = await fetch('http://localhost:8080/instance/create', {
            method: 'POST',
            headers: {
                'apikey': 'MINHA_API_KEY',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instanceName: "test_instance",
                token: "test_token",
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            })
        });

        console.log(`STATUS: ${response.status}`);
        const text = await response.text();
        console.log('BODY:', text);
    } catch (error) {
        console.error('Error:', error);
    }
};

run();
