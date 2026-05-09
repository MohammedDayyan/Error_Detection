const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'developer', 'viewer'],
      default: 'developer'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  projects: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    apiKey: {
      type: String,
      required: true,
      unique: true
    },
    environment: {
      type: String,
      enum: ['production', 'staging', 'development'],
      default: 'development'
    },
    settings: {
      errorRetention: {
        type: Number,
        default: 30 // days
      },
      alertThreshold: {
        type: Number,
        default: 10 // errors per minute
      },
      severityThreshold: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'high'
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowInvites: {
      type: Boolean,
      default: true
    },
    defaultRole: {
      type: String,
      enum: ['admin', 'developer', 'viewer'],
      default: 'developer'
    }
  }
}, {
  timestamps: true
});

// Indexes
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ 'projects.apiKey': 1 });

// Methods
teamSchema.methods.addMember = function(userId, role = 'developer') {
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  if (existingMember) {
    existingMember.role = role;
  } else {
    this.members.push({ user: userId, role });
  }
  return this.save();
};

teamSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

teamSchema.methods.updateMemberRole = function(userId, role) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = role;
    return this.save();
  }
  throw new Error('Member not found');
};

teamSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

teamSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

teamSchema.methods.addProject = function(projectData) {
  const apiKey = this.generateApiKey();
  this.projects.push({
    ...projectData,
    apiKey
  });
  return this.save();
};

teamSchema.methods.generateApiKey = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let apiKey = '';
  for (let i = 0; i < 32; i++) {
    apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return apiKey;
};

module.exports = mongoose.model('Team', teamSchema);
