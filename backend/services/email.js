const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send enquiry confirmation email
 */
async function sendEnquiryConfirmation(emailAddress, enquiryData) {
  try {
    const referenceNumber = `ENQ-${Date.now()}`;

    const htmlContent = `
      <html>
        <body style="font-family: 'Inter', 'Space Grotesk', Arial, sans-serif; color: #f5f5dc; line-height: 1.6; background: #1a1a2e; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <!-- Header with Logo Area -->
            <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid rgba(201,168,76,0.3);">
              <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.75rem; font-weight: 700; color: #f5f5dc; letter-spacing: -0.02em;">
                Ten<span style="color: #c9a84c; font-weight: 700;">&</span>See
              </div>
              <div style="font-size: 0.8rem; color: rgba(201,168,76,0.8); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Student Housing</div>
            </div>

            <h2 style="color: #c9a84c; font-family: 'Space Grotesk', sans-serif; font-weight: 600; margin: 0 0 20px 0; font-size: 1.5rem;">
              <span style="color: #c9a84c;">✓</span> We've Received Your Enquiry
            </h2>

            <p style="color: rgba(245,245,220,0.9); margin: 0 0 16px 0;">Hi ${enquiryData.name || 'there'},</p>

            <p style="color: rgba(245,245,220,0.8); margin: 0 0 24px 0;">Thank you for showing interest in <strong style="color: #c9a84c;">${enquiryData.propertyName || 'a property'}</strong>! We're excited to help you find your perfect home.</p>

            <!-- Reference Box -->
            <div style="background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.25); border-radius: 12px; padding: 20px; margin: 24px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: rgba(245,245,220,0.7); font-size: 0.9rem;">Enquiry Reference:</span>
                <span style="color: #c9a84c; font-weight: 600; font-family: 'Space Grotesk', sans-serif;">${referenceNumber}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: rgba(245,245,220,0.7); font-size: 0.9rem;">Submitted:</span>
                <span style="color: #f5f5dc; font-size: 0.9rem;">${new Date().toLocaleString()}</span>
              </div>
            </div>

            <h3 style="color: #f5f5dc; font-family: 'Space Grotesk', sans-serif; font-weight: 600; margin: 28px 0 16px 0; font-size: 1.1rem;">What's Next?</h3>
            <ol style="color: rgba(245,245,220,0.8); padding-left: 20px; margin: 0 0 24px 0;">
              <li style="margin-bottom: 8px;">Our team will review your enquiry within <strong style="color: #c9a84c;">24 hours</strong></li>
              <li style="margin-bottom: 8px;">We'll reach out via WhatsApp or email to confirm availability</li>
              <li>Schedule a viewing or get more information</li>
            </ol>

            <p style="color: rgba(245,245,220,0.8); margin: 0 0 28px 0;">In the meantime, feel free to browse more listings at <a href="https://tensee.my/listings" style="color: #c9a84c; text-decoration: none; font-weight: 500;">tensee.my/listings</a></p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://tensee.my/listings" style="display: inline-block; background: linear-gradient(135deg, #c9a84c, #B8954A); color: #1a1a2e; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(201,168,76,0.3);">Browse More Listings</a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid rgba(201,168,76,0.15); padding-top: 24px; margin-top: 32px; text-align: center;">
              <p style="color: rgba(245,245,220,0.6); font-size: 0.85rem; margin: 0 0 8px 0;">
                — <strong style="color: #c9a84c;">Ten&See</strong> Team
              </p>
              <p style="color: rgba(245,245,220,0.5); font-size: 0.75rem; margin: 0;">
                Building homes for students across Malaysia 🇲🇾
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'hello@tensee.my',
      to: emailAddress,
      subject: `We've received your enquiry — Ten&See (Ref: ${referenceNumber})`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('Enquiry confirmation email sent to:', emailAddress);
    return referenceNumber;
  } catch (error) {
    console.error('Error sending enquiry confirmation email:', error);
    throw error;
  }
}

/**
 * Send admin notification email
 */
async function sendAdminNotification(adminEmail, enquiryData) {
  try {
    const htmlContent = `
      <html>
        <body style="font-family: 'Inter', 'Space Grotesk', Arial, sans-serif; color: #f5f5dc; background: #1a1a2e; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid rgba(201,168,76,0.3);">
              <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.75rem; font-weight: 700; color: #f5f5dc; letter-spacing: -0.02em;">
                Ten<span style="color: #c9a84c; font-weight: 700;">&</span>See
              </div>
              <div style="font-size: 0.8rem; color: rgba(201,168,76,0.8); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Admin Notification</div>
            </div>

            <h2 style="color: #c9a84c; font-family: 'Space Grotesk', sans-serif; font-weight: 600; margin: 0 0 24px 0; font-size: 1.4rem;">
              🔔 New Enquiry Received
            </h2>

            <!-- Enquiry Details -->
            <div style="background: rgba(201,168,76,0.06); border-radius: 12px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; color: rgba(245,245,220,0.9); font-size: 0.95rem; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: rgba(245,245,220,0.6); width: 120px;">Name:</td>
                  <td style="padding: 8px 0; font-weight: 500;">${enquiryData.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(245,245,220,0.6);">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${enquiryData.email}" style="color: #c9a84c; text-decoration: none;">${enquiryData.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(245,245,220,0.6);">Phone:</td>
                  <td style="padding: 8px 0;">${enquiryData.phone || 'Not provided'}</td>
                </tr>
                <tr style="border-top: 1px solid rgba(201,168,76,0.15);">
                  <td style="padding: 12px 0 8px 0; color: rgba(245,245,220,0.6);">University:</td>
                  <td style="padding: 12px 0 8px 0; color: #c9a84c; font-weight: 500;">${enquiryData.university || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(245,245,220,0.6);">Property:</td>
                  <td style="padding: 8px 0;">${enquiryData.propertyName || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(245,245,220,0.6);">Move-in:</td>
                  <td style="padding: 8px 0;">${enquiryData.moveInDate || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(245,245,220,0.6);">Budget:</td>
                  <td style="padding: 8px 0; color: #c9a84c; font-weight: 600;">${enquiryData.budget || 'Not specified'}</td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="https://tensee.my/admin" style="display: inline-block; background: linear-gradient(135deg, #c9a84c, #B8954A); color: #1a1a2e; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(201,168,76,0.3);">View in Dashboard →</a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid rgba(201,168,76,0.15); padding-top: 20px; margin-top: 28px; text-align: center;">
              <p style="color: rgba(245,245,220,0.5); font-size: 0.75rem; margin: 0;">
                Ten&See Admin System • ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'hello@tensee.my',
      to: adminEmail,
      subject: `[New Enquiry] ${enquiryData.name} - ${enquiryData.propertyName}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('Admin notification sent to:', adminEmail);
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
}

module.exports = {
  sendEnquiryConfirmation,
  sendAdminNotification
};
