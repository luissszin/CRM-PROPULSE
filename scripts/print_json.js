import fs from 'fs';
const data = JSON.parse(fs.readFileSync('instances.json', 'utf8'));
console.log(JSON.stringify(data, null, 2));
