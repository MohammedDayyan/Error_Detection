const mongoose = require('mongoose');
const ErrorEntry = require('../models/ErrorEntry');

class SeverityScoringService {
  constructor() {
    this.severityWeights = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };
    
    this.errorTypeWeights = {
      'TypeError': 80,
      'ReferenceError': 90,
      'SyntaxError': 85,
      'RangeError': 70,
      'NetworkError': 75,
      'TimeoutError': 85,
      'SecurityError': 95,
      'DatabaseError': 80,
      'FileSystemError': 70,
      'ValidationError': 60,
      'AuthenticationError': 85,
      'AuthorizationError': 80,
      'RateLimitError': 65,
      'ConfigurationError': 75,
      'DependencyError': 70
    };
    
    this.environmentMultipliers = {
      'production': 1.5,
      'staging': 1.2,
      'development': 0.8,
      'testing': 0.6
    };
  }

  async calculateSeverity(errorData, context = {}) {
    let score = 0;
    let factors = [];

    // Base score from error type
    const errorTypeScore = this.getErrorTypeScore(errorData.type, errorData.errorMessage);
    score += errorTypeScore;
    factors.push({ type: 'error_type', score: errorTypeScore, description: `Error type: ${errorData.type}` });

    // Frequency factor
    const frequencyScore = await this.calculateFrequencyScore(errorData);
    score += frequencyScore;
    factors.push({ type: 'frequency', score: frequencyScore, description: 'Error frequency analysis' });

    // Environment multiplier
    const envMultiplier = this.environmentMultipliers[context.environment] || 1;
    const envScore = score * (envMultiplier - 1);
    score += envScore;
    factors.push({ type: 'environment', score: envScore, description: `Environment: ${context.environment}` });

    // User impact factor
    const userImpactScore = this.calculateUserImpactScore(errorData, context);
    score += userImpactScore;
    factors.push({ type: 'user_impact', score: userImpactScore, description: 'User impact analysis' });

    // Business impact factor
    const businessImpactScore = this.calculateBusinessImpactScore(errorData, context);
    score += businessImpactScore;
    factors.push({ type: 'business_impact', score: businessImpactScore, description: 'Business impact analysis' });

    // Time-based factor (recent errors are more severe)
    const timeScore = this.calculateTimeScore(errorData.createdAt);
    score += timeScore;
    factors.push({ type: 'recency', score: timeScore, description: 'Error recency' });

    // Stack trace depth factor
    const stackDepthScore = this.calculateStackDepthScore(errorData.stack);
    score += stackDepthScore;
    factors.push({ type: 'stack_depth', score: stackDepthScore, description: 'Stack trace complexity' });

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, Math.max(0, score));

    return {
      score: Math.round(normalizedScore),
      severity: this.getSeverityLevel(normalizedScore),
      factors,
      confidence: this.calculateConfidence(factors),
      recommendations: this.getRecommendations(normalizedScore, factors)
    };
  }

  getErrorTypeScore(type, message) {
    // Check for specific error patterns
    if (message.includes('Cannot read property') || message.includes('undefined')) {
      return 85;
    }
    if (message.includes('Network') || message.includes('fetch')) {
      return 75;
    }
    if (message.includes('timeout') || message.includes('Timeout')) {
      return 80;
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 85;
    }
    
    return this.errorTypeWeights[type] || 50;
  }

  async calculateFrequencyScore(errorData) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentCount = await ErrorEntry.countDocuments({
        groupId: errorData.groupId,
        createdAt: { $gte: oneHourAgo }
      });

      const dailyCount = await ErrorEntry.countDocuments({
        groupId: errorData.groupId,
        createdAt: { $gte: oneDayAgo }
      });

      // High frequency increases severity
      if (recentCount > 10) return 30;
      if (recentCount > 5) return 20;
      if (recentCount > 2) return 10;
      if (dailyCount > 50) return 25;
      if (dailyCount > 20) return 15;
      
      return 0;
    } catch (error) {
      console.error('Error calculating frequency score:', error);
      return 0;
    }
  }

  calculateUserImpactScore(errorData, context) {
    let score = 0;
    
    // Check if error affects critical user flows
    const criticalPaths = ['/login', '/checkout', '/payment', '/register', '/dashboard'];
    const url = errorData.url || '';
    
    if (criticalPaths.some(path => url.includes(path))) {
      score += 25;
    }
    
    // User agent analysis (mobile errors might be more severe)
    if (errorData.userAgent && errorData.userAgent.includes('Mobile')) {
      score += 10;
    }
    
    // Check if error affects authentication
    if (errorData.errorMessage.includes('auth') || errorData.errorMessage.includes('token')) {
      score += 20;
    }
    
    return score;
  }

  calculateBusinessImpactScore(errorData, context) {
    let score = 0;
    
    // Revenue-impacting errors
    const revenueKeywords = ['payment', 'checkout', 'billing', 'subscription', 'purchase'];
    if (revenueKeywords.some(keyword => 
        errorData.errorMessage.toLowerCase().includes(keyword) ||
        (errorData.filename && errorData.filename.toLowerCase().includes(keyword))
    )) {
      score += 30;
    }
    
    // Data integrity errors
    const dataKeywords = ['database', 'corrupt', 'lost', 'missing', 'integrity'];
    if (dataKeywords.some(keyword => errorData.errorMessage.toLowerCase().includes(keyword))) {
      score += 25;
    }
    
    // Security-related errors
    const securityKeywords = ['security', 'vulnerability', 'breach', 'injection', 'xss'];
    if (securityKeywords.some(keyword => errorData.errorMessage.toLowerCase().includes(keyword))) {
      score += 35;
    }
    
    return score;
  }

  calculateTimeScore(createdAt) {
    const now = new Date();
    const errorAge = now - new Date(createdAt);
    const hoursAgo = errorAge / (1000 * 60 * 60);
    
    // Recent errors get higher scores
    if (hoursAgo < 1) return 15;
    if (hoursAgo < 6) return 10;
    if (hoursAgo < 24) return 5;
    
    return 0;
  }

  calculateStackDepthScore(stack) {
    if (!stack) return 0;
    
    const lines = stack.split('\n').length;
    
    // Deeper stack traces might indicate more complex issues
    if (lines > 20) return 15;
    if (lines > 10) return 10;
    if (lines > 5) return 5;
    
    return 0;
  }

  getSeverityLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  calculateConfidence(factors) {
    const significantFactors = factors.filter(f => f.score > 10);
    const confidence = Math.min(100, significantFactors.length * 20);
    return confidence;
  }

  getRecommendations(score, factors) {
    const recommendations = [];
    
    if (score >= 80) {
      recommendations.push('Immediate attention required - critical error detected');
      recommendations.push('Consider rolling back recent deployments');
      recommendations.push('Notify on-call engineers immediately');
    } else if (score >= 60) {
      recommendations.push('High priority - address within 4 hours');
      recommendations.push('Monitor for escalation patterns');
    } else if (score >= 40) {
      recommendations.push('Medium priority - address in next sprint');
      recommendations.push('Consider adding to backlog');
    } else {
      recommendations.push('Low priority - monitor for patterns');
      recommendations.push('Consider bulk resolution if similar errors exist');
    }
    
    // Specific recommendations based on factors
    const frequencyFactor = factors.find(f => f.type === 'frequency');
    if (frequencyFactor && frequencyFactor.score > 20) {
      recommendations.push('High frequency detected - investigate root cause immediately');
    }
    
    const userImpactFactor = factors.find(f => f.type === 'user_impact');
    if (userImpactFactor && userImpactFactor.score > 20) {
      recommendations.push('Critical user flow affected - prioritize user experience');
    }
    
    return recommendations;
  }

  async updateErrorSeverity(errorId) {
    try {
      const error = await ErrorEntry.findById(errorId).populate('userId');
      if (!error) throw new Error('Error not found');

      const severityAnalysis = await this.calculateSeverity(error.toObject(), {
        environment: error.environment || 'development'
      });

      error.severity = severityAnalysis.severity;
      error.severityScore = severityAnalysis.score;
      error.severityFactors = severityAnalysis.factors;
      error.severityConfidence = severityAnalysis.confidence;

      await error.save();
      return severityAnalysis;
    } catch (error) {
      console.error('Error updating severity:', error);
      throw error;
    }
  }

  async batchUpdateSeverity(limit = 100) {
    try {
      const errors = await ErrorEntry.find({
        $or: [
          { severity: { $exists: false } },
          { severityScore: { $exists: false } }
        ]
      }).limit(limit);

      const results = [];
      for (const error of errors) {
        try {
          const result = await this.updateErrorSeverity(error._id);
          results.push({ errorId: error._id, success: true, result });
        } catch (err) {
          results.push({ errorId: error._id, success: false, error: err.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in batch update:', error);
      throw error;
    }
  }
}

module.exports = new SeverityScoringService();
