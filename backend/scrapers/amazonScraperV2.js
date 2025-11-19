const browserManager = require('../utils/browserManager');

// Amazon Scraper with Puppeteer - Comprehensive product data
async function amazonScraperV2(input) {
  const { query, maxResults = 20, domain = 'amazon.com' } = input;
  
  if (!query) throw new Error('Query is required');

  let page = null;
  
  try {
    page = await browserManager.getPage(false);
    
    // Build search URL
    const searchUrl = `https://www.${domain}/s?k=${encodeURIComponent(query)}`;
    
    console.log(`Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results
    await page.waitForSelector('div[data-component-type="s-search-result"]', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract product links
    const productLinks = await page.evaluate((maxResults) => {
      const results = [];
      const items = document.querySelectorAll('div[data-component-type="s-search-result"]');
      
      for (let i = 0; i < Math.min(items.length, maxResults); i++) {
        const item = items[i];
        const linkEl = item.querySelector('h2 a');
        const asin = item.getAttribute('data-asin');
        
        if (linkEl && asin) {
          results.push({
            url: linkEl.getAttribute('href'),
            asin: asin
          });
        }
      }
      
      return results;
    }, maxResults);
    
    console.log(`Found ${productLinks.length} products`);
    
    // Extract detailed info for each product (limit to first 10 for performance)
    const products = [];
    for (let i = 0; i < Math.min(productLinks.length, 10); i++) {
      try {
        const productUrl = productLinks[i].url.startsWith('http') 
          ? productLinks[i].url 
          : `https://www.${domain}${productLinks[i].url}`;
        
        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const productData = await extractProductData(page, domain, productLinks[i].asin);
        if (productData) {
          products.push(productData);
        }
      } catch (err) {
        console.error(`Error scraping product ${i}:`, err.message);
      }
    }
    
    await page.close();
    return products;
    
  } catch (error) {
    if (page) await page.close();
    console.error('Amazon scraping error:', error);
    throw new Error(`Failed to scrape Amazon: ${error.message}`);
  }
}

