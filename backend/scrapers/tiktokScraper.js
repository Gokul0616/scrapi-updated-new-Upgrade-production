const axios = require('axios');
const cheerio = require('cheerio');

async function tiktokScraper(input) {
  const { username, maxVideos = 20 } = input;
  
  if (!username) throw new Error('Username is required');
  
  try {
    const cleanUsername = username.replace('@', '');
    const url = `https://www.tiktok.com/@${cleanUsername}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const videos = [];
    
    // TikTok uses heavy JavaScript rendering, so cheerio can only get limited data
    // We'll extract what we can from the HTML
    const pageTitle = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Extract basic profile info
    const profileData = {
      username: cleanUsername,
      profileUrl: url,
      description: description,
      pageTitle: pageTitle,
      message: 'Note: Full TikTok scraping requires browser automation or API access. This returns available public data.',
      scrapedAt: new Date().toISOString()
    };
    
    // Try to extract video links if present in HTML
    $('a[href*="/video/"]').each((i, el) => {
      if (videos.length >= maxVideos) return false;
      const videoUrl = $(el).attr('href');
      if (videoUrl) {
        videos.push({
          videoUrl: videoUrl.startsWith('http') ? videoUrl : `https://www.tiktok.com${videoUrl}`,
          extractedFrom: 'html'
        });
      }
    });
    
    profileData.videosFound = videos.length;
    profileData.videos = videos;
    
    return [profileData];
    
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`TikTok user @${username} not found`);
    }
    throw new Error(`Failed to scrape TikTok: ${error.message}`);
  }
}

module.exports = tiktokScraper;
