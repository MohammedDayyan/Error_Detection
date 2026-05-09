const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  errorEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ErrorEntry',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'resolved', 'rejected'],
    default: 'assigned'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  dueDate: Date,
  estimatedHours: Number,
  actualHours: Number,
  notes: {
    type: String,
    maxlength: 1000
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Indexes
assignmentSchema.index({ errorEntry: 1 });
assignmentSchema.index({ assignee: 1, status: 1 });
assignmentSchema.index({ assignor: 1 });
assignmentSchema.index({ status: 1, priority: 1 });

// Methods
assignmentSchema.methods.updateStatus = function(status, notes) {
  this.status = status;
  if (notes) this.notes = notes;
  
  if (status === 'resolved') {
    this.resolvedAt = new Date();
  } else if (status === 'rejected') {
    this.rejectedAt = new Date();
    this.rejectionReason = notes;
  }
  
  return this.save();
};

assignmentSchema.methods.logTime = function(hours) {
  this.actualHours = (this.actualHours || 0) + hours;
  return this.save();
};

module.exports = mongoose.model('Assignment', assignmentSchema);
