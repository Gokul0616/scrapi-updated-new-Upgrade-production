const browserManager = require('../utils/browserManager');

// Twitter Scraper with Puppeteer - Tweets and user data
async function twitterScraperV2(input) {
  const { query, maxTweets = 50, searchType = 'top' } = input;
  
  if (!query) throw new Error('Query (search term, hashtag, or @username) is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    // Build search URL
    const isUser = query.startsWith('@');
    const searchUrl = isUser 
      ? `https://twitter.com/${query.replace('@', '')}` 
      : `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=${searchType}`;
    
    console.log(`Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scroll to load tweets
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Extract tweets
    const tweets = await page.evaluate((maxTweets, query) => {
      const results = [];
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      
      for (let i = 0; i < Math.min(articles.length, maxTweets); i++) {
        const article = articles[i];
        
        try {
          const tweet = {};
          
          // Tweet text
          const textEl = article.querySelector('div[data-testid="tweetText"]');
          tweet.text = textEl ? textEl.textContent.trim() : '';
          
          // Author info
          const authorNameEl = article.querySelector('div[data-testid="User-Name"] span');
          const authorUsernameEl = article.querySelector('div[data-testid="User-Name"] a[href^="/"]');
          
          if (authorUsernameEl) {
            const href = authorUsernameEl.getAttribute('href');
            tweet.author = {
              username: href.replace('/', ''),
              name: authorNameEl ? authorNameEl.textContent.trim() : '',
              verified: !!article.querySelector('svg[aria-label*="Verified"]'),
              blueVerified: !!article.querySelector('svg[data-testid="icon-verified"]')
            };
          }
          
          // Profile image
          const avatarEl = article.querySelector('img[alt][src*="profile"]');
          if (avatarEl && tweet.author) {
            tweet.author.profileImageUrl = avatarEl.getAttribute('src');
          }
          
          // Tweet URL
          const tweetLinkEl = article.querySelector('a[href*="/status/"]');
          if (tweetLinkEl) {
            const href = tweetLinkEl.getAttribute('href');
            tweet.url = `https://twitter.com${href}`;
            const statusMatch = href.match(/\/status\/(\d+)/);
            tweet.id = statusMatch ? statusMatch[1] : '';
          }
          
          // Timestamp
          const timeEl = article.querySelector('time');
          if (timeEl) {
            tweet.createdAt = timeEl.getAttribute('datetime') || new Date().toISOString();
          }
          
          // Engagement metrics
          const replyEl = article.querySelector('button[data-testid="reply"]');
          const retweetEl = article.querySelector('button[data-testid="retweet"]');
          const likeEl = article.querySelector('button[data-testid="like"]');
          const viewsEl = article.querySelector('a[href*="/analytics"]');
          
          tweet.replyCount = replyEl ? parseInt(replyEl.textContent.replace(/\D/g, '') || '0') : 0;
          tweet.retweetCount = retweetEl ? parseInt(retweetEl.textContent.replace(/\D/g, '') || '0') : 0;
          tweet.likeCount = likeEl ? parseInt(likeEl.textContent.replace(/\D/g, '') || '0') : 0;
          tweet.viewCount = viewsEl ? parseInt(viewsEl.textContent.replace(/\D/g, '') || '0') : 0;
          
          // Media
          const media = [];
          article.querySelectorAll('img[src*="media"]').forEach(img => {
            media.push({
              type: 'photo',
              url: img.getAttribute('src')
            });
          });
          
          article.querySelectorAll('video').forEach(video => {
            const source = video.querySelector('source');
            if (source) {
              media.push({
                type: 'video',
                url: source.getAttribute('src'),
                thumbnailUrl: video.getAttribute('poster')
              });
            }
          });
          
          if (media.length > 0) {
            tweet.media = media;
          }
          
          // Hashtags and mentions
          const hashtags = [];
          const mentions = [];
          
          article.querySelectorAll('a[href*="/hashtag/"]').forEach(a => {
            hashtags.push(a.textContent.trim());
          });
          
          article.querySelectorAll('a[href^="/"][href*="@"]').forEach(a => {
            const mention = a.textContent.trim();
            if (mention.startsWith('@')) {
              mentions.push(mention);
            }
          });
          
          tweet.hashtags = hashtags;
          tweet.mentions = mentions;
          tweet.lang = 'en';
          tweet.isReply = !!article.querySelector('div[data-testid="reply"]');
          tweet.isRetweet = tweet.text.startsWith('RT @');
          
          tweet.scrapedAt = new Date().toISOString();
          
          if (tweet.text && tweet.author) {
            results.push(tweet);
          }
        } catch (err) {
          console.error('Error extracting tweet:', err);
        }
      }
      
      return results;
    }, maxTweets, query);
    
    await page.close();
    return tweets;
    
  } catch (error) {
    if (page) await page.close();
    console.error('Twitter scraping error:', error);
    throw new Error(`Failed to scrape Twitter: ${error.message}. Note: Twitter may require authentication for full access.`);
  }
}

module.exports = twitterScraperV2;