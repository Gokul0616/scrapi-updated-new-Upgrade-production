const express = require('express');
const router = express.Router();

// Get available scrapers
router.get('/', (req, res) => {
  const scrapers = [
    {
      id: 'google-maps',
      name: 'Google Maps Scraper',
      description: 'Extract data from Google Maps locations'
    },
    {
      id: 'amazon',
      name: 'Amazon Scraper',
      description: 'Scrape Amazon product data'
    },
    {
      id: 'instagram',
      name: 'Instagram Scraper',
      description: 'Extract Instagram profile and post data'
    },
    {
      id: 'website',
      name: 'Website Content Crawler',
      description: 'Crawl and extract website content'
    }
  ];
  
  res.json(scrapers);
});

module.exports = router;