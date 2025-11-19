const googleMapsScraper = require('./googleMapsScraper');
const amazonScraper = require('./amazonScraper');
const instagramScraper = require('./instagramScraper');
const websiteScraper = require('./websiteScraper');

module.exports = {
  'google-maps': googleMapsScraper,
  'amazon': amazonScraper,
  'instagram': instagramScraper,
  'website': websiteScraper
};