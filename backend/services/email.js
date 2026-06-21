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
            <h2 style="color: #386641; border-bottom: 3px solid #B8954A; padding-bottom: 10px;">
              We've Received Your Enquiry ✓
            </h2>
            
            <p>Hi ${enquiryData.name || 'there'},</p>
            
            <p>Thank you for showing interest in ${enquiryData.propertyName || 'a property'}! We're excited to help you find your perfect home.</p>
            
            <div style="background: #F7F8FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Enquiry Reference:</strong> ${referenceNumber}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <h3 style="color: #386641;">What's Next?</h3>
            <ol>
              <li>Our team will review your enquiry within 24 hours</li>
              <li>We'll reach out via WhatsApp or email to confirm availability</li>
              <li>Schedule a viewing or get more information</li>
            </ol>
            
            <p>In the meantime, feel free to browse more listings at <a href="https://tenandsee.homes/listings" style="color: #B8954A; text-decoration: none;">tenandsee.homes/listings</a></p>
            
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
      from: process.env.SMTP_FROM || 'hello@tenandsee.homes',
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
            <a href="https://tenandsee.homes/admin" style="color: #B8954A; text-decoration: none;">View in Dashboard →</a>
          </p>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'hello@tenandsee.homes',
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

/**
 * Send booking confirmation email to customer
 */
