import requests
from bs4 import BeautifulSoup
import time

def scrape_amazon(input_data):
    """
    Amazon scraper using requests + BeautifulSoup (lightweight)
    """
    query = input_data.get('query', '')
    domain = input_data.get('domain', 'amazon.com')
    max_results = input_data.get('maxResults', 10)
    
    if not query:
        return {'error': 'Query is required'}
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    try:
        # Search URL
        search_url = f"https://www.{domain}/s?k={query.replace(' ', '+')}"
        
        response = requests.get(search_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find product containers
        products = soup.select('div[data-component-type="s-search-result"]')[:max_results]
        
        results = []
        for product in products:
            try:
                product_data = {}
                
                # ASIN
                product_data['asin'] = product.get('data-asin', '')
                
                # Title
                title_elem = product.select_one('h2 a span')
                product_data['title'] = title_elem.text.strip() if title_elem else None
                
                # Price
                price_elem = product.select_one('span.a-price span.a-offscreen')
                product_data['price'] = price_elem.text.strip() if price_elem else None
                
                # Rating
                rating_elem = product.select_one('span.a-icon-alt')
                if rating_elem:
                    rating_text = rating_elem.text.strip()
                    product_data['stars'] = rating_text.split()[0] if rating_text else None
                
                # Reviews count
                reviews_elem = product.select_one('span[aria-label*="rating"]')
                product_data['reviewsCount'] = reviews_elem.text.strip() if reviews_elem else None
                
                # Image
                img_elem = product.select_one('img.s-image')
                product_data['imageUrl'] = img_elem.get('src') if img_elem else None
                
                # Product URL
                link_elem = product.select_one('h2 a')
                if link_elem:
                    product_data['url'] = f"https://www.{domain}{link_elem.get('href')}"
                
                # Timestamp
                product_data['scrapedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
                
                results.append(product_data)
                
            except Exception as e:
                print(f"Error parsing product: {str(e)}")
                continue
        
        return {
            'query': query,
            'domain': domain,
            'resultsCount': len(results),
            'results': results
        }
        
    except Exception as e:
        return {
            'error': f'Scraping failed: {str(e)}',
            'query': query
        }