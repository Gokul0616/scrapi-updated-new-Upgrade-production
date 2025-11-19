const axios = require('axios');
const cheerio = require('cheerio');

async function linkedinScraper(input) {
  const { profileUrl, sections = 'all' } = input;
  
  if (!profileUrl) throw new Error('Profile URL is required');
  
  try {
    // LinkedIn heavily restricts scraping and requires authentication
    // We'll attempt to get publicly available profile data
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract basic profile information from meta tags
    const name = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    const pageTitle = $('title').text();
    
    // Try to extract visible profile data
    const profileData = {
      profileUrl,
      name,
      headline: description,
      image,
      pageTitle,
      sections: {
        about: '',
        experience: [],
        education: [],
        skills: []
      },
      message: 'LinkedIn restricts scraping. Full access requires authentication and API access. This shows limited public data.',
      scrapedAt: new Date().toISOString()
    };
    
    // Attempt to extract about section
    const aboutText = $('section[id*="about"]').text().trim();
    if (aboutText) {
      profileData.sections.about = aboutText.substring(0, 500);
    }
    
    // Attempt to extract experience
    $('section[id*="experience"] li').each((i, el) => {
      if (profileData.sections.experience.length >= 5) return false;
      const text = $(el).text().trim();
      if (text) {
        profileData.sections.experience.push(text.substring(0, 200));
      }
    });
    
    // Attempt to extract education
    $('section[id*="education"] li').each((i, el) => {
      if (profileData.sections.education.length >= 5) return false;
      const text = $(el).text().trim();
      if (text) {
        profileData.sections.education.push(text.substring(0, 200));
      }
    });
    
    return [profileData];
    
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('LinkedIn profile not found');
    }
    if (error.response?.status === 999) {
      throw new Error('LinkedIn blocked the request. LinkedIn requires authentication for scraping.');
    }
    throw new Error(`Failed to scrape LinkedIn: ${error.message}. Note: LinkedIn requires authentication. Consider using their API.`);
  }
}

module.exports = linkedinScraper;
