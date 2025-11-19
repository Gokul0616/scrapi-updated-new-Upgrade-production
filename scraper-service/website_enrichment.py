"""
Website Enrichment Module
--------------------------
Universal module to extract contact details and social media links from any website.
This can be used by all scrapers (Google Maps, Amazon, Instagram, etc.)

Features:
- Extract emails (multiple strategies)
- Extract phone numbers (international formats)
- Extract social media links (Facebook, Instagram, Twitter, LinkedIn, YouTube, TikTok, Pinterest, etc.)
- Extract physical addresses
- Check common pages (Contact, About, Footer)
- Smart filtering to avoid spam/generic emails
"""

import re
import logging
from typing import Dict, List, Optional, Set, Any
from bs4 import BeautifulSoup
import aiohttp
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)


class WebsiteEnrichment:
    """Extract contact details and social media from websites."""
    
    def __init__(self):
        # Email regex pattern
        self.email_pattern = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        )
        
        # Phone number patterns (multiple formats)
        self.phone_patterns = [
            re.compile(r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}'),  # International
            re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'),  # US format
            re.compile(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'),  # Simple format
            re.compile(r'\+\d{1,3}\s?\d{1,14}'),  # E.164 format
        ]
        
        # Social media patterns with enhanced matching
        self.social_patterns = {
            'facebook': re.compile(r'(?:https?://)?(?:www\.)?(?:facebook|fb)\.com/(?:pages/)?([a-zA-Z0-9._-]+)/?', re.I),
            'instagram': re.compile(r'(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9._]+)/?', re.I),
            'twitter': re.compile(r'(?:https?://)?(?:www\.)?(?:twitter|x)\.com/([a-zA-Z0-9_]+)/?', re.I),
            'linkedin': re.compile(r'(?:https?://)?(?:www\.)?linkedin\.com/(?:company|in|profile)/([a-zA-Z0-9-]+)/?', re.I),
            'youtube': re.compile(r'(?:https?://)?(?:www\.)?youtube\.com/(?:channel|c|user|@)/([a-zA-Z0-9_-]+)/?', re.I),
            'tiktok': re.compile(r'(?:https?://)?(?:www\.)?tiktok\.com/@([a-zA-Z0-9._]+)/?', re.I),
            'pinterest': re.compile(r'(?:https?://)?(?:www\.)?pinterest\.com/([a-zA-Z0-9_]+)/?', re.I),
            'snapchat': re.compile(r'(?:https?://)?(?:www\.)?snapchat\.com/add/([a-zA-Z0-9._-]+)/?', re.I),
            'whatsapp': re.compile(r'(?:https?://)?(?:wa\.me|api\.whatsapp\.com)/(\d+)', re.I),
            'telegram': re.compile(r'(?:https?://)?(?:t\.me|telegram\.me)/([a-zA-Z0-9_]+)/?', re.I),
        }
        
        # Common contact page paths
        self.contact_paths = [
            '/contact',
            '/contact-us',
            '/contactus',
            '/about',
            '/about-us',
            '/aboutus',
            '/get-in-touch',
            '/reach-us',
            '/support',
            '/help'
        ]
        
        # Generic/spam email patterns to exclude
        self.excluded_email_patterns = [
            'example.com',
            'yourdomain.com',
            'domain.com',
            'test.com',
            'email.com',
            'noreply',
            'no-reply',
            'donotreply',
            'privacy@',
            'legal@',
            'abuse@',
            'postmaster@',
            'admin@',
            'webmaster@',
            'info@example',
            'contact@example',
            'support@example'
        ]
    
    async def enrich_from_website(
        self, 
        website_url: str, 
        check_contact_page: bool = True,
        timeout: int = 10
    ) -> Dict[str, Any]:
        """
        Main method to extract all contact details from a website.
        
        Args:
            website_url: The website URL to scrape
            check_contact_page: Whether to check contact/about pages
            timeout: Request timeout in seconds
        
        Returns:
            Dictionary with extracted data:
            {
                'emails': ['email1@domain.com', 'email2@domain.com'],
                'phones': ['+1-234-567-8900', '987-654-3210'],
                'socialMedia': {
                    'facebook': 'https://facebook.com/page',
                    'instagram': 'https://instagram.com/profile',
                    ...
                },
                'contactPageUrl': 'https://example.com/contact',
                'addresses': ['123 Main St, City, State']
            }
        """
        enrichment_data = {
            'emails': [],
            'phones': [],
            'socialMedia': {},
            'contactPageUrl': None,
            'addresses': []
        }
        
        if not website_url:
            return enrichment_data
        
        try:
            # 1. Extract from main page
            main_page_data = await self._extract_from_page(website_url, timeout)
            self._merge_data(enrichment_data, main_page_data)
            
            # 2. Try to find and check contact page
            if check_contact_page:
                contact_page_url = await self._find_contact_page(website_url, timeout)
                if contact_page_url:
                    enrichment_data['contactPageUrl'] = contact_page_url
                    contact_data = await self._extract_from_page(contact_page_url, timeout)
                    self._merge_data(enrichment_data, contact_data)
            
            # 3. Clean and deduplicate
            enrichment_data['emails'] = list(set(enrichment_data['emails']))[:5]  # Max 5 emails
            enrichment_data['phones'] = list(set(enrichment_data['phones']))[:5]  # Max 5 phones
            enrichment_data['addresses'] = list(set(enrichment_data['addresses']))[:3]  # Max 3 addresses
            
            logger.info(f"✅ Enriched {website_url}: {len(enrichment_data['emails'])} emails, {len(enrichment_data['phones'])} phones, {len(enrichment_data['socialMedia'])} social links")
            
        except Exception as e:
            logger.debug(f"Website enrichment error for {website_url}: {str(e)}")
        
        return enrichment_data
    
    async def _extract_from_page(self, url: str, timeout: int) -> Dict[str, Any]:
        """Extract all contact data from a single page."""
        data = {
            'emails': [],
            'phones': [],
            'socialMedia': {},
            'addresses': []
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
                
                async with session.get(
                    url, 
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=timeout),
                    allow_redirects=True
                ) as response:
                    if response.status != 200:
                        return data
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract emails
                    data['emails'] = self._extract_emails(soup, html)
                    
                    # Extract phone numbers
                    data['phones'] = self._extract_phones(soup, html)
                    
                    # Extract social media links
                    data['socialMedia'] = self._extract_social_media(soup, html, url)
                    
                    # Extract addresses
                    data['addresses'] = self._extract_addresses(soup)
        
        except Exception as e:
            logger.debug(f"Error extracting from {url}: {str(e)}")
        
        return data
    
    def _extract_emails(self, soup: BeautifulSoup, html: str) -> List[str]:
        """Extract email addresses from page."""
        emails = set()
        
        # 1. Find mailto: links
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            if href.startswith('mailto:'):
                email = href.replace('mailto:', '').split('?')[0].strip()
                if self._is_valid_email(email):
                    emails.add(email.lower())
        
        # 2. Search in visible text
        text_content = soup.get_text()
        found_emails = self.email_pattern.findall(text_content)
        for email in found_emails:
            if self._is_valid_email(email) and self._is_business_email(email):
                emails.add(email.lower())
        
        # 3. Search in HTML source (sometimes emails are obfuscated)
        source_emails = self.email_pattern.findall(html)
        for email in source_emails:
            if self._is_valid_email(email) and self._is_business_email(email):
                emails.add(email.lower())
        
        # 4. Check common contact sections (footer, header, contact form)
        for section in soup.find_all(['footer', 'header', 'div'], class_=re.compile(r'contact|footer|header', re.I)):
            section_text = section.get_text()
            section_emails = self.email_pattern.findall(section_text)
            for email in section_emails:
                if self._is_valid_email(email) and self._is_business_email(email):
                    emails.add(email.lower())
        
        return list(emails)
    
    def _extract_phones(self, soup: BeautifulSoup, html: str) -> List[str]:
        """Extract phone numbers from page."""
        phones = set()
        
        # 1. Find tel: links
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            if href.startswith('tel:'):
                phone = href.replace('tel:', '').strip()
                phone = self._clean_phone(phone)
                if phone and len(phone) >= 10:
                    phones.add(phone)
        
        # 2. Search in visible text
        text_content = soup.get_text()
        for pattern in self.phone_patterns:
            found_phones = pattern.findall(text_content)
            for phone in found_phones:
                phone = self._clean_phone(phone)
                if phone and len(phone) >= 10:
                    phones.add(phone)
        
        # 3. Check contact sections specifically
        for section in soup.find_all(['footer', 'header', 'div'], class_=re.compile(r'contact|phone|tel|call', re.I)):
            section_text = section.get_text()
            for pattern in self.phone_patterns:
                found_phones = pattern.findall(section_text)
                for phone in found_phones:
                    phone = self._clean_phone(phone)
                    if phone and len(phone) >= 10:
                        phones.add(phone)
        
        return list(phones)[:5]  # Limit to 5 phone numbers
    
    def _extract_social_media(self, soup: BeautifulSoup, html: str, base_url: str) -> Dict[str, str]:
        """Extract social media profile links."""
        social_links = {}
        
        # Search in all links
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            
            # Convert relative URLs to absolute
            if href.startswith('/'):
                href = urljoin(base_url, href)
            
            # Check against each social media pattern
            for platform, pattern in self.social_patterns.items():
                if platform not in social_links:
                    match = pattern.search(href)
                    if match:
                        # Normalize URL
                        if not href.startswith('http'):
                            href = 'https://' + href
                        social_links[platform] = href
        
        # Also search in raw HTML (sometimes links are in JavaScript)
        for platform, pattern in self.social_patterns.items():
            if platform not in social_links:
                matches = pattern.findall(html)
                if matches:
                    url = matches[0] if isinstance(matches[0], str) else f"https://{platform}.com/{matches[0]}"
                    if not url.startswith('http'):
                        url = 'https://' + url
                    social_links[platform] = url
        
        return social_links
    
    def _extract_addresses(self, soup: BeautifulSoup) -> List[str]:
        """Extract physical addresses from page."""
        addresses = set()
        
        # Look for address tags and sections
        for tag in soup.find_all(['address', 'div', 'p'], class_=re.compile(r'address|location|office', re.I)):
            text = tag.get_text(separator=' ', strip=True)
            # Basic address detection (has street number, street name, and zip code pattern)
            if re.search(r'\d{1,5}\s+\w+', text) and re.search(r'\d{5}', text):
                addresses.add(text[:200])  # Limit length
        
        # Look for structured data (schema.org)
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                import json
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if 'address' in data:
                        addr = data['address']
                        if isinstance(addr, dict):
                            street = addr.get('streetAddress', '')
                            city = addr.get('addressLocality', '')
                            state = addr.get('addressRegion', '')
                            zip_code = addr.get('postalCode', '')
                            full_address = f"{street}, {city}, {state} {zip_code}".strip(', ')
                            if full_address:
                                addresses.add(full_address)
            except:
                pass
        
        return list(addresses)[:3]  # Limit to 3 addresses
    
    async def _find_contact_page(self, base_url: str, timeout: int) -> Optional[str]:
        """Try to find a contact page on the website."""
        parsed_base = urlparse(base_url)
        base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
        
        # Try common contact page paths
        for path in self.contact_paths:
            contact_url = base_domain + path
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                    async with session.head(
                        contact_url, 
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=5),
                        allow_redirects=True
                    ) as response:
                        if response.status == 200:
                            logger.info(f"Found contact page: {contact_url}")
                            return contact_url
            except:
                continue
        
        # If not found via direct paths, try to find link on homepage
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                async with session.get(
                    base_url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Look for contact links
                        for a_tag in soup.find_all('a', href=True):
                            text = a_tag.get_text().lower()
                            href = a_tag['href']
                            
                            if any(keyword in text for keyword in ['contact', 'about', 'reach', 'touch']):
                                # Convert to absolute URL
                                if href.startswith('/'):
                                    return urljoin(base_url, href)
                                elif href.startswith('http'):
                                    return href
        except:
            pass
        
        return None
    
    def _is_valid_email(self, email: str) -> bool:
        """Check if email format is valid."""
        if not email or len(email) < 5:
            return False
        
        # Must have @ and domain
        if '@' not in email or '.' not in email.split('@')[1]:
            return False
        
        # Check if it's not too long
        if len(email) > 100:
            return False
        
        return True
    
    def _is_business_email(self, email: str) -> bool:
        """Check if email is likely a business email (not spam/generic)."""
        email_lower = email.lower()
        
        # Check against excluded patterns
        for pattern in self.excluded_email_patterns:
            if pattern in email_lower:
                return False
        
        # Avoid common spam TLDs
        spam_tlds = ['.tk', '.ml', '.ga', '.cf', '.gq']
        if any(email_lower.endswith(tld) for tld in spam_tlds):
            return False
        
        return True
    
    def _clean_phone(self, phone: str) -> str:
        """Clean and format phone number."""
        # Remove common separators but keep the structure
        phone = phone.strip()
        # Remove extra spaces
        phone = ' '.join(phone.split())
        return phone
    
    def _merge_data(self, target: Dict[str, Any], source: Dict[str, Any]) -> None:
        """Merge source data into target data."""
        # Merge emails
        if 'emails' in source:
            target['emails'].extend(source['emails'])
        
        # Merge phones
        if 'phones' in source:
            target['phones'].extend(source['phones'])
        
        # Merge social media (source takes precedence for new platforms)
        if 'socialMedia' in source:
            for platform, url in source['socialMedia'].items():
                if platform not in target['socialMedia']:
                    target['socialMedia'][platform] = url
        
        # Merge addresses
        if 'addresses' in source:
            target['addresses'].extend(source['addresses'])
        
        # Update contact page URL if found
        if 'contactPageUrl' in source and source['contactPageUrl']:
            target['contactPageUrl'] = source['contactPageUrl']


# Singleton instance for easy import
enrichment_service = WebsiteEnrichment()
