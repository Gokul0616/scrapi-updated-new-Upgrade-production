/**
 * Actor Registry - Define all public actors with field schemas
 * inputFields: Defines the input form fields for the frontend (DYNAMIC FIELDS)
 * outputFields: Defines the expected output schema (for documentation)
 * 
 * NOTE: Scraping is handled by Python service (port 8002) via Celery queue.
 * Node.js backend is API-only and does NOT execute scrapers directly.
 */
const actorRegistry = [
  {
    actorId: 'google-maps',
    name: 'Google Maps Scraper',
    title: 'Google Maps Ultimate Extractor',
    description: '🚀 ULTIMATE Google Maps scraper with 50+ fields! Extracts: business info, contact details, social media (10+ platforms), multiple emails & phones, opening hours, popular times, photos, reviews, and more. 🌐 ENHANCED WEBSITE ENRICHMENT: Automatically visits business websites to extract additional contact details from Contact/About pages. Parallel processing for speed. Professional-grade data extraction.',
    author: 'compass',
    slug: 'compass/ultimate-google-maps',
    category: 'SEO tools',
    icon: '🗺️',
    stats: { runs: 0, rating: 4.9, reviews: 500 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,  // Handled by Python service
    inputFields: [
      {
        key: 'query',
        label: 'Search Query',
        type: 'text',
        required: true,
        placeholder: 'e.g., pizza restaurants, coffee shops, dentists',
        description: 'What to search for on Google Maps'
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        required: false,
        placeholder: 'e.g., New York, USA or Brooklyn, NY',
        default: 'United States',
        description: 'Geographic location to search in'
      },
      {
        key: 'maxResults',
        label: 'Maximum Results',
        type: 'number',
        required: false,
        placeholder: '20',
        default: 20,
        description: 'Total number of places to scrape (1-100). Each result includes full enrichment.'
      },
      {
        key: 'ultra_fast',
        label: 'Ultra Fast Mode',
        type: 'checkbox',
        required: false,
        default: false,
        description: '🚀 Enable 3-5x faster scraping by blocking images, CSS, and fonts. Recommended for large datasets.'
      },
      {
        key: 'extract_reviews',
        label: 'Extract Reviews',
        type: 'checkbox',
        required: false,
        default: false,
        description: 'Extract customer reviews for each place (may increase scraping time)'
      },
      {
        key: 'extract_images',
        label: 'Extract Images',
        type: 'checkbox',
        required: false,
        default: false,
        description: 'Extract place images/photos (may increase scraping time)'
      }
    ],
    outputFields: [
      // Basic Info
      'title', 'category', 'address', 'city', 'state', 'countryCode',
      // Contact Info (Enhanced with Website Enrichment)
      'phone', 'phoneVerified', 'additionalPhones[]', 'email', 'emailVerified', 'additionalEmails[]', 'website', 'contactPageUrl',
      // Ratings & Reviews
      'rating', 'reviewsCount', 'totalScore',
      // Social Media (Enhanced - Now includes Pinterest, Snapchat, WhatsApp, Telegram)
      'socialMedia.facebook', 'socialMedia.instagram', 'socialMedia.twitter', 'socialMedia.x',
      'socialMedia.linkedin', 'socialMedia.youtube', 'socialMedia.tiktok', 'socialMedia.pinterest',
      'socialMedia.snapchat', 'socialMedia.whatsapp', 'socialMedia.telegram',
      // Place Identifiers
      'placeId', 'url',
      // Operating Hours
      'openingHours', 'priceLevel',
      // Additional Data from Website
      'websiteAddresses[]',
      // Images & Reviews (if requested)
      'images[]', 'reviews[].reviewerName', 'reviews[].rating', 'reviews[].text', 'reviews[].date'
    ]
  },
  {
    actorId: 'amazon',
    name: 'Amazon Product Scraper',
    title: 'Amazon Product Data Extractor',
    description: 'Extract product details from Amazon including prices, reviews, ratings, images, and more.',
    author: 'compass',
    slug: 'compass/amazon-scraper',
    category: 'E-commerce',
    icon: '📦',
    stats: { runs: 0, rating: 4.7, reviews: 350 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,
    inputFields: [
      {
        key: 'url',
        label: 'Amazon Product URL',
        type: 'text',
        required: true,
        placeholder: 'https://www.amazon.com/dp/B08...',
        description: 'Full Amazon product page URL'
      },
      {
        key: 'country',
        label: 'Amazon Domain',
        type: 'select',
        required: false,
        default: 'com',
        options: [
          { value: 'com', label: 'United States (.com)' },
          { value: 'co.uk', label: 'United Kingdom (.co.uk)' },
          { value: 'de', label: 'Germany (.de)' },
          { value: 'fr', label: 'France (.fr)' },
          { value: 'ca', label: 'Canada (.ca)' }
        ],
        description: 'Amazon country domain to scrape from'
      }
    ],
    outputFields: [
      'title', 'asin', 'price', 'rating', 'reviews', 'images[]', 'description', 'features[]', 'inStock'
    ]
  },
  {
    actorId: 'instagram',
    name: 'Instagram Profile Scraper',
    title: 'Instagram Data Extractor',
    description: 'Extract profile information, posts, followers, and engagement data from Instagram.',
    author: 'compass',
    slug: 'compass/instagram-scraper',
    category: 'Social Media',
    icon: '📸',
    stats: { runs: 0, rating: 4.6, reviews: 280 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,
    inputFields: [
      {
        key: 'username',
        label: 'Instagram Username',
        type: 'text',
        required: true,
        placeholder: 'e.g., natgeo',
        description: 'Instagram username without @ symbol'
      },
      {
        key: 'maxPosts',
        label: 'Maximum Posts',
        type: 'number',
        required: false,
        default: 12,
        placeholder: '12',
        description: 'Number of recent posts to extract'
      }
    ],
    outputFields: [
      'username', 'fullName', 'bio', 'followers', 'following', 'posts[]', 'profilePicture', 'isVerified'
    ]
  },
  {
    actorId: 'twitter',
    name: 'Twitter/X Scraper',
    title: 'Twitter/X Data Extractor',
    description: 'Extract tweets, user profiles, and engagement metrics from Twitter/X.',
    author: 'compass',
    slug: 'compass/twitter-scraper',
    category: 'Social Media',
    icon: '🐦',
    stats: { runs: 0, rating: 4.5, reviews: 220 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,
    inputFields: [
      {
        key: 'username',
        label: 'Twitter Username',
        type: 'text',
        required: true,
        placeholder: 'e.g., elonmusk',
        description: 'Twitter username without @ symbol'
      },
      {
        key: 'maxTweets',
        label: 'Maximum Tweets',
        type: 'number',
        required: false,
        default: 20,
        placeholder: '20',
        description: 'Number of recent tweets to extract'
      }
    ],
    outputFields: [
      'username', 'displayName', 'bio', 'followers', 'following', 'tweets[]', 'profilePicture', 'isVerified'
    ]
  },
  {
    actorId: 'facebook',
    name: 'Facebook Page Scraper',
    title: 'Facebook Data Extractor',
    description: 'Extract public page data, posts, and engagement metrics from Facebook.',
    author: 'compass',
    slug: 'compass/facebook-scraper',
    category: 'Social Media',
    icon: '👥',
    stats: { runs: 0, rating: 4.4, reviews: 190 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,
    inputFields: [
      {
        key: 'pageUrl',
        label: 'Facebook Page URL',
        type: 'text',
        required: true,
        placeholder: 'https://www.facebook.com/pagename',
        description: 'Full Facebook page URL'
      },
      {
        key: 'maxPosts',
        label: 'Maximum Posts',
        type: 'number',
        required: false,
        default: 10,
        placeholder: '10',
        description: 'Number of recent posts to extract'
      }
    ],
    outputFields: [
      'pageName', 'category', 'likes', 'about', 'posts[]', 'website', 'email', 'phone'
    ]
  },
  {
    actorId: 'linkedin',
    name: 'LinkedIn Profile Scraper',
    title: 'LinkedIn Data Extractor',
    description: 'Extract professional profiles, company data, and job postings from LinkedIn.',
    author: 'compass',
    slug: 'compass/linkedin-scraper',
    category: 'Professional Network',
    icon: '💼',
    stats: { runs: 0, rating: 4.6, reviews: 240 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,
    inputFields: [
      {
        key: 'profileUrl',
        label: 'LinkedIn Profile URL',
        type: 'text',
        required: true,
        placeholder: 'https://www.linkedin.com/in/username',
        description: 'Full LinkedIn profile URL'
      }
    ],
    outputFields: [
      'fullName', 'headline', 'location', 'connections', 'experience[]', 'education[]', 'skills[]'
    ]
  },
  {
    actorId: 'tiktok',
    name: 'TikTok Profile Scraper',
    title: 'TikTok Data Extractor',
    description: 'Extract profile information, videos, and engagement metrics from TikTok.',
    author: 'compass',
    slug: 'compass/tiktok-scraper',
    category: 'Social Media',
    icon: '🎵',
    stats: { runs: 0, rating: 4.5, reviews: 180 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,
    inputFields: [
      {
        key: 'username',
        label: 'TikTok Username',
        type: 'text',
        required: true,
        placeholder: 'e.g., @username',
        description: 'TikTok username with or without @ symbol'
      },
      {
        key: 'maxVideos',
        label: 'Maximum Videos',
        type: 'number',
        required: false,
        default: 12,
        placeholder: '12',
        description: 'Number of recent videos to extract'
      }
    ],
    outputFields: [
      'username', 'displayName', 'bio', 'followers', 'likes', 'videos[]', 'profilePicture', 'isVerified'
    ]
  },
  {
    actorId: 'website',
    name: 'Website Scraper',
    title: 'Universal Website Data Extractor',
    description: '🌐 Extract data from any website using custom CSS selectors. 📧 ENHANCED: Automatically extracts contact details (emails, phones), social media links (10+ platforms), and physical addresses from any website. Checks Contact/About pages for comprehensive data.',
    author: 'compass',
    slug: 'compass/website-scraper',
    category: 'General',
    icon: '🌐',
    stats: { runs: 0, rating: 4.8, reviews: 420 },
    pricingModel: 'Pay per result',
    isPublic: true,
    scraperFunction: null,
    inputFields: [
      {
        key: 'url',
        label: 'Website URL',
        type: 'text',
        required: true,
        placeholder: 'https://example.com',
        description: 'Full URL of the website to scrape'
      },
      {
        key: 'selector',
        label: 'CSS Selector (Optional)',
        type: 'text',
        required: false,
        placeholder: 'div.content, h1, p.description',
        description: 'CSS selector to extract specific elements'
      },
      {
        key: 'extractContacts',
        label: 'Extract Contact Details',
        type: 'checkbox',
        required: false,
        default: true,
        description: '✨ Automatically extract emails, phone numbers, social media links, and addresses from the website'
      }
    ],
    outputFields: [
      'url', 'title', 'text', 'content', 'links[]', 'images[]', 'metadata',
      // Enhanced contact extraction
      'emails[]', 'phones[]', 'addresses[]', 'contactPageUrl',
      // Social media (10+ platforms)
      'socialMedia.facebook', 'socialMedia.instagram', 'socialMedia.twitter', 'socialMedia.linkedin',
      'socialMedia.youtube', 'socialMedia.tiktok', 'socialMedia.pinterest', 'socialMedia.snapchat',
      'socialMedia.whatsapp', 'socialMedia.telegram'
    ]
  }
];

/**
 * Get scraper function by actorId
 */
function getScraperFunction(actorId) {
  const actor = actorRegistry.find(a => a.actorId === actorId);
  return actor?.scraperFunction || null;
}

/**
 * Get input field schema by actorId
 */
function getInputFields(actorId) {
  const actor = actorRegistry.find(a => a.actorId === actorId);
  return actor?.inputFields || [];
}

/**
 * Get output field schema by actorId
 */
function getOutputFields(actorId) {
  const actor = actorRegistry.find(a => a.actorId === actorId);
  return actor?.outputFields || [];
}

module.exports = {
  actorRegistry,
  getScraperFunction,
  getInputFields,
  getOutputFields
};
