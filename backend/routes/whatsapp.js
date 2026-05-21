const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const Lead = require('../models/Lead');

/**
 * POST /api/whatsapp/webhook
 * Handle incoming WhatsApp messages from webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook token
    const challenge = whatsappService.verifyWebhookToken(req);
    if (challenge) {
      return res.status(200).send(challenge);
    }

    // Handle incoming message
    const incomingData = whatsappService.handleIncomingMessage(req);
    if (!incomingData) {
      return res.status(200).json({ success: false, message: 'No message data' });
    }

    const { phoneNumber, message, senderName } = incomingData;

    // Send auto-reply
    await whatsappService.sendAutoReply(phoneNumber);

    // Store as lead if phone provided
    if (phoneNumber) {
      const lead = await Lead.create({
        name: senderName,
        phone: phoneNumber,
        message: message,
        source: 'whatsapp',
        status: 'new'
      });

      // Notify admin via dashboard (emit socket event)
      const io = req.app.get('io');
      if (io) {
        io.emit('new_whatsapp_message', {
          leadId: lead._id,
          senderName,
          phoneNumber,
          message,
          timestamp: new Date()
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/whatsapp/webhook
 * Verify webhook token for WhatsApp setup
 */
router.get('/webhook', (req, res) => {
  const challenge = whatsappService.verifyWebhookToken(req);
  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Invalid verify token' });
  }
});

/**
 * POST /api/whatsapp/send
 * Send WhatsApp message to specific number (admin only)
 */
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, error: 'Phone number and message required' });
    }

    const success = await whatsappService.sendWhatsAppMessage(phoneNumber, message);

    res.status(200).json({
      success,
      message: success ? 'Message sent' : 'Failed to send message'
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
