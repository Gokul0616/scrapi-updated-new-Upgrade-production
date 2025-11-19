const browserManager = require('../utils/browserManager');

// Instagram Scraper with Puppeteer - Profile and posts data
async function instagramScraperV2(input) {
  const { username, maxPosts = 20 } = input;
  
  if (!username) throw new Error('Username is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    const profileUrl = `https://www.instagram.com/${username}/`;
    console.log(`Navigating to: ${profileUrl}`);
    
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract profile data
    const profileData = await page.evaluate((username, maxPosts) => {
      const data = {
        username,
        scrapedAt: new Date().toISOString()
      };
      
      try {
        // Try to extract from page content
        const pageText = document.body.textContent;
        
        // Profile name
        const nameEl = document.querySelector('header section h1, header section h2');
        data.fullName = nameEl ? nameEl.textContent.trim() : username;
        
        // Bio
        const bioEl = document.querySelector('header section span[dir="auto"]');
        data.biography = bioEl ? bioEl.textContent.trim() : '';
        
        // External URL
        const urlEl = document.querySelector('header a[href][target="_blank"]');
        data.externalUrl = urlEl ? urlEl.getAttribute('href') : '';
        
        // Stats from meta tags or visible elements
        const statsEls = document.querySelectorAll('header section ul li');
        statsEls.forEach(el => {
          const text = el.textContent.toLowerCase();
          const numMatch = text.match(/([\d,]+)/);
          const num = numMatch ? parseInt(numMatch[1].replace(/,/g, '')) : 0;
          
          if (text.includes('post')) data.postsCount = num;
          else if (text.includes('follower')) data.followersCount = num;
          else if (text.includes('following')) data.followsCount = num;
        });
        
        // Profile picture
        const profilePicEl = document.querySelector('header img');
        data.profilePicUrl = profilePicEl ? profilePicEl.getAttribute('src') : '';
        data.profilePicUrlHD = data.profilePicUrl;
        
        // Check if verified
        data.isVerified = pageText.includes('Verified') || !!document.querySelector('svg[aria-label*="Verified"]');
        data.isPrivate = pageText.includes('This Account is Private');
        data.isBusinessAccount = pageText.includes('Business') || pageText.includes('Professional');
        
        // Extract posts
        const posts = [];
        const postLinks = document.querySelectorAll('article a[href*="/p/"]');
        
        postLinks.forEach((link, idx) => {
          if (idx >= maxPosts) return;
          
          const shortcode = link.getAttribute('href').match(/\/p\/([^\/]+)/)?.[1];
          const imgEl = link.querySelector('img');
          
          if (shortcode) {
            posts.push({
              shortcode,
              url: `https://www.instagram.com/p/${shortcode}/`,
              typename: 'GraphImage',
              mediaUrl: imgEl ? imgEl.getAttribute('src') : '',
              thumbnailUrl: imgEl ? imgEl.getAttribute('src') : ''
            });
          }
        });
        
        data.posts = posts;
        
      } catch (err) {
        console.error('Error extracting Instagram data:', err);
      }
      
      return data;
    }, username, maxPosts);
    
    await page.close();
    return [profileData];
    
  } catch (error) {
    if (page) await page.close();
    console.error('Instagram scraping error:', error);
    throw new Error(`Failed to scrape Instagram: ${error.message}. Note: Instagram requires authentication for detailed data.`);
  }
}

module.exports = instagramScraperV2;