class SmartCache {
  constructor() {
    this.cache = new Map();
    this.TTL = {
      PRICE: 30 * 1000,        // 30 seconds for prices
      HISTORICAL: 5 * 60 * 1000, // 5 minutes for historical  
      MARKET: 2 * 60 * 1000,     // 2 minutes for market data
      QUOTE: 10 * 1000           // 10 seconds for quotes
    };
  }

  set(key, data, type = 'PRICE') {
    const ttl = this.TTL[type];
    const expiry = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expiry,
      created: Date.now()
    });
    
    // Cleanup old entries (prevent memory leaks)
    this.cleanup();
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  cleanup() {
    if (this.cache.size > 100) { // Max 100 entries
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiry) {
          this.cache.delete(key);
        }
      }
    }
  }

  stats() {
    return {
      entries: this.cache.size,
      hitRatio: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }
}

const cache = new SmartCache();
