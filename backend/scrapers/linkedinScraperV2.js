const browserManager = require('../utils/browserManager');

// LinkedIn Scraper with Puppeteer - Profile data
async function linkedinScraperV2(input) {
  const { profileUrl } = input;
  
  if (!profileUrl) throw new Error('Profile URL is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    console.log(`Navigating to: ${profileUrl}`);
    
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract profile data
    const profileData = await page.evaluate(() => {
      const data = {
        profileUrl: window.location.href,
        scrapedAt: new Date().toISOString()
      };
      
      try {
        // Full name
        const nameEl = document.querySelector('h1.text-heading-xlarge, h1[class*="profile"]');
        data.fullName = nameEl ? nameEl.textContent.trim() : '';
        
        // Headline
        const headlineEl = document.querySelector('div.text-body-medium, div[class*="headline"]');
        data.headline = headlineEl ? headlineEl.textContent.trim() : '';
        
        // Location
        const locationEl = document.querySelector('span.text-body-small[class*="location"], div[class*="location"] span');
        data.location = locationEl ? locationEl.textContent.trim() : '';
        
        // Connections
        const connectionsEl = document.querySelector('span.t-bold, li[class*="connections"] span');
        if (connectionsEl) {
          const text = connectionsEl.textContent;
          data.connections = text.includes('500+') ? '500+' : text.match(/[\d,]+/)?.[0] || '0';
        }
        
        // Profile picture
        const profilePicEl = document.querySelector('img.pv-top-card-profile-picture__image, button img[class*="profile"]');
        data.profilePicture = profilePicEl ? profilePicEl.getAttribute('src') : '';
        
        // About section
        const aboutEl = document.querySelector('div[class*="about"] div.inline-show-more-text, section[id*="about"] span');
        data.about = aboutEl ? aboutEl.textContent.trim() : '';
        
        // Current position
        const currentPosEl = document.querySelector('div[id*="experience"] li:first-child, div.pv-top-card-v2-section__entity-name');
        if (currentPosEl) {
          const titleEl = currentPosEl.querySelector('div[class*="title"], span[aria-hidden="true"]');
          const companyEl = currentPosEl.querySelector('span[class*="company"]');
          
          if (titleEl) {
            data.currentPosition = {
              title: titleEl.textContent.trim(),
              company: companyEl ? companyEl.textContent.trim() : ''
            };
          }
        }
        
        // Experience
        const experience = [];
        document.querySelectorAll('section[id*="experience"] li, div[id*="experience"] li').forEach((li, idx) => {
          if (idx >= 10) return;
          
          try {
            const titleEl = li.querySelector('div[class*="title"], span[aria-hidden="true"]');
            const companyEl = li.querySelector('span[class*="company"]');
            const dateEl = li.querySelector('span[class*="date-range"]');
            const locationEl = li.querySelector('span[class*="location"]');
            
            if (titleEl) {
              experience.push({
                title: titleEl.textContent.trim(),
                company: companyEl ? companyEl.textContent.trim() : '',
                dateRange: dateEl ? dateEl.textContent.trim() : '',
                location: locationEl ? locationEl.textContent.trim() : ''
              });
            }
          } catch (err) {
            console.error('Error extracting experience:', err);
          }
        });
        if (experience.length > 0) {
          data.experience = experience;
        }
        
        // Education
        const education = [];
        document.querySelectorAll('section[id*="education"] li, div[id*="education"] li').forEach((li, idx) => {
          if (idx >= 5) return;
          
          try {
            const schoolEl = li.querySelector('div[class*="school-name"], span[aria-hidden="true"]');
            const degreeEl = li.querySelector('span[class*="degree"]');
            const fieldEl = li.querySelector('span[class*="field"]');
            const dateEl = li.querySelector('span[class*="date-range"]');
            
            if (schoolEl) {
              education.push({
                school: schoolEl.textContent.trim(),
                degree: degreeEl ? degreeEl.textContent.trim() : '',
                field: fieldEl ? fieldEl.textContent.trim() : '',
                dateRange: dateEl ? dateEl.textContent.trim() : ''
              });
            }
          } catch (err) {
            console.error('Error extracting education:', err);
          }
        });
        if (education.length > 0) {
          data.education = education;
        }
        
        // Skills
        const skills = [];
        document.querySelectorAll('section[id*="skills"] span[aria-hidden="true"], div[class*="skill-name"]').forEach((el, idx) => {
          if (idx >= 20) return;
          const skillText = el.textContent.trim();
          if (skillText && !skills.includes(skillText)) {
            skills.push(skillText);
          }
        });
        if (skills.length > 0) {
          data.skills = skills;
        }
        
        // Follower count from page text
        const pageText = document.body.textContent;
        const followerMatch = pageText.match(/([\d,]+)\s+followers/i);
        if (followerMatch) {
          data.followerCount = parseInt(followerMatch[1].replace(/,/g, ''));
        }
        
      } catch (err) {
        console.error('Error extracting LinkedIn profile data:', err);
      }
      
      return data;
    });
    
    await page.close();
    return [profileData];
    
  } catch (error) {
    if (page) await page.close();
    console.error('LinkedIn scraping error:', error);
    throw new Error(`Failed to scrape LinkedIn: ${error.message}. Note: LinkedIn requires authentication for full profile access.`);
  }
}

module.exports = linkedinScraperV2;