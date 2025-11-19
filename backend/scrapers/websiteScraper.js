const axios = require('axios');
const cheerio = require('cheerio');

async function websiteScraper(input) {
  const { url, selectors = {} } = input;
  
  if (!url) throw new Error('URL is required');
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    const data = {
      url,
      title: $('title').text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text().trim(),
      links: [],
      images: [],
      text: ''
    };
    
    // Extract links
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text) {
        data.links.push({ href, text });
      }
    });
    data.links = data.links.slice(0, 50);
    
    // Extract images
    $('img[src]').each((i, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      if (src) {
        data.images.push({ src, alt });
      }
    });
    data.images = data.images.slice(0, 20);
    
    // Extract main text content
    $('script, style, nav, footer, header').remove();
    data.text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1000);
    
    // Custom selectors if provided
    if (selectors && Object.keys(selectors).length > 0) {
      data.custom = {};
      for (const [key, selector] of Object.entries(selectors)) {
        const elements = [];
        $(selector).each((i, el) => {
          elements.push($(el).text().trim());
        });
        data.custom[key] = elements;
      }
    }
    
    return [data];
    
  } catch (error) {
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

module.exports = websiteScraper;