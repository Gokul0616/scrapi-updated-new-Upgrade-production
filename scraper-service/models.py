"""Pydantic models for scraper service"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


# Proxy Models
class Proxy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: str = "http"  # http, https, socks5
    is_active: bool = True
    success_count: int = 0
    failure_count: int = 0
    last_used: Optional[datetime] = None
    last_check: Optional[datetime] = None
    response_time: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        """Convert to dictionary for ProxyManager compatibility"""
        return {
            'id': self.id,
            'host': self.host,
            'port': str(self.port),
            'username': self.username,
            'password': self.password,
            'protocol': self.protocol,
            'is_active': self.is_active,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'response_time': self.response_time
        }
    
    def get_url(self) -> str:
        """Get proxy URL in standard format"""
        if self.username and self.password:
            return f"{self.protocol}://{self.username}:{self.password}@{self.host}:{self.port}"
        else:
            return f"{self.protocol}://{self.host}:{self.port}"
    
    def get_success_rate(self) -> float:
        """Calculate proxy success rate"""
        total = self.success_count + self.failure_count
        if total == 0:
            return 0.0
        return (self.success_count / total) * 100


class ProxyCreate(BaseModel):
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: str = "http"


class ProxyUpdate(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: Optional[str] = None
    is_active: Optional[bool] = None


class ProxyStats(BaseModel):
    """Statistics for a proxy"""
    id: str
    host: str
    port: int
    is_active: bool
    success_rate: float
    success_count: int
    failure_count: int
    response_time: Optional[float]
    last_used: Optional[datetime]
