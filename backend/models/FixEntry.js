const mongoose = require('mongoose');

const FixEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  errorEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ErrorEntry',
    required: true
  },
  logFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LogFile',
    default: null
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
  explanation: {
    type: String,
    required: true
  },
  fix: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('FixEntry', FixEntrySchema);
