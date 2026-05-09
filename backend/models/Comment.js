const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  errorEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ErrorEntry',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  attachments: [{
    type: String, // URL to attachment
    filename: String,
    mimeType: String
  }],
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  editedAt: Date,
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date
}, {
  timestamps: true
});

// Indexes
commentSchema.index({ errorEntry: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ 'mentions.user': 1 });

// Methods
commentSchema.methods.addMention = function(userId, username) {
  const existingMention = this.mentions.find(m => m.user.toString() === userId.toString());
  if (!existingMention) {
    this.mentions.push({ user: userId, username });
  }
  return this.save();
};

commentSchema.methods.edit = function(content) {
  this.content = content;
  this.editedAt = new Date();
  return this.save();
};

commentSchema.methods.resolve = function(resolvedBy) {
  this.resolved = true;
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  return this.save();
};

// Virtual for replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parent'
});

commentSchema.set('toObject', { virtuals: true });
commentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Comment', commentSchema);
