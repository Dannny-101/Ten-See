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
        <body style="font-family: 'Inter', Arial, sans-serif; color: #1C2420; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2C3830; border-bottom: 3px solid #B8954A; padding-bottom: 10px;">
              We've Received Your Enquiry ✓
            </h2>
            
            <p>Hi ${enquiryData.name || 'there'},</p>
            
            <p>Thank you for showing interest in ${enquiryData.propertyName || 'a property'}! We're excited to help you find your perfect home.</p>
            
            <div style="background: #F7F8FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Enquiry Reference:</strong> ${referenceNumber}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <h3 style="color: #2C3830;">What's Next?</h3>
            <ol>
              <li>Our team will review your enquiry within 24 hours</li>
              <li>We'll reach out via WhatsApp or email to confirm availability</li>
              <li>Schedule a viewing or get more information</li>
            </ol>
            
            <p>In the meantime, feel free to browse more listings at <a href="https://tensee.my/listings" style="color: #B8954A; text-decoration: none;">tensee.my/listings</a></p>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
            
            <p style="color: #6B7280; font-size: 0.9em;">
              — Ten&See Team<br>
              Building homes for students across Malaysia 🇲🇾
            </p>
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
        <body style="font-family: 'Inter', Arial, sans-serif; color: #1C2420;">
          <h2 style="color: #B8954A;">New Enquiry Received</h2>
          
          <p><strong>Name:</strong> ${enquiryData.name}</p>
          <p><strong>Email:</strong> ${enquiryData.email}</p>
          <p><strong>Phone:</strong> ${enquiryData.phone}</p>
          <p><strong>University:</strong> ${enquiryData.university || 'Not specified'}</p>
          <p><strong>Property:</strong> ${enquiryData.propertyName || 'Not specified'}</p>
          <p><strong>Move-in Date:</strong> ${enquiryData.moveInDate || 'Not specified'}</p>
          <p><strong>Budget:</strong> ${enquiryData.budget || 'Not specified'}</p>
          
          <p style="margin-top: 20px; color: #6B7280;">
            <a href="https://tensee.my/admin" style="color: #B8954A; text-decoration: none;">View in Dashboard →</a>
          </p>
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
