const mongoose = require('mongoose');

const runSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true },
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true // Runs are ALWAYS user-specific
  },
  status: { type: String, enum: ['queued', 'running', 'succeeded', 'failed', 'aborted'], default: 'queued' },
  input: { type: Object },
  output: { type: Array, default: [] },
  resultCount: { type: Number, default: 0 },
  usage: { type: Number, default: 0 },
  duration: { type: String },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  error: { type: String },
  scheduled: { type: Boolean, default: false },
  scheduledFor: { type: Date },
  recurringSchedule: { type: String } // cron format for recurring schedules
});

// Index for efficient user-specific queries
runSchema.index({ userId: 1, startedAt: -1 });
runSchema.index({ runId: 1 });

module.exports = mongoose.model('Run', runSchema);