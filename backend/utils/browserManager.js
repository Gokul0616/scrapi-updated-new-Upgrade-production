const puppeteer = require('puppeteer');
const proxyManager = require('./proxyManager');

// Browser Manager for Puppeteer instances
class BrowserManager {
  constructor() {
    this.browser = null;
  }

  async getBrowser(useProxy = false) {
    if (!this.browser || !this.browser.isConnected()) {
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      };

      // Try to find Chrome/Chromium executable
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // First check Puppeteer cache (most reliable)
      const puppeteerCachePath = path.join(os.homedir(), '.cache', 'puppeteer');
      const possiblePuppeteerPaths = [];
      
      if (fs.existsSync(puppeteerCachePath)) {
        // Find chrome executable in Puppeteer cache
        try {
          const chromeDir = path.join(puppeteerCachePath, 'chrome');
          if (fs.existsSync(chromeDir)) {
            const versions = fs.readdirSync(chromeDir);
            for (const version of versions) {
              const chromePath = path.join(chromeDir, version, 'chrome-linux64', 'chrome');
              if (fs.existsSync(chromePath)) {
                possiblePuppeteerPaths.push(chromePath);
              }
            }
          }
        } catch (err) {
          console.warn('Could not scan Puppeteer cache:', err.message);
        }
      }
      
      // System Chrome paths as fallback
      const systemPaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      const allPaths = [...possiblePuppeteerPaths, ...systemPaths];
      
      // Try each path
      for (const chromePath of allPaths) {
        if (fs.existsSync(chromePath)) {
          launchOptions.executablePath = chromePath;
          console.log(`🔧 Using Chrome: ${chromePath}`);
          break;
        }
      }
      
      // If no Chrome found, let Puppeteer use its default (will download if needed)
      if (!launchOptions.executablePath) {
        console.log('⚠️  No Chrome found, using Puppeteer default');
        // Don't throw error, let Puppeteer handle it
      }

      // Add proxy if requested
      if (useProxy) {
        const proxy = proxyManager.getNextProxy();
        if (proxy) {
          launchOptions.args.push(`--proxy-server=${proxy}`);
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
    }
    return this.browser;
  }

  async getPage(useProxy = false) {
    const browser = await this.getBrowser(useProxy);
    const page = await browser.newPage();

    // Set random user agent
    await page.setUserAgent(proxyManager.getRandomUserAgent());

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Stealth techniques to avoid detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    return page;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new BrowserManager();