// Helper function to extract detailed product data
async function extractProductData(page, domain, asin) {
  return await page.evaluate((domain, asin) => {
    const product = {
      asin,
      url: window.location.href,
      scrapedAt: new Date().toISOString()
    };
    
    try {
      // Title
      const titleEl = document.querySelector('#productTitle');
      product.title = titleEl ? titleEl.textContent.trim() : '';
      
      // Brand
      const brandEl = document.querySelector('#bylineInfo, .po-brand .po-break-word');
      product.brand = brandEl ? brandEl.textContent.replace('Visit the', '').replace('Brand:', '').replace('Store', '').trim() : '';
      
      // Price
      const priceWhole = document.querySelector('.a-price-whole');
      const priceFraction = document.querySelector('.a-price-fraction');
      const priceSymbol = document.querySelector('.a-price-symbol');
      
      if (priceWhole) {
        const wholeValue = priceWhole.textContent.replace(/[^\d]/g, '');
        const fractionValue = priceFraction ? priceFraction.textContent : '00';
        const symbol = priceSymbol ? priceSymbol.textContent : '$';
        
        product.price = {
          value: parseFloat(`${wholeValue}.${fractionValue}`),
          currency: symbol,
          symbol: symbol,
          priceString: `${symbol}${wholeValue}.${fractionValue}`
        };
      }
      
      // List price (original price)
      const listPriceEl = document.querySelector('.a-price.a-text-price span.a-offscreen');
      if (listPriceEl) {
        const listPriceText = listPriceEl.textContent.replace(/[^\d.]/g, '');
        const listPriceValue = parseFloat(listPriceText);
        if (listPriceValue && product.price) {
          product.listPrice = {
            value: listPriceValue,
            currency: product.price.symbol,
            symbol: product.price.symbol,
            priceString: `${product.price.symbol}${listPriceValue.toFixed(2)}`
          };
        }
      }
      
      // Availability
      const availEl = document.querySelector('#availability span');
      product.availability = availEl ? availEl.textContent.trim() : 'Unknown';
      product.inStock = product.availability.toLowerCase().includes('in stock');
      
      // Rating
      const ratingEl = document.querySelector('span[data-hook="rating-out-of-text"], .a-icon-star span');
      if (ratingEl) {
        const ratingText = ratingEl.textContent;
        const ratingMatch = ratingText.match(/([\d.]+)/);
        product.stars = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      }
      
      // Reviews count
      const reviewsEl = document.querySelector('#acrCustomerReviewText, span[data-hook="total-review-count"]');
      if (reviewsEl) {
        const reviewsText = reviewsEl.textContent.replace(/[^\d]/g, '');
        product.reviewsCount = parseInt(reviewsText) || 0;
      }
      
      // Rating distribution
      const ratingDist = {};
      document.querySelectorAll('.a-histogram-row').forEach(row => {
        const starEl = row.querySelector('.a-size-base');
        const percentEl = row.querySelector('.a-size-base.a-color-secondary');
        if (starEl && percentEl) {
          const starText = starEl.textContent.trim();
          const percent = parseInt(percentEl.textContent.replace('%', ''));
          ratingDist[starText.replace(' ', '').toLowerCase()] = percent;
        }
      });
      if (Object.keys(ratingDist).length > 0) {
        product.ratingDistribution = ratingDist;
      }
      
      // Images
      const images = [];
      const mainImageEl = document.querySelector('#landingImage, #imgBlkFront');
      if (mainImageEl) {
        const mainImageSrc = mainImageEl.getAttribute('src');
        if (mainImageSrc) {
          product.mainImage = mainImageSrc.replace(/._.*_\./, '._AC_SL1500_.');
          images.push(product.mainImage);
        }
      }
      
      // Additional images from thumbnail strip
      document.querySelectorAll('#altImages img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.includes('play-icon') && !src.includes('video-thumb')) {
          const hiResSrc = src.replace(/._.*_\./, '._AC_SL1500_.');
          if (!images.includes(hiResSrc)) {
            images.push(hiResSrc);
          }
        }
      });
      product.images = images.slice(0, 6);
      
      // Feature bullets
      const bullets = [];
      document.querySelectorAll('#feature-bullets li span.a-list-item').forEach(li => {
        const text = li.textContent.trim();
        if (text && text.length > 10) {
          bullets.push(text);
        }
      });
      product.featureBullets = bullets;
      
      // Description
      const descEl = document.querySelector('#productDescription p, #feature-bullets + div');
      product.description = descEl ? descEl.textContent.trim().substring(0, 500) : '';
      
      // Product details
      const details = {};
      document.querySelectorAll('#productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li').forEach(row => {
        const labelEl = row.querySelector('th, .a-text-bold');
        const valueEl = row.querySelector('td, span:not(.a-text-bold)');
        if (labelEl && valueEl) {
          const label = labelEl.textContent.trim().replace(':', '');
          const value = valueEl.textContent.trim();
          if (label && value) {
            details[label] = value;
          }
        }
      });
      if (Object.keys(details).length > 0) {
        product.productDetails = details;
      }
      
      // Breadcrumbs
      const breadcrumbs = [];
      document.querySelectorAll('#wayfinding-breadcrumbs_feature_div a').forEach(a => {
        breadcrumbs.push(a.textContent.trim());
      });
      if (breadcrumbs.length > 0) {
        product.breadcrumbs = breadcrumbs;
      }
      
      // Seller
      const sellerEl = document.querySelector('#sellerProfileTriggerId, #merchant-info');
      if (sellerEl) {
        product.seller = {
          name: sellerEl.textContent.trim(),
          fulfilledByAmazon: document.body.textContent.includes('Fulfillment by Amazon')
        };
      }
      
      // Variants (size/color options)
      const variants = [];
      document.querySelectorAll('#variation_size_name li, #variation_color_name li').forEach(li => {
        const variantData = li.getAttribute('data-defaultasin');
        const variantText = li.textContent.trim();
        if (variantData && variantText) {
          variants.push({
            asin: variantData,
            option: variantText
          });
        }
      });
      if (variants.length > 0) {
        product.variants = variants.slice(0, 5);
      }
      
    } catch (err) {
      console.error('Error extracting product data:', err);
    }
    
    return product;
  }, domain, asin);
}

module.exports = amazonScraperV2;
