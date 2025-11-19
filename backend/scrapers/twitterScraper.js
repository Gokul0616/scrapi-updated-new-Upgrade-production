const axios = require('axios');
const cheerio = require('cheerio');

async function twitterScraper(input) {
  const { query, maxTweets = 50 } = input;
  
  if (!query) throw new Error('Search query is required');
  
  try {
    // Twitter/X heavily restricts scraping and requires authentication
    // We'll scrape publicly available data from nitter instances (Twitter frontend alternatives)
    const nitterInstance = 'nitter.net';
    const searchQuery = encodeURIComponent(query);
    const url = `https://${nitterInstance}/search?q=${searchQuery}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const tweets = [];
    
    // Extract tweets from nitter HTML structure
    $('.timeline-item').each((i, el) => {
      if (tweets.length >= maxTweets) return false;
      
      const $tweet = $(el);
      const username = $tweet.find('.username').text().trim();
      const fullname = $tweet.find('.fullname').text().trim();
      const content = $tweet.find('.tweet-content').text().trim();
      const date = $tweet.find('.tweet-date').attr('title') || '';
      const tweetLink = $tweet.find('.tweet-link').attr('href') || '';
      
      if (content) {
        tweets.push({
          username,
          fullname,
          content,
          date,
          tweetUrl: tweetLink ? `https://twitter.com${tweetLink}` : '',
          stats: {
            retweets: $tweet.find('.icon-retweet').parent().text().trim() || '0',
            likes: $tweet.find('.icon-heart').parent().text().trim() || '0',
          }
        });
      }
    });
    
    return [{
      query,
      totalTweets: tweets.length,
      tweets,
      message: 'Twitter scraping via Nitter proxy. Results may vary based on service availability.',
      scrapedAt: new Date().toISOString()
    }];
    
  } catch (error) {
    // Instead of throwing error, return informative response
    return [{
      query,
      message: 'Twitter/X restricts automated scraping. Nitter instances may be unavailable.',
      note: 'For production use, consider Twitter API v2 with proper authentication.',
      error: error.response?.status === 404 ? 'No results found' : 'Service unavailable',
      statusCode: error.response?.status || 'Network error',
      totalTweets: 0,
      tweets: [],
      scrapedAt: new Date().toISOString()
    }];
  }
}

module.exports = twitterScraper;
