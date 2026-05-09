const crypto = require('crypto');

class ErrorGroupingService {
  constructor() {
    this.groupCache = new Map();
    this.similarityThreshold = 0.8; // 80% similarity for grouping
  }

  // Generate a hash for error grouping based on key characteristics
  generateErrorHash(errorData) {
    const keyFields = [
      errorData.errorMessage?.substring(0, 100) || '',
      errorData.filename?.substring(0, 50) || '',
      errorData.type || '',
      this.extractErrorPattern(errorData.errorMessage) || ''
    ].filter(Boolean);

    const normalizedFields = keyFields.map(field => 
      field.toLowerCase().replace(/\s+/g, ' ').trim()
    );

    const hashInput = normalizedFields.join('|');
    return crypto.createHash('md5').update(hashInput).digest('hex');
  }

  // Extract common error patterns (e.g., "Cannot read property 'x' of undefined")
  extractErrorPattern(errorMessage) {
    if (!errorMessage) return '';

    const patterns = [
      /Cannot read property ['"]([^'"]+)['"] of (undefined|null)/g,
      /TypeError: Cannot read property ['"]([^'"]+)['"] of/g,
      /ReferenceError: ([^ ]+) is not defined/g,
      /SyntaxError: ([^ ]+)/g,
      /NetworkError: ([^ ]+)/g,
      /Failed to load resource: the server responded with status (\d+)/g
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        return match[0].replace(/['"][^'"]*['"]/g, "'X'"); // Normalize property names
      }
    }

    return '';
  }

  // Calculate similarity between two error messages
  calculateSimilarity(message1, message2) {
    if (!message1 || !message2) return 0;

    const tokens1 = message1.toLowerCase().split(/\s+/);
    const tokens2 = message2.toLowerCase().split(/\s+/);

    const intersection = tokens1.filter(token => tokens2.includes(token));
    const union = [...new Set([...tokens1, ...tokens2])];

    return intersection.length / union.length;
  }

  // Group similar errors
  groupError(errorData, existingErrors = []) {
    const errorHash = this.generateErrorHash(errorData);
    
    // Check cache first
    if (this.groupCache.has(errorHash)) {
      return this.groupCache.get(errorHash);
    }

    // Find similar errors in existing data
    for (const existingError of existingErrors) {
      const similarity = this.calculateSimilarity(
        errorData.errorMessage,
        existingError.errorMessage
      );

      if (similarity >= this.similarityThreshold) {
        const groupId = existingError.groupId || this.generateGroupId(existingError);
        
        // Cache the result
        this.groupCache.set(errorHash, {
          groupId,
          isDuplicate: true,
          similarity,
          originalError: existingError
        });

        return this.groupCache.get(errorHash);
      }
    }

    // Create new group
    const newGroupId = this.generateGroupId(errorData);
    const groupInfo = {
      groupId: newGroupId,
      isDuplicate: false,
      similarity: 1.0,
      originalError: errorData
    };

    this.groupCache.set(errorHash, groupInfo);
    return groupInfo;
  }

  // Generate a unique group ID
  generateGroupId(errorData) {
    const timestamp = new Date().toISOString();
    const hashInput = `${errorData.filename}-${errorData.type}-${timestamp}`;
    return `group_${crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 8)}`;
  }

  // Get error statistics for a group
  getGroupStatistics(groupId, errors) {
    const groupErrors = errors.filter(error => error.groupId === groupId);
    
    if (groupErrors.length === 0) {
      return null;
    }

    const firstOccurrence = groupErrors.reduce((earliest, error) => 
      new Date(error.createdAt) < new Date(earliest.createdAt) ? error : earliest
    );

    const lastOccurrence = groupErrors.reduce((latest, error) => 
      new Date(error.createdAt) > new Date(latest.createdAt) ? error : latest
    );

    return {
      groupId,
      count: groupErrors.length,
      firstOccurrence: firstOccurrence.createdAt,
      lastOccurrence: lastOccurrence.createdAt,
      frequency: this.calculateFrequency(groupErrors),
      severity: this.calculateSeverity(groupErrors),
      affectedFiles: [...new Set(groupErrors.map(error => error.filename))],
      errorPattern: this.extractErrorPattern(groupErrors[0].errorMessage)
    };
  }

  // Calculate error frequency (errors per hour)
  calculateFrequency(errors) {
    if (errors.length < 2) return 0;

    const times = errors.map(error => new Date(error.createdAt).getTime());
    const timeSpan = Math.max(...times) - Math.min(...times);
    const hours = timeSpan / (1000 * 60 * 60);

    return hours > 0 ? errors.length / hours : errors.length;
  }

  // Calculate overall severity for a group
  calculateSeverity(errors) {
    const severityScores = {
      'critical': 4,
      'error': 3,
      'warning': 2,
      'info': 1
    };

    // Simple heuristic based on error patterns
    let maxSeverity = 1;
    
    for (const error of errors) {
      const message = error.errorMessage.toLowerCase();
      
      if (message.includes('critical') || message.includes('fatal')) {
        maxSeverity = Math.max(maxSeverity, severityScores.critical);
      } else if (message.includes('error') || message.includes('exception')) {
        maxSeverity = Math.max(maxSeverity, severityScores.error);
      } else if (message.includes('warning') || message.includes('deprecated')) {
        maxSeverity = Math.max(maxSeverity, severityScores.warning);
      } else {
        maxSeverity = Math.max(maxSeverity, severityScores.info);
      }
    }

    return Object.keys(severityScores).find(key => severityScores[key] === maxSeverity) || 'info';
  }

  // Clear cache (useful for memory management)
  clearCache() {
    this.groupCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.groupCache.size,
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = ErrorGroupingService;
