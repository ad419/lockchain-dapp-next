// Create a shared cache utility
// filepath: d:\codes\lockchain-dapp-next\app\lib\cache.js

// Simple cache implementation
export class Cache {
  constructor(ttl = 60000, maxSize = 100) {
    this.cache = new Map();
    this.ttl = ttl; // Time to live in ms
    this.maxSize = maxSize; // Maximum number of items
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key, value, customTtl) {
    // If cache is full, remove oldest item
    if (this.cache.size >= this.maxSize) {
      const oldestKey = [...this.cache.keys()][0];
      this.cache.delete(oldestKey);
    }

    const ttl = customTtl || this.ttl;

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Create different caches for different types of data
export const globalCache = new Cache(5 * 60 * 1000); // 5 minutes
export const authCache = new Cache(15 * 60 * 1000); // 15 minutes
export const holderCache = new Cache(5 * 60 * 1000); // 5 minutes
export const messageCache = new Cache(2 * 60 * 1000); // 2 minutes
