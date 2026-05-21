const fs = require('fs');
const path = require('path');

console.log('=== DIAGNOSTICS ===');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('');

const envPath = path.join(__dirname, '.env');
console.log('.env path:', envPath);
console.log('.env exists:', fs.existsSync(envPath));
console.log('');

try {
    require('dotenv').config();
    console.log('dotenv loaded successfully');
} catch (e) {
    console.log('dotenv error:', e.message);
}

console.log('');
console.log('Environment variables after dotenv:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET (hidden)' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('');

if (fs.existsSync(envPath)) {
    console.log('Raw .env file content:');
    console.log(fs.readFileSync(envPath, 'utf8'));
} else {
    console.log('.env file NOT FOUND');
    console.log('\nFiles in directory:');
    fs.readdirSync(__dirname).forEach(file => {
        console.log(' -', file);
    });
}
