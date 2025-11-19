import requests
from bs4 import BeautifulSoup
import time
import asyncio
import sys
import os

# Add parent directory for imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from website_enrichment import enrichment_service

def scrape_website(input_data):
    """
    Generic website scraper using requests + BeautifulSoup
    Now enhanced with automatic contact detail extraction!
    """
    url = input_data.get('url', '')
    selectors = input_data.get('selectors', {})
    extract_contacts = input_data.get('extractContacts', True)  # New option
    
    if not url:
        return {'error': 'URL is required'}
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        result = {
            'url': url,
            'title': soup.title.string if soup.title else None,
            'scrapedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }
        
        # Extract text content
        result['text'] = soup.get_text(separator=' ', strip=True)[:5000]
        
        # Extract links
        links = [a.get('href') for a in soup.find_all('a', href=True)]
        result['links'] = links[:50]
        
        # Extract images
        images = [img.get('src') for img in soup.find_all('img', src=True)]
        result['images'] = images[:20]
        
        # Custom selectors
        if selectors:
            result['customData'] = {}
            for key, selector in selectors.items():
                elements = soup.select(selector)
                result['customData'][key] = [elem.text.strip() for elem in elements]
        
        # 🌐 NEW: Extract contact details and social media automatically
        if extract_contacts:
            try:
                # Run async enrichment in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                enrichment_data = loop.run_until_complete(
                    enrichment_service.enrich_from_website(url, check_contact_page=True, timeout=10)
                )
                loop.close()
                
                # Add enriched data to results
                if enrichment_data.get('emails'):
                    result['emails'] = enrichment_data['emails']
                if enrichment_data.get('phones'):
                    result['phones'] = enrichment_data['phones']
                if enrichment_data.get('socialMedia'):
                    result['socialMedia'] = enrichment_data['socialMedia']
                if enrichment_data.get('contactPageUrl'):
                    result['contactPageUrl'] = enrichment_data['contactPageUrl']
                if enrichment_data.get('addresses'):
                    result['addresses'] = enrichment_data['addresses']
                
                print(f"✅ Website enriched: {len(enrichment_data.get('emails', []))} emails, {len(enrichment_data.get('socialMedia', {}))} social links")
            except Exception as e:
                print(f"⚠️ Contact extraction failed: {str(e)}")
                # Don't fail the whole scrape if enrichment fails
        
        return result
        
    except Exception as e:
        return {
            'error': f'Scraping failed: {str(e)}',
            'url': url
        }