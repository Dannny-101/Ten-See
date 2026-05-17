const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenandsee', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

app.use('/api/listings', require('./routes/listings'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit', require('./routes/audit').router);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

cron.schedule('0 9 * * 1', async () => {
  try {
    const emailService = require('./utils/email');
    const Lead = require('./models/Lead');
    const Listing = require('./models/Listing');
    const ChatMessage = require('./models/ChatMessage');
    const Booking = require('./models/Booking');

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const newLeads = await Lead.countDocuments({ createdAt: { $gte: last7Days } });
    const convertedLeads = await Lead.countDocuments({ status: 'converted', updatedAt: { $gte: last7Days } });
    const totalViews = await Listing.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
    const chatSessions = await ChatMessage.distinct('sessionId', { createdAt: { $gte: last7Days } });

    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

    await emailService.sendWeeklyReport(
      process.env.ADMIN_EMAIL || 'admin@tenandsee.com',
      { weekRange, newLeads, convertedLeads, totalViews: totalViews[0]?.total || 0, chatSessions: chatSessions.length }
    );

    console.log('Weekly report sent successfully');
  } catch (error) {
    console.error('Failed to send weekly report:', error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
