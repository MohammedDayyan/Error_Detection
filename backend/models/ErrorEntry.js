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
    required: true
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
