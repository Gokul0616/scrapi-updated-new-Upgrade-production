# Scrapers package

# Add parent directory to Python path to enable imports of base_scraper, scraper_engine, proxy_manager
import sys
import os

# Get the parent directory (scraper-service)
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)