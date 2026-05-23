const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  from: String,
  to: String,
  by: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    username: String,
    name: String
  },
  at: { type: Date, default: Date.now }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['lead', 'listing', 'booking', 'chat', 'general', 'maintenance'],
    default: 'general'
  },
  assignedTo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    username: String,
    name: String
  },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    username: { type: String, required: true },
    name: { type: String, default: '' }
  },
  completedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    username: { type: String, default: '' },
    name: { type: String, default: '' },
    completedAt: Date
  },
  previousStatus: { type: String, default: null },
  dueDate: Date,
  relatedEntity: {
    type: { type: String, enum: ['Lead', 'Listing', 'Booking', 'ChatMessage'] },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  tags: [String],
  history: [historyEntrySchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.index({ status: 1, priority: -1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ isActive: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