async function sendBookingConfirmation(customerEmail, bookingData) {
  try {
    const htmlContent = `
      <html>
        <body style="font-family: 'Inter', Arial, sans-serif; color: #1C2420; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #386641; border-bottom: 3px solid #B8954A; padding-bottom: 10px;">
              Booking Received ✓
            </h2>
            
            <p>Hi ${bookingData.name || 'there'},</p>
            
            <p>Thank you for your booking request! We've received your enquiry and will confirm availability shortly.</p>
            
            <div style="background: #F7F8FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Booking Reference:</strong> ${bookingData.bookingId || 'BK-' + Date.now()}</p>
              <p><strong>Property:</strong> ${bookingData.listingTitle || 'Selected property'}</p>
              <p><strong>Check-in:</strong> ${bookingData.checkInDate || 'TBD'}</p>
              <p><strong>Check-out:</strong> ${bookingData.checkOutDate || 'TBD'}</p>
              <p><strong>Total Amount:</strong> RM ${bookingData.totalAmount || '0'}</p>
            </div>
            
            <h3 style="color: #386641;">What's Next?</h3>
            <ol>
              <li>We'll review your booking within 24 hours</li>
              <li>You'll receive a confirmation email with payment instructions</li>
              <li>Pay the 30% deposit to secure your room</li>
            </ol>
            
            <p style="margin-top: 20px;">Questions? Reply to this email or WhatsApp us at <a href="https://wa.me/60184022169" style="color: #B8954A;">+60 18-402 2169</a></p>
            
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
      from: process.env.SMTP_FROM || 'hello@tenandsee.homes',
      to: customerEmail,
      subject: `Booking Received — Ten&See (${bookingData.listingTitle || 'Property Booking'})`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('Booking confirmation sent to:', customerEmail);
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    throw error;
  }
}

/**
 * Send admin notification for new booking
 */
async function sendBookingAdminNotification(adminEmail, bookingData) {
  try {
    const sourceBadge = bookingData.source === 'whatsapp' ? '🟢 WhatsApp' : '🔵 Website';
    const htmlContent = `
      <html>
        <body style="font-family: 'Inter', Arial, sans-serif; color: #1C2420;">
          <h2 style="color: #B8954A;">📅 New ${bookingData.source === 'whatsapp' ? 'WhatsApp' : 'Website'} Booking</h2>
          
          <div style="background: #F7F8FA; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${bookingData.source === 'whatsapp' ? '#25D366' : '#3B82F6'};">
            <p><strong>Source:</strong> ${sourceBadge}</p>
            <p><strong>Student:</strong> ${bookingData.studentName || bookingData.name || 'N/A'}</p>
            <p><strong>Email:</strong> ${bookingData.studentEmail || bookingData.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${bookingData.studentPhone || bookingData.phone || 'N/A'}</p>
            <p><strong>Property:</strong> ${bookingData.listingTitle || 'N/A'}</p>
            <p><strong>Check-in:</strong> ${bookingData.checkInDate || 'N/A'}</p>
            <p><strong>Check-out:</strong> ${bookingData.checkOutDate || 'N/A'}</p>
            <p><strong>Total:</strong> RM ${bookingData.totalAmount || '0'}</p>
          </div>
          
          <p style="margin-top: 20px;">
            <a href="https://tenandsee.homes/admin" style="background: #B8954A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View in Dashboard →</a>
          </p>
          
          <p style="color: #6B7280; margin-top: 30px;">
            — Ten&See Admin System
          </p>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'hello@tenandsee.homes',
      to: adminEmail,
      subject: `[New ${bookingData.source === 'whatsapp' ? 'WhatsApp' : 'Website'} Booking] ${bookingData.studentName || bookingData.name} - ${bookingData.listingTitle || 'Property'}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('Booking admin notification sent to:', adminEmail);
  } catch (error) {
    console.error('Error sending booking admin notification:', error);
    throw error;
  }
}

const templates = {
  newLead: (data) => ({
    subject: `New Lead: ${data.name} interested in ${data.listingTitle || 'a property'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C9A84C;">New Lead Alert</h2>
        <p>A new student just submitted an inquiry on <strong>Ten&amp;See</strong>.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1B2E4B;">Lead Details</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
          <p><strong>University:</strong> ${data.university || 'Not provided'}</p>
          <p><strong>Source:</strong> ${data.source}</p>
          <p><strong>Property:</strong> ${data.listingTitle || 'General inquiry'}</p>
          <p><strong>Message:</strong> ${data.message || 'No message'}</p>
        </div>
        <a href="${data.dashboardUrl || 'https://tenandsee.homes/admin'}"
           style="display: inline-block; background: #C9A84C; color: #1B2E4B; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View in Dashboard
        </a>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
          This email was sent automatically by Ten&amp;See.
        </p>
      </div>
    `
  }),

  leadStatusUpdate: (data) => ({
    subject: `Lead Status Updated: ${data.name} is now "${data.status}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C9A84C;">Lead Status Update</h2>
        <p>The status of a lead has been updated.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Previous Status:</strong> ${data.oldStatus}</p>
          <p><strong>New Status:</strong> <span style="color: #C9A84C; font-weight: bold;">${data.status}</span></p>
          <p><strong>Notes:</strong> ${data.notes || 'No notes added'}</p>
        </div>
        <a href="${data.dashboardUrl || 'https://tenandsee.homes/admin'}"
           style="display: inline-block; background: #C9A84C; color: #1B2E4B; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Lead Details
        </a>
      </div>
    `
  }),

  newChatMessage: (data) => ({
    subject: `New Chat Message from ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C9A84C;">New Chat Message</h2>
        <p>You have a new message in the live chat.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #C9A84C; padding-left: 16px; margin: 10px 0; color: #334155;">
            ${data.message}
          </blockquote>
        </div>
        <a href="${data.chatUrl || 'https://tenandsee.homes/admin'}"
           style="display: inline-block; background: #C9A84C; color: #1B2E4B; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reply in Chat
        </a>
      </div>
    `
  }),

  weeklyReport: (data) => ({
    subject: `Weekly Report - ${data.weekRange}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C9A84C;">Weekly Performance Report</h2>
        <p>Here's how Ten&amp;See performed this week:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span>New Leads:</span><strong style="color: #C9A84C;">${data.newLeads}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span>Converted Leads:</span><strong style="color: #10b981;">${data.convertedLeads}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span>Total Views:</span><strong>${data.totalViews}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Chat Sessions:</span><strong>${data.chatSessions}</strong>
          </div>
        </div>
        <a href="${data.dashboardUrl || 'https://tenandsee.homes/admin'}"
           style="display: inline-block; background: #C9A84C; color: #1B2E4B; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Full Dashboard
        </a>
      </div>
    `
  }),

  studentConfirmation: (data) => ({
    subject: `We've Received Your Inquiry - Ten&See`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C9A84C;">Thank You, ${data.name}!</h2>
        <p>We've received your inquiry and our team will get back to you shortly.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Inquiry Details</h3>
          <p><strong>Property:</strong> ${data.listingTitle || 'General inquiry'}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>What's next?</p>
        <ul>
          <li>Our team will review your inquiry within 24 hours</li>
          <li>We'll contact you via email or phone to discuss options</li>
          <li>You can reply to this email anytime if you have questions</li>
        </ul>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
          Ten&amp;See - Student Housing Made Simple
        </p>
      </div>
    `
  })
};

const sendEmail = async (to, templateName, data) => {
  const template = templates[templateName](data);
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'hello@tenandsee.homes',
    to,
    subject: template.subject,
    html: template.html
  });
  console.log(`Email sent: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
};

const sendRaw = async (to, subject, html) => {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'hello@tenandsee.homes',
    to,
    subject,
    html
  });
  console.log(`Email sent: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
};

module.exports = {
  sendEnquiryConfirmation,
  sendAdminNotification,
  sendBookingConfirmation,
  sendBookingAdminNotification,
  sendNewLeadAlert: (adminEmail, data) => sendEmail(adminEmail, 'newLead', data),
  sendStatusUpdate: (adminEmail, data) => sendEmail(adminEmail, 'leadStatusUpdate', data),
  sendChatAlert: (adminEmail, data) => sendEmail(adminEmail, 'newChatMessage', data),
  sendWeeklyReport: (adminEmail, data) => sendEmail(adminEmail, 'weeklyReport', data),
  sendStudentConfirmation: (studentEmail, data) => sendEmail(studentEmail, 'studentConfirmation', data),
  sendEmail,
  sendRaw
};
