"""Proxy Manager - Handles proxy rotation for scrapers"""
import random
from typing import Optional, Dict, List
from datetime import datetime, timezone
import logging
import asyncio
import aiohttp
from models import Proxy, ProxyCreate, ProxyStats

logger = logging.getLogger(__name__)


class ProxyManager:
    """Manages proxy rotation for web scraping with health checking"""
    
    def __init__(self):
        self.proxies: List[Proxy] = []
        logger.info("ProxyManager initialized (no proxies configured)")
    
    async def get_rotating_proxy(self, quality: str = "best") -> Optional[Dict[str, str]]:
        """
        Get a rotating proxy based on quality preference.
        Returns None if no proxies configured (direct connection will be used).
        
        Quality options:
        - "best": Highest success rate and lowest response time
        - "random": Random active proxy
        - "round-robin": Sequential rotation
        """
        if not self.proxies:
            logger.debug("No proxies configured, using direct connection")
            return None
        
        # Filter active proxies
        active_proxies = [p for p in self.proxies if p.is_active]
        
        if not active_proxies:
            logger.warning("No active proxies available")
            return None
        
        # Select proxy based on quality preference
        if quality == "best":
            # Sort by success rate and response time
            proxy = max(
                active_proxies,
                key=lambda p: (p.get_success_rate(), -p.response_time if p.response_time else 0)
            )
        elif quality == "round-robin":
            # Use least recently used
            proxy = min(
                active_proxies,
                key=lambda p: p.last_used or datetime.min.replace(tzinfo=timezone.utc)
            )
        else:  # random
            proxy = random.choice(active_proxies)
        
        # Update last used timestamp
        proxy.last_used = datetime.now(timezone.utc)
        
        logger.debug(f"Selected proxy: {proxy.host}:{proxy.port} (success rate: {proxy.get_success_rate():.1f}%)")
        return proxy.to_dict()
    
    def format_proxy_url(self, proxy_dict: Dict[str, str]) -> str:
        """
        Format proxy dictionary to URL string.
        Expected format: {host, port, username, password, protocol}
        """
        if not proxy_dict:
            return ""
        
        host = proxy_dict.get('host', '')
        port = proxy_dict.get('port', '')
        username = proxy_dict.get('username')
        password = proxy_dict.get('password')
        protocol = proxy_dict.get('protocol', 'http')
        
        if username and password:
            return f"{protocol}://{username}:{password}@{host}:{port}"
        else:
            return f"{protocol}://{host}:{port}"
    
    def add_proxy(self, proxy_data: ProxyCreate) -> Proxy:
        """Add a proxy to the pool"""
        proxy = Proxy(
            host=proxy_data.host,
            port=proxy_data.port,
            username=proxy_data.username,
            password=proxy_data.password,
            protocol=proxy_data.protocol
        )
        self.proxies.append(proxy)
        logger.info(f"Added proxy: {proxy.host}:{proxy.port}")
        return proxy
    
    def remove_proxy(self, proxy_id: str) -> bool:
        """Remove a proxy from the pool"""
        initial_count = len(self.proxies)
        self.proxies = [p for p in self.proxies if p.id != proxy_id]
        removed = len(self.proxies) < initial_count
        
        if removed:
            logger.info(f"Removed proxy: {proxy_id}")
        
        return removed
    
    def get_proxy(self, proxy_id: str) -> Optional[Proxy]:
        """Get a specific proxy by ID"""
        for proxy in self.proxies:
            if proxy.id == proxy_id:
                return proxy
        return None
    
    def get_all_proxies(self) -> List[Proxy]:
        """Get all proxies"""
        return self.proxies
    
    def get_proxy_stats(self) -> List[ProxyStats]:
        """Get statistics for all proxies"""
        return [
            ProxyStats(
                id=p.id,
                host=p.host,
                port=p.port,
                is_active=p.is_active,
                success_rate=p.get_success_rate(),
                success_count=p.success_count,
                failure_count=p.failure_count,
                response_time=p.response_time,
                last_used=p.last_used
            )
            for p in self.proxies
        ]
    
    async def check_proxy_health(self, proxy: Proxy, test_url: str = "https://httpbin.org/ip") -> bool:
        """
        Check if a proxy is working by making a test request.
        Updates proxy stats based on result.
        """
        start_time = datetime.now(timezone.utc)
        
        try:
            proxy_url = proxy.get_url()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    test_url,
                    proxy=proxy_url,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        # Calculate response time
                        end_time = datetime.now(timezone.utc)
                        response_time = (end_time - start_time).total_seconds()
                        
                        # Update proxy stats
                        proxy.success_count += 1
                        proxy.response_time = response_time
                        proxy.last_check = datetime.now(timezone.utc)
                        proxy.is_active = True
                        
                        logger.info(f"✅ Proxy {proxy.host}:{proxy.port} is healthy (response time: {response_time:.2f}s)")
                        return True
                    else:
                        raise Exception(f"HTTP {response.status}")
        
        except Exception as e:
            # Update proxy stats
            proxy.failure_count += 1
            proxy.last_check = datetime.now(timezone.utc)
            
            # Deactivate proxy if failure rate is too high
            if proxy.get_success_rate() < 50 and (proxy.success_count + proxy.failure_count) > 10:
                proxy.is_active = False
                logger.warning(f"❌ Proxy {proxy.host}:{proxy.port} deactivated due to low success rate")
            
            logger.error(f"❌ Proxy {proxy.host}:{proxy.port} health check failed: {str(e)}")
            return False
    
    async def check_all_proxies(self, test_url: str = "https://httpbin.org/ip"):
        """Check health of all proxies"""
        logger.info(f"Checking health of {len(self.proxies)} proxies...")
        
        tasks = [self.check_proxy_health(proxy, test_url) for proxy in self.proxies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        healthy = sum(1 for r in results if r is True)
        logger.info(f"Health check complete: {healthy}/{len(self.proxies)} proxies healthy")
    
    def mark_proxy_success(self, proxy_id: str):
        """Mark a proxy as successfully used"""
        proxy = self.get_proxy(proxy_id)
        if proxy:
            proxy.success_count += 1
            proxy.last_used = datetime.now(timezone.utc)
    
    def mark_proxy_failure(self, proxy_id: str):
        """Mark a proxy as failed"""
        proxy = self.get_proxy(proxy_id)
        if proxy:
            proxy.failure_count += 1
            
            # Deactivate if failure rate is too high
            if proxy.get_success_rate() < 50 and (proxy.success_count + proxy.failure_count) > 10:
                proxy.is_active = False
                logger.warning(f"Proxy {proxy.host}:{proxy.port} deactivated due to low success rate")
