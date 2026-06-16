const fs = require('fs');
const path = require('path');
const https = require('https');

const SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, '../prompts/leasing.txt'),
    'utf8'
);

function groqRequest(messages) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            max_tokens: 200,
            temperature: 0.7
        });

        const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) return reject(new Error(json.error.message));
                    resolve(json.choices[0].message.content.trim());
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function reply(sessionId, message) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not set');
    }

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
    ];

    return groqRequest(messages);
}

module.exports = { reply };
