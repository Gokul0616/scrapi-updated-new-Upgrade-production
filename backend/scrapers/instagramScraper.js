const axios = require('axios');
const cheerio = require('cheerio');

async function instagramScraper(input) {
  const { username, maxPosts = 20 } = input;
  
  if (!username) throw new Error('Username is required');
  
  const cleanUsername = username.replace('@', '');
  
  try {
    // Instagram restricts scraping, but we can get some public profile data
    const url = `https://www.instagram.com/${cleanUsername}/`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract profile information from meta tags
    const pageTitle = $('title').text();
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    
    // Parse follower count from description if available
    let followers = 0;
    let posts = 0;
    const descMatch = description.match(/([\d,]+)\s+Followers/);
    const postsMatch = description.match(/([\d,]+)\s+Posts/);
    
    if (descMatch) {
      followers = parseInt(descMatch[1].replace(/,/g, ''));
    }
    if (postsMatch) {
      posts = parseInt(postsMatch[1].replace(/,/g, ''));
    }
    
    // Try to extract JSON data from script tags
    let profileData = {
      username: cleanUsername,
      profileUrl: url,
      pageTitle,
      bio: description,
      profileImage: image,
      followers,
      totalPosts: posts,
      postsExtracted: [],
      message: 'Instagram restricts scraping. Full access requires Instagram API with authentication. This shows limited public data.',
      scrapedAt: new Date().toISOString()
    };
    
    // Try to find embedded JSON data
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html());
        if (jsonData && jsonData.author) {
          profileData.authorName = jsonData.author.name || cleanUsername;
          profileData.authorImage = jsonData.author.image || image;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    });
    
    return [profileData];
    
  } catch (error) {
    // Instead of throwing error, return informative response
    return [{
      username: cleanUsername,
      profileUrl: `https://www.instagram.com/${cleanUsername}/`,
      message: 'Instagram restricts automated scraping. This platform requires official API access for data extraction.',
      note: 'For production use, consider Instagram Basic Display API or Instagram Graph API.',
      error: error.response?.status === 404 ? 'User not found' : 'Access restricted',
      statusCode: error.response?.status || 'Network error',
      scrapedAt: new Date().toISOString()
    }];
  }
}

module.exports = instagramScraper;