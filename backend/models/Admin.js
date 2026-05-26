const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  avatar: {
    emoji: { type: String, default: '🦁' },
    bg: { type: String, default: '#c9a84c' }
  },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin'], 
    default: 'admin' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  // Live chat queue fields
  chatStatus: { type: String, enum: ['online', 'away', 'invisible', 'offline'], default: 'offline' },
  maxChats: { type: Number, default: 3 },
  lastAssignedAt: { type: Date, default: null },
  activeChatCount: { type: Number, default: 0 },
  missedChats: { type: Number, default: 0 },
  lastMissedAt: { type: Date, default: null },
  avgResponseTime: { type: Number, default: 0 }, // seconds
  totalChatsHandled: { type: Number, default: 0 },
  notificationSettings: {
    pushEnabled: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: true },
    whatsappAlerts: { type: Boolean, default: true },
    phoneNumber: String
  },
  pushSubscription: mongoose.Schema.Types.Mixed
});

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
