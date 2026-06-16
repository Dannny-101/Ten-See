const axios = require('axios');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.instagram.com/v18.0';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

const AUTO_REPLY_MESSAGE = `Hi! Thanks for reaching out to Ten&See 👋

We've received your message and will reply within 24 hours.

In the meantime, check out our listings: https://tenandsee.homes/listings
Or fill out our quick form: https://tenandsee.homes

— Ten&See Team`;

/**
 * Send WhatsApp message via WhatsApp Business API
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('WhatsApp message sent:', response.data);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send auto-reply message
 */
async function sendAutoReply(phoneNumber) {
  return sendWhatsAppMessage(phoneNumber, AUTO_REPLY_MESSAGE);
}

/**
 * Handle incoming WhatsApp webhook
 */
function handleIncomingMessage(req) {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const contact = body.entry[0].changes[0].value.contacts?.[0];

      return {
        phoneNumber: message.from,
        message: message.text?.body || 'Media message',
        senderName: contact?.profile?.name || 'Unknown',
        messageId: message.id,
        timestamp: new Date(message.timestamp * 1000)
      };
    }
  }
  return null;
}

/**
 * Verify WhatsApp webhook token
 */
function verifyWebhookToken(req) {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || 'tensee_webhook_token';
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (token === verify_token) {
    return challenge;
  }
  return null;
}

module.exports = {
  sendWhatsAppMessage,
  sendAutoReply,
  handleIncomingMessage,
  verifyWebhookToken
};
