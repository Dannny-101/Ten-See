const fs = require('fs');
const path = require('path');
const https = require('https');
const ChatMessage = require('../models/ChatMessage');

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

    const history = await ChatMessage.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('message senderType')
        .lean();

    const historyMessages = history.reverse().map(msg => ({
        role: msg.senderType === 'ai' || msg.senderType === 'human' ? 'assistant' : 'user',
        content: msg.message
    }));

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...historyMessages,
        { role: 'user', content: message }
    ];

    return groqRequest(messages);
}

async function extractLeadData(sessionId) {
    if (!process.env.GROQ_API_KEY) return null;

    const history = await ChatMessage.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('message senderType')
        .lean();

    if (!history.length) return null;

    const transcript = history.reverse()
        .map(m => `${m.senderType === 'visitor' ? 'Student' : 'Agent'}: ${m.message}`)
        .join('\n');

    const extractionPrompt = `Extract student lead information from this chat transcript. 
Return ONLY a valid JSON object with these fields (use null for unknown):
{"name": string|null, "budget": string|null, "university": string|null, "moveIn": string|null}

Rules:
- budget: include the RM amount if mentioned (e.g. "RM800/month")
- moveIn: any date or timeframe mentioned (e.g. "July 2025", "next semester")
- university: full name if mentioned
- name: student's name if they introduced themselves
- Return ONLY the JSON, no explanation

Transcript:
${transcript}`;

    try {
        const raw = await groqRequest([
            { role: 'user', content: extractionPrompt }
        ]);
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

module.exports = { reply, extractLeadData };
