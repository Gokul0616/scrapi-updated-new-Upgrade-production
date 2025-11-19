/**
 * CDN Configuration
 * CloudFlare, AWS CloudFront, and other CDN providers
 */

class CDNService {
  constructor() {
    this.provider = process.env.CDN_PROVIDER || 'cloudflare';
    this.enabled = process.env.ENABLE_CDN === 'true';
  }

  /**
   * Get CloudFlare configuration
   */
  getCloudFlareConfig() {
    return {
      zones: [
        {
          name: process.env.DOMAIN || 'your-domain.com',
          settings: {
            // Performance
            minify: {
              css: true,
              html: true,
              js: true,
            },
            brotli: true,
            http2: true,
            http3: true,
            // Security
            security_level: 'medium',
            ssl: 'full',
            always_use_https: true,
            automatic_https_rewrites: true,
            // Caching
            cache_level: 'aggressive',
            browser_cache_ttl: 31536000, // 1 year for static assets
            // Speed
            rocket_loader: false, // Can break some apps
            mirage: true,
            polish: 'lossless',
          },
        },
      ],
      pageRules: [
        {
          target: `${process.env.DOMAIN}/api/*`,
          actions: {
            cache_level: 'bypass',
            disable_security: false,
          },
          priority: 1,
        },
        {
          target: `${process.env.DOMAIN}/static/*`,
          actions: {
            cache_level: 'cache_everything',
            edge_cache_ttl: 2592000, // 30 days
            browser_cache_ttl: 31536000, // 1 year
          },
          priority: 2,
        },
      ],
      workers: {
        routes: [
          {
            pattern: `${process.env.DOMAIN}/*`,
            script: 'scrapi-worker',
          },
        ],
      },
    };
  }

  /**
   * Get AWS CloudFront configuration
   */
  getCloudFrontConfig() {
    return {
      distributionConfig: {
        CallerReference: `scrapi-${Date.now()}`,
        Comment: 'Scrapi CDN Distribution',
        Enabled: true,
        Origins: [
          {
            Id: 'scrapi-origin',
            DomainName: process.env.ORIGIN_DOMAIN || 'origin.your-domain.com',
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginProtocolPolicy: 'https-only',
            },
          },
        ],
        DefaultCacheBehavior: {
          TargetOriginId: 'scrapi-origin',
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
          CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
          Compress: true,
          MinTTL: 0,
          DefaultTTL: 86400,
          MaxTTL: 31536000,
        },
        CacheBehaviors: [
          {
            PathPattern: '/api/*',
            TargetOriginId: 'scrapi-origin',
            ViewerProtocolPolicy: 'https-only',
            MinTTL: 0,
            DefaultTTL: 0,
            MaxTTL: 0,
          },
          {
            PathPattern: '/static/*',
            TargetOriginId: 'scrapi-origin',
            ViewerProtocolPolicy: 'https-only',
            MinTTL: 2592000,
            DefaultTTL: 2592000,
            MaxTTL: 31536000,
            Compress: true,
          },
        ],
        PriceClass: 'PriceClass_All',
        ViewerCertificate: {
          ACMCertificateArn: process.env.ACM_CERTIFICATE_ARN,
          SSLSupportMethod: 'sni-only',
          MinimumProtocolVersion: 'TLSv1.2_2021',
        },
      },
    };
  }

  /**
   * Get cache control headers
   */
  getCacheHeaders(resourceType) {
    const headers = {
      static: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding',
      },
      api: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      html: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
      dynamic: {
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'Vary': 'Accept-Encoding',
      },
    };

    return headers[resourceType] || headers.dynamic;
  }

  /**
   * Purge CDN cache
   */
  async purgeCache(urls = []) {
    if (!this.enabled) {
      return { success: false, message: 'CDN not enabled' };
    }

    if (this.provider === 'cloudflare') {
      // CloudFlare API call would go here
      return {
        success: true,
        message: 'Cache purge initiated',
        urls: urls.length > 0 ? urls : ['all'],
      };
    }

    return { success: false, message: 'Provider not supported' };
  }

  /**
   * Get CDN statistics
   */
  async getStats() {
    return {
      provider: this.provider,
      enabled: this.enabled,
      bandwidth: 'N/A (Connect to CDN provider)',
      requests: 'N/A',
      cacheHitRate: 'N/A',
    };
  }
}

module.exports = new CDNService();
