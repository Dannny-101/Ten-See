const nodemailer = require('nodemailer');

// Create reusable transporter
// For development/testing, you can use Gmail SMTP or Mailtrap
// For production, use SendGrid, Mailgun, or AWS SES
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'your-email@gmail.com',
      pass: process.env.SMTP_PASS || 'your-app-password'
    }
  });
};

// Email templates
const templates = {
  newLead: (data) => ({
    subject: `New Lead: ${data.name} interested in ${data.listingTitle || 'a property'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Lead Alert</h2>
        <p>A new student just submitted an inquiry on <strong>Ten&See</strong>.</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">Lead Details</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
          <p><strong>University:</strong> ${data.university || 'Not provided'}</p>
          <p><strong>Source:</strong> ${data.source}</p>
          <p><strong>Property:</strong> ${data.listingTitle || 'General inquiry'}</p>
          <p><strong>Message:</strong> ${data.message || 'No message'}</p>
        </div>

        <a href="${data.dashboardUrl || 'http://localhost:5000/admin'}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View in Dashboard
        </a>

        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
          This email was sent automatically by Ten&See. Please do not reply.
        </p>
      </div>
    `
  }),

  leadStatusUpdate: (data) => ({
    subject: `Lead Status Updated: ${data.name} is now "${data.status}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Lead Status Update</h2>
        <p>The status of a lead has been updated.</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Previous Status:</strong> ${data.oldStatus}</p>
          <p><strong>New Status:</strong> <span style="color: #2563eb; font-weight: bold;">${data.status}</span></p>
          <p><strong>Updated By:</strong> ${data.updatedBy || 'System'}</p>
          <p><strong>Notes:</strong> ${data.notes || 'No notes added'}</p>
        </div>

        <a href="${data.dashboardUrl || 'http://localhost:5000/admin'}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
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
        <h2 style="color: #2563eb;">New Chat Message</h2>
        <p>You have a new message in the live chat.</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #2563eb; padding-left: 16px; margin: 10px 0; color: #334155;">
            ${data.message}
          </blockquote>
        </div>

        <a href="${data.chatUrl || 'http://localhost:5000/admin'}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
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
        <h2 style="color: #2563eb;">Weekly Performance Report</h2>
        <p>Here's how Ten&See performed this week:</p>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span>New Leads:</span>
            <strong style="color: #2563eb;">${data.newLeads}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span>Converted Leads:</span>
            <strong style="color: #10b981;">${data.convertedLeads}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span>Total Views:</span>
            <strong>${data.totalViews}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Chat Sessions:</span>
            <strong>${data.chatSessions}</strong>
          </div>
        </div>

        <a href="${data.dashboardUrl || 'http://localhost:5000/admin'}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
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
        <h2 style="color: #2563eb;">Thank You, ${data.name}!</h2>
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
          Ten&See - Student Housing Made Simple
        </p>
      </div>
    `
  })
};

// Main send email function
const sendEmail = async (to, templateName, data) => {
  try {
    const transporter = createTransporter();
    const template = templates[templateName](data);

    const info = await transporter.sendMail({
      from: `"Ten&See" <${process.env.SMTP_USER || 'noreply@tenandsee.com'}>`,
      to,
      subject: template.subject,
      html: template.html
    });

    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Convenience functions
const emailService = {
  sendNewLeadAlert: (adminEmail, leadData) => 
    sendEmail(adminEmail, 'newLead', leadData),

  sendStatusUpdate: (adminEmail, leadData) => 
    sendEmail(adminEmail, 'leadStatusUpdate', leadData),

  sendChatAlert: (adminEmail, chatData) => 
    sendEmail(adminEmail, 'newChatMessage', chatData),

  sendWeeklyReport: (adminEmail, reportData) => 
    sendEmail(adminEmail, 'weeklyReport', reportData),

  sendStudentConfirmation: (studentEmail, data) => 
    sendEmail(studentEmail, 'studentConfirmation', data),

  sendEmail // raw access if needed
};

module.exports = emailService;
