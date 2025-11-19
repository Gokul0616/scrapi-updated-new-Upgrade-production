const axios = require('axios');
const cheerio = require('cheerio');

async function facebookScraper(input) {
  const { pageUrl, maxPosts = 30 } = input;
  
  if (!pageUrl) throw new Error('Page URL is required');
  
  try {
    // Facebook heavily restricts scraping and requires authentication
    // We'll attempt to get publicly available data
    const response = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract basic page information
    const pageTitle = $('title').text();
    const description = $('meta[property="og:description"]').attr('content') || 
                       $('meta[name="description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    
    const posts = [];
    
    // Facebook's HTML structure is complex and dynamic
    // We can only extract limited information from static HTML
    $('div[role="article"]').each((i, el) => {
      if (posts.length >= maxPosts) return false;
      
      const $post = $(el);
      const text = $post.text().trim().substring(0, 300);
      
      if (text) {
        posts.push({
          content: text,
          extractedAt: new Date().toISOString()
        });
      }
    });
    
    return [{
      pageUrl,
      pageTitle,
      description,
      image,
      postsFound: posts.length,
      posts,
      message: 'Facebook restricts scraping. Full access requires Graph API with authentication. This shows limited public data.',
      scrapedAt: new Date().toISOString()
    }];
    
  } catch (error) {
    // Instead of throwing error, return informative response
    return [{
      pageUrl,
      message: 'Facebook restricts automated scraping and requires authentication.',
      note: 'For production use, consider Facebook Graph API with proper app permissions.',
      error: error.response?.status === 404 ? 'Page not found' : 'Access restricted',
      statusCode: error.response?.status || 'Network error',
      postsFound: 0,
      posts: [],
      scrapedAt: new Date().toISOString()
    }];
  }
}

module.exports = facebookScraper;
