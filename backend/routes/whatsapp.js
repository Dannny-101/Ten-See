const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const emailService = require('../services/email');
const { authMiddleware } = require('./admin');

/**
 * Verify the X-Hub-Signature-256 header sent by Meta.
 * HMAC-SHA256 of the raw request body keyed with the Meta App Secret.
 * Fails closed (403) when the secret is unset or the signature is missing/invalid.
 */
function verifyWhatsAppSignature(req, res, next) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[WhatsApp] WHATSAPP_APP_SECRET is not set — rejecting webhook');
    return res.status(403).json({ success: false, error: 'Webhook signature verification not configured' });
  }

  const signature = req.get('X-Hub-Signature-256');
  if (!signature || !req.rawBody) {
    return res.status(403).json({ success: false, error: 'Missing webhook signature' });
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return res.status(403).json({ success: false, error: 'Invalid webhook signature' });
  }

  next();
}

/**
 * POST /api/whatsapp/webhook
 * Handle incoming WhatsApp messages from webhook
 */
router.post('/webhook', verifyWhatsAppSignature, async (req, res) => {
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
      // Check for existing lead with same phone to avoid duplicates
      let lead = await Lead.findOne({ phone: phoneNumber });
      
      if (!lead) {
        // Create new lead from WhatsApp
        lead = await Lead.create({
          name: senderName || 'WhatsApp User',
          phone: phoneNumber,
          message: message,
          source: 'whatsapp',
          status: 'new',
          assignedTo: null
        });

        // Create dashboard notification
        await Notification.create({
          type: 'new_lead',
          title: 'New WhatsApp Lead',
          message: `${senderName || 'WhatsApp User'} messaged via WhatsApp: "${message?.substring(0, 50)}${message?.length > 50 ? '...' : ''}"`,
          recipient: { type: 'all' },
          data: { leadId: lead._id, source: 'whatsapp' },
          isRead: false
        });

        // Send email alert to admin
        try {
          await emailService.sendNewLeadAlert(
            process.env.ADMIN_EMAIL || 'admin@tenandsee.homes',
            {
              name: lead.name,
              email: lead.email || 'N/A (WhatsApp)',
              phone: lead.phone,
              source: lead.source,
              message: lead.message
            }
          );
        } catch (emailErr) {
          console.error('Failed to send WhatsApp lead email alert:', emailErr.message);
        }
      } else {
        // Update existing lead with new message
        lead.message = message;
        lead.status = 'new'; // Reset status to trigger attention
        lead.updatedAt = new Date();
        await lead.save();
      }

      // Emit real-time event to admin dashboard
      const io = req.app.get('io');
      const emitToAdmins = req.app.get('emitToAdmins');
      
      if (io && emitToAdmins) {
        emitToAdmins('new_whatsapp_lead', {
          leadId: lead._id,
          senderName: lead.name,
          phoneNumber: lead.phone,
          message: lead.message,
          source: 'whatsapp',
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
router.post('/send', authMiddleware, async (req, res) => {
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
