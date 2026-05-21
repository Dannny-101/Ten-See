const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'lead_created', 'lead_updated', 'lead_deleted', 'lead_status_changed',
      'listing_created', 'listing_updated', 'listing_deleted',
      'booking_created', 'booking_updated', 'booking_status_changed', 'booking_deleted',
      'chat_message_sent', 'chat_marked_read',
      'admin_login', 'admin_created',
      'notification_marked_read', 'notification_deleted',
      'settings_updated'
    ],
    required: true
  },
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    username: String,
    role: String,
    ipAddress: String,
    userAgent: String
  },
  target: {
    entityType: { type: String, enum: ['Lead', 'Listing', 'Booking', 'ChatMessage', 'Admin', 'Notification'] },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  previousState: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ 'performedBy.userId': 1 });
auditLogSchema.index({ 'target.entityType': 1, 'target.entityId': 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
