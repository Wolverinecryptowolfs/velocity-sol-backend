class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.limits = {
      COINGECKO: { calls: 10, window: 60 * 1000 }, // 10/minute
      JUPITER: { calls: 100, window: 60 * 1000 }   // 100/minute (no official limit)
    };
  }

  canMakeRequest(service) {
    const now = Date.now();
    const key = service;
    const limit = this.limits[service];
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < limit.window);
    this.requests.set(key, validRequests);
    
    // Check if we can make new request
    if (validRequests.length >= limit.calls) {
      return false;
    }
    
    // Record new request
    validRequests.push(now);
    return true;
  }

  getWaitTime(service) {
    const requests = this.requests.get(service) || [];
    if (requests.length === 0) return 0;
    
    const oldest = Math.min(...requests);
    const waitTime = this.limits[service].window - (Date.now() - oldest);
    return Math.max(0, waitTime);
  }
}

const rateLimiter = new RateLimiter();
