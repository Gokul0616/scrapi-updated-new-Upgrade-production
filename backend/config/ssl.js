/**
 * SSL/TLS Configuration
 * Phase 3: Infrastructure - HTTPS Setup
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class SSLConfig {
  constructor() {
    this.sslEnabled = false;
    this.httpsOptions = null;
  }

  /**
   * Initialize SSL configuration
   */
  init() {
    const certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt';
    const keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key';
    const caPath = process.env.SSL_CA_PATH; // Optional CA bundle

    // Check if SSL files exist
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      logger.info('SSL/TLS: Certificate files not found, running in HTTP mode');
      logger.info('SSL/TLS: For production, configure SSL_CERT_PATH and SSL_KEY_PATH');
      return null;
    }

    try {
      const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };

      // Add CA bundle if provided
      if (caPath && fs.existsSync(caPath)) {
        options.ca = fs.readFileSync(caPath);
        logger.info('SSL/TLS: CA bundle loaded');
      }

      this.sslEnabled = true;
      this.httpsOptions = options;
      
      logger.info('SSL/TLS: Certificates loaded successfully');
      logger.info(`SSL/TLS: Certificate path: ${certPath}`);
      
      return options;
    } catch (error) {
      logger.error('SSL/TLS: Failed to load certificates:', error.message);
      return null;
    }
  }

  /**
   * Get HTTPS options
   */
  getOptions() {
    return this.httpsOptions;
  }

  /**
   * Check if SSL is enabled
   */
  isEnabled() {
    return this.sslEnabled;
  }

  /**
   * Generate self-signed certificate instructions
   */
  static getSelfSignedInstructions() {
    return `
To generate a self-signed certificate for development:

1. Generate private key and certificate:
   openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt \
     -days 365 -nodes -subj "/CN=localhost"

2. Move to SSL directory:
   sudo mkdir -p /etc/ssl/private
   sudo mv server.key /etc/ssl/private/
   sudo mv server.crt /etc/ssl/certs/

3. Set permissions:
   sudo chmod 600 /etc/ssl/private/server.key
   sudo chmod 644 /etc/ssl/certs/server.crt

4. Set environment variables:
   export SSL_CERT_PATH=/etc/ssl/certs/server.crt
   export SSL_KEY_PATH=/etc/ssl/private/server.key

For production, use Let's Encrypt:
   sudo certbot certonly --standalone -d your-domain.com
   export SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
   export SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
`;
  }
}

module.exports = new SSLConfig();
