const https = require('https');
const fs = require('fs');

const API_KEY = 'AIzaSyCLlAEfDl3fwy16uVD_YsM0fhmezc5auoQ';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            fs.writeFileSync('models.json', JSON.stringify(json, null, 2));
            console.log('Models saved to models.json');
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw data:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
