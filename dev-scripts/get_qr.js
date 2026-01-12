
import fs from 'fs';

const run = async () => {
    try {
        // Connect/Get QR
        const response = await fetch('http://localhost:8080/instance/connect/test_instance', {
            method: 'GET',
            headers: {
                'apikey': 'MINHA_API_KEY'
            }
        });

        console.log(`STATUS: ${response.status}`);
        const data = await response.json();

        if (data.base64) {
            const html = `<html><body><h1>Scan this QR Code</h1><img src="${data.base64}" /></body></html>`;
            fs.writeFileSync('qrcode.html', html);
            console.log('QRCode saved to qrcode.html');
        } else if (data.qrcode && data.qrcode.base64) {
            const html = `<html><body><h1>Scan this QR Code</h1><img src="${data.qrcode.base64}" /></body></html>`;
            fs.writeFileSync('qrcode.html', html);
            console.log('QRCode saved to qrcode.html');
        } else {
            console.log('No QR Code found in response:', JSON.stringify(data));
        }

    } catch (error) {
        console.error('Error:', error);
    }
};

run();
