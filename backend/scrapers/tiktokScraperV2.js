const browserManager = require('../utils/browserManager');

// TikTok Scraper with Puppeteer - User and videos data
async function tiktokScraperV2(input) {
  const { username, maxVideos = 20 } = input;
  
  if (!username) throw new Error('Username is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    const profileUrl = `https://www.tiktok.com/@${username.replace('@', '')}`;
    console.log(`Navigating to: ${profileUrl}`);
    
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scroll to load videos
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Extract user and videos data
    const userData = await page.evaluate((username, maxVideos) => {
      const data = {
        uniqueId: username.replace('@', ''),
        scrapedAt: new Date().toISOString()
      };
      
      try {
        // Nickname
        const nicknameEl = document.querySelector('h1[data-e2e="user-title"], h2[data-e2e="user-title"]');
        data.nickname = nicknameEl ? nicknameEl.textContent.trim() : username;
        
        // Bio/Signature
        const bioEl = document.querySelector('h2[data-e2e="user-bio"]');
        data.signature = bioEl ? bioEl.textContent.trim() : '';
        
        // Verified status
        data.verified = !!document.querySelector('svg[class*="verified"]');
        
        // Profile picture
        const profilePicEl = document.querySelector('img[class*="avatar"]');
        data.profilePic = profilePicEl ? profilePicEl.getAttribute('src') : '';
        
        // Stats
        const statsEls = document.querySelectorAll('strong[data-e2e*="count"]');
        if (statsEls.length >= 3) {
          const parseCount = (text) => {
            let value = text.replace(/[^\d.KMkm]/g, '');
            let multiplier = 1;
            if (value.includes('K') || value.includes('k')) {
              multiplier = 1000;
              value = value.replace(/[Kk]/g, '');
            } else if (value.includes('M') || value.includes('m')) {
              multiplier = 1000000;
              value = value.replace(/[Mm]/g, '');
            }
            return Math.round(parseFloat(value) * multiplier);
          };
          
          data.followingCount = parseCount(statsEls[0]?.textContent || '0');
          data.followerCount = parseCount(statsEls[1]?.textContent || '0');
          data.heartCount = parseCount(statsEls[2]?.textContent || '0');
        }
        
        // Extract videos
        const videos = [];
        const videoElements = document.querySelectorAll('div[data-e2e="user-post-item"]');
        
        videoElements.forEach((el, idx) => {
          if (idx >= maxVideos) return;
          
          try {
            const video = {};
            
            // Video link
            const linkEl = el.querySelector('a');
            if (linkEl) {
              const href = linkEl.getAttribute('href');
              video.url = href.startsWith('http') ? href : `https://www.tiktok.com${href}`;
              
              // Extract video ID from URL
              const idMatch = href.match(/\/video\/(\d+)/);
              video.id = idMatch ? idMatch[1] : '';
            }
            
            // Thumbnail/cover
            const imgEl = el.querySelector('img');
            video.cover = imgEl ? imgEl.getAttribute('src') : '';
            
            // Video description (from alt text or aria-label)
            video.desc = imgEl ? imgEl.getAttribute('alt') : '';
            
            // View count
            const viewsEl = el.querySelector('strong');
            if (viewsEl) {
              const viewsText = viewsEl.textContent;
              let views = viewsText.replace(/[^\d.KMkm]/g, '');
              let multiplier = 1;
              if (views.includes('K') || views.includes('k')) {
                multiplier = 1000;
                views = views.replace(/[Kk]/g, '');
              } else if (views.includes('M') || views.includes('m')) {
                multiplier = 1000000;
                views = views.replace(/[Mm]/g, '');
              }
              video.playCount = Math.round(parseFloat(views) * multiplier);
            }
            
            if (video.url) {
              videos.push(video);
            }
          } catch (err) {
            console.error('Error extracting video:', err);
          }
        });
        
        data.videos = videos;
        data.videoCount = videos.length;
        
      } catch (err) {
        console.error('Error extracting TikTok user data:', err);
      }
      
      return data;
    }, username, maxVideos);
    
    await page.close();
    return [userData];
    
  } catch (error) {
    if (page) await page.close();
    console.error('TikTok scraping error:', error);
    throw new Error(`Failed to scrape TikTok: ${error.message}. Note: TikTok may limit scraping without authentication.`);
  }
}

module.exports = tiktokScraperV2;