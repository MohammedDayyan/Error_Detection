const mongoose = require('mongoose');

const ErrorEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  logFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LogFile',
    required: false
  },
  filename: {
    type: String,
    required: true
  },
  errorMessage: {
    type: String,
    required: true
  },
  lineNumber: {
    type: Number
  },
  type: {
    type: String,
    default: 'javascript'
  },
  groupId: {
    type: String,
    index: true
  },
  stack: {
    type: String
  },
  userAgent: {
    type: String
  },
  url: {
    type: String
  },
  environment: {
    type: String,
    default: 'development'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  source: {
    type: String,
    enum: ['browser', 'mobile', 'server', 'log_upload', 'manual'],
    default: 'manual'
  },
  environment: {
    type: String,
    default: 'unknown'
  },
  service: {
    type: String,
    default: 'unknown'
  },
  release: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  aiFix: {
    type: String,
    default: null
  },
  aiExplanation: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('ErrorEntry', ErrorEntrySchema);
