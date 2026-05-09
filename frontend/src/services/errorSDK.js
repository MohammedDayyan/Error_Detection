class ErrorDetectionSDK {
  constructor(config = {}) {
    this.apiEndpoint = config.apiEndpoint || 'http://localhost:5000/api';
    this.token = config.token;
    this.projectId = config.projectId;
    this.environment = config.environment || 'production';
    this.userId = config.userId;
    this.enabled = config.enabled !== false;
    
    // Error grouping and deduplication
    this.errorCache = new Map();
    this.groupingThreshold = config.groupingThreshold || 5000; // 5 seconds
    
    // Performance monitoring
    this.performanceMetrics = new Map();
    
    if (this.enabled) {
      this.init();
    }
  }

  init() {
    this.setupGlobalErrorHandlers();
    this.setupPerformanceMonitoring();
    this.setupUnhandledRejectionHandler();
    console.log('Error Detection SDK initialized');
  }

  setupGlobalErrorHandlers() {
    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'javascript',
        message: event.message,
        filename: event.filename || window.location.pathname,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Capture resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureError({
          type: 'resource',
          message: `Failed to load ${event.target.tagName}`,
          filename: event.target.src || event.target.href,
          resourceType: event.target.tagName.toLowerCase(),
          timestamp: new Date().toISOString()
        });
      }
    }, true);
  }

  setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupPerformanceMonitoring() {
    // Monitor page load performance
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          if (perfData) {
            this.capturePerformanceMetrics({
              loadTime: perfData.loadEventEnd - perfData.loadEventStart,
              domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
              firstPaint: this.getFirstPaint(),
              timestamp: new Date().toISOString()
            });
          }
        }, 0);
      });
    }
  }

  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  async captureError(errorData) {
    if (!this.enabled || !this.token) return;

    // Check for duplicate errors within threshold
    const errorKey = this.generateErrorKey(errorData);
    const now = Date.now();
    const lastError = this.errorCache.get(errorKey);
    
    if (lastError && (now - lastError) < this.groupingThreshold) {
      return; // Skip duplicate error
    }
    
    this.errorCache.set(errorKey, now);

    try {
      const response = await fetch(`${this.apiEndpoint}/errors/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          ...errorData,
          projectId: this.projectId,
          environment: this.environment,
          userId: this.userId,
          userAgent: navigator.userAgent,
          url: window.location.href,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to send error to server:', response.statusText);
      }
    } catch (err) {
      console.error('Error sending error data:', err);
    }
  }

  async capturePerformanceMetrics(metrics) {
    if (!this.enabled || !this.token) return;

    try {
      const response = await fetch(`${this.apiEndpoint}/performance/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          ...metrics,
          projectId: this.projectId,
          environment: this.environment,
          userId: this.userId
        })
      });

      if (!response.ok) {
        console.error('Failed to send performance metrics:', response.statusText);
      }
    } catch (err) {
      console.error('Error sending performance data:', err);
    }
  }

  generateErrorKey(errorData) {
    // Create a key for grouping similar errors
    const keyParts = [
      errorData.type,
      errorData.message?.substring(0, 100),
      errorData.filename?.substring(0, 50)
    ].filter(Boolean);
    
    return keyParts.join('|').toLowerCase();
  }

  // Manual error capture for custom events
  captureCustomError(message, context = {}) {
    this.captureError({
      type: 'custom',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // User feedback capture
  captureUserFeedback(feedback) {
    this.captureError({
      type: 'feedback',
      message: feedback.message,
      rating: feedback.rating,
      timestamp: new Date().toISOString()
    });
  }

  // Update configuration
  updateConfig(newConfig) {
    Object.assign(this, newConfig);
    if (newConfig.enabled !== false && !this.enabled) {
      this.init();
    }
  }

  // Disable SDK
  disable() {
    this.enabled = false;
    console.log('Error Detection SDK disabled');
  }

  // Enable SDK
  enable() {
    this.enabled = true;
    if (!this.initialized) {
      this.init();
    }
    console.log('Error Detection SDK enabled');
  }
}

// Auto-initialize if config is available
let sdkInstance = null;

window.ErrorDetectionSDK = ErrorDetectionSDK;

window.initErrorDetection = (config) => {
  if (sdkInstance) {
    sdkInstance.updateConfig(config);
  } else {
    sdkInstance = new ErrorDetectionSDK(config);
  }
  return sdkInstance;
};

// Global access for manual error reporting
window.reportError = (message, context) => {
  if (sdkInstance) {
    sdkInstance.captureCustomError(message, context);
  }
};

export default ErrorDetectionSDK;
