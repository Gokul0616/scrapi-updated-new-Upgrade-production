const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'RUN_COMPLETED',
      'RUN_FAILED', 
      'RUN_STARTED',
      'LOW_BALANCE',
      'USAGE_WARNING',
      'QUOTA_EXCEEDED',
      'BILLING_ISSUE',
      'PAYMENT_FAILED',
      'SYSTEM_ANNOUNCEMENT',
      'NEW_FEATURE',
      'MAINTENANCE'
    ],
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // Navigation data for click-to-navigate
  actionUrl: {
    type: String,
    default: null
  },
  // Additional metadata (runId, actorId, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  // Priority for ordering/styling
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Expiration for auto-cleanup (90 days default)
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Set expiration to 90 days from creation
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 90);
    this.expiresAt = expirationDate;
  }
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;