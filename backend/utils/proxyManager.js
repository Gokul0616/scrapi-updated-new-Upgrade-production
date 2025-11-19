// Proxy Manager for rotating proxies to avoid blocking
class ProxyManager {
  constructor() {
    // Free proxy sources - these will be rotated
    this.proxies = [
      // Note: In production, you would fetch these from a proxy provider API
      // For now, we'll use a list that can be updated
    ];
    this.currentIndex = 0;
    this.failedProxies = new Set();
  }

  // Get next available proxy
  getNextProxy() {
    if (this.proxies.length === 0) {
      return null; // No proxy, will use direct connection
    }

    let attempts = 0;
    const maxAttempts = this.proxies.length;

    while (attempts < maxAttempts) {
      const proxy = this.proxies[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

      if (!this.failedProxies.has(proxy)) {
        return proxy;
      }

      attempts++;
    }

    // All proxies failed, clear failed list and try again
    this.failedProxies.clear();
    return this.proxies[0] || null;
  }

  // Mark proxy as failed
  markFailed(proxy) {
    this.failedProxies.add(proxy);
  }

  // Add new proxy
  addProxy(proxy) {
    if (!this.proxies.includes(proxy)) {
      this.proxies.push(proxy);
    }
  }

  // Get random user agent
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

module.exports = new ProxyManager();
