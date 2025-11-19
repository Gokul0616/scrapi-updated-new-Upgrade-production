const browserManager = require('../utils/browserManager');

// Facebook Scraper with Puppeteer - Page and posts data
async function facebookScraperV2(input) {
  const { pageUrl, maxPosts = 30 } = input;
  
  if (!pageUrl) throw new Error('Page URL is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    console.log(`Navigating to: ${pageUrl}`);
    
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract page data
    const pageData = await page.evaluate((maxPosts) => {
      const data = {
        url: window.location.href,
        scrapedAt: new Date().toISOString()
      };
      
      try {
        // Page name
        const nameEl = document.querySelector('h1, h2[role="heading"]');
        data.pageName = nameEl ? nameEl.textContent.trim() : '';
        
        // Category
        const categoryEl = document.querySelector('span[class*="category"]');
        data.category = categoryEl ? categoryEl.textContent.trim() : 'Page';
        
        // Profile picture
        const profilePicEl = document.querySelector('image, img[alt*="profile"]');
        data.profilePicture = profilePicEl ? (profilePicEl.getAttribute('href') || profilePicEl.getAttribute('src')) : '';
        
        // Extract likes/followers from page text
        const pageText = document.body.textContent;
        const likesMatch = pageText.match(/([\d,.]+[KMkm]?)\s+(?:likes|followers)/i);
        if (likesMatch) {
          let likesStr = likesMatch[1].replace(/,/g, '');
          let multiplier = 1;
          if (likesStr.includes('K') || likesStr.includes('k')) {
            multiplier = 1000;
            likesStr = likesStr.replace(/[Kk]/g, '');
          } else if (likesStr.includes('M') || likesStr.includes('m')) {
            multiplier = 1000000;
            likesStr = likesStr.replace(/[Mm]/g, '');
          }
          data.likes = Math.round(parseFloat(likesStr) * multiplier);
        }
        
        // About section
        const aboutEl = document.querySelector('div[class*="about"] span, div[class*="intro"] span');
        data.about = aboutEl ? aboutEl.textContent.trim() : '';
        
        // Contact info
        const websiteEl = document.querySelector('a[href^="http"][target="_blank"]');
        data.website = websiteEl ? websiteEl.getAttribute('href') : '';
        
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        data.email = emailMatch ? emailMatch[0] : '';
        
        const phoneMatch = pageText.match(/\+?[1-9]\d{0,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/);
        data.phone = phoneMatch ? phoneMatch[0] : '';
        
        // Verified status
        data.verified = !!document.querySelector('svg[aria-label*="Verified"]');
        
        // Extract posts
        const posts = [];
        const postElements = document.querySelectorAll('div[data-ad-preview="message"], div[role="article"]');
        
        postElements.forEach((el, idx) => {
          if (idx >= maxPosts) return;
          
          try {
            const post = {};
            
            // Post text
            const textEl = el.querySelector('div[data-ad-preview="message"], div[dir="auto"]');
            post.message = textEl ? textEl.textContent.trim().substring(0, 500) : '';
            
            // Post link
            const linkEl = el.querySelector('a[href*="/posts/"], a[href*="/photos/"]');
            post.permalinkUrl = linkEl ? linkEl.getAttribute('href') : '';
            
            // Timestamp
            const timeEl = el.querySelector('abbr, span[id*="date"]');
            post.createdTime = timeEl ? timeEl.getAttribute('title') || new Date().toISOString() : new Date().toISOString();
            
            // Reactions/engagement
            const reactionsEl = el.querySelector('span[aria-label*="reactions"]');
            if (reactionsEl) {
              const reactText = reactionsEl.getAttribute('aria-label') || '';
              const countMatch = reactText.match(/([\d,]+)/);
              if (countMatch) {
                post.reactions = {
                  total: parseInt(countMatch[1].replace(/,/g, ''))
                };
              }
            }
            
            // Comments and shares
            const commentsMatch = el.textContent.match(/([\d,]+)\s+comments/i);
            post.commentsCount = commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, '')) : 0;
            
            const sharesMatch = el.textContent.match(/([\d,]+)\s+shares/i);
            post.sharesCount = sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, '')) : 0;
            
            // Media
            const media = [];
            el.querySelectorAll('img[src*="scontent"]').forEach(img => {
              media.push({
                type: 'photo',
                url: img.getAttribute('src')
              });
            });
            
            if (media.length > 0) {
              post.media = media;
            }
            
            if (post.message || post.media) {
              posts.push(post);
            }
          } catch (err) {
            console.error('Error extracting post:', err);
          }
        });
        
        data.posts = posts;
        
      } catch (err) {
        console.error('Error extracting Facebook page data:', err);
      }
      
      return data;
    }, maxPosts);
    
    await page.close();
    return [pageData];
    
  } catch (error) {
    if (page) await page.close();
    console.error('Facebook scraping error:', error);
    throw new Error(`Failed to scrape Facebook: ${error.message}. Note: Facebook requires authentication for detailed access.`);
  }
}

module.exports = facebookScraperV2;