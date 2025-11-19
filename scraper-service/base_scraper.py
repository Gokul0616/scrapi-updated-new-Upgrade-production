"""
Base Scraper Interface - Foundation for all scrapers in the platform.
All scrapers must inherit from this class to ensure consistency.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable
from scraper_engine import ScraperEngine
import logging

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """
    Abstract base class for all scrapers.
    
    Provides:
    - Standard interface for scraping operations
    - Progress callback support
    - Error handling
    - Metadata about scraper capabilities
    """
    
    def __init__(self, scraper_engine: ScraperEngine):
        self.engine = scraper_engine
        self.name = self.get_name()
        self.description = self.get_description()
        self.category = self.get_category()
        self.icon = self.get_icon()
        
    @abstractmethod
    async def scrape(self, config: Dict[str, Any], progress_callback: Optional[Callable] = None) -> List[Dict[str, Any]]:
        """
        Main scraping method that must be implemented by all scrapers.
        
        Args:
            config: Dictionary with scraper-specific configuration
            progress_callback: Optional async function to report progress
            
        Returns:
            List of dictionaries containing scraped data
        """
        pass
    
    @abstractmethod
    def get_input_schema(self) -> Dict[str, Any]:
        """
        Return the input schema for this scraper.
        Defines what parameters the scraper accepts.
        """
        pass
    
    @abstractmethod
    def get_output_schema(self) -> Dict[str, Any]:
        """
        Return the output schema for this scraper.
        Defines what fields the scraper returns.
        """
        pass
    
    @classmethod
    @abstractmethod
    def get_name(cls) -> str:
        """Return the display name of the scraper."""
        pass
    
    @classmethod
    @abstractmethod
    def get_description(cls) -> str:
        """Return a description of what the scraper does."""
        pass
    
    @classmethod
    @abstractmethod
    def get_category(cls) -> str:
        """Return the category (e.g., 'E-commerce', 'Social Media')."""
        pass
    
    @classmethod
    @abstractmethod
    def get_icon(cls) -> str:
        """Return an emoji icon for the scraper."""
        pass
    
    @classmethod
    def get_tags(cls) -> List[str]:
        """Return tags for searchability. Override to customize."""
        return []
    
    @classmethod
    def is_premium(cls) -> bool:
        """Return whether this is a premium scraper. Override to customize."""
        return False
    
    async def validate_config(self, config: Dict[str, Any]) -> bool:
        """
        Validate the configuration before scraping.
        Override to add custom validation.
        """
        return True
    
    async def _log_progress(self, message: str, progress_callback: Optional[Callable] = None):
        """Helper to log progress both to logger and callback."""
        logger.info(f"{self.name}: {message}")
        if progress_callback:
            try:
                await progress_callback(message)
            except Exception as e:
                logger.error(f"Progress callback error: {e}")
