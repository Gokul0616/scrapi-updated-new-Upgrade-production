import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Star, Users, Search, MapPin, Package, Instagram, Twitter, Facebook, Music, Globe, Linkedin, Bookmark } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';


export function Store() {
  const [actors, setActors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [bookmarkedActors, setBookmarkedActors] = useState([]);
  
  const categories = [
    'Social media', 'AI', 'Agents', 'Lead generation', 'E-commerce',
    'SEO tools', 'Jobs', 'MCP servers', 'News', 'Real estate',
    'Developer tools', 'Travel', 'Videos', 'Automation', 'Integrations',
    'Open source', 'Other'
  ];
  
  useEffect(() => {
    fetchActors();
    fetchUserBookmarks();
  }, []);
  
  const fetchActors = async () => {
    try {
      const response = await api.get('/api/actors');
      setActors(response.data);
    } catch (error) {
      console.error('Error fetching actors:', error);
      toast.error(error.response?.data?.error || 'Failed to load actors');
    }
  };
  
  const fetchUserBookmarks = async () => {
    try {
      const response = await api.get('/api/actors?userActors=true');
      const bookmarked = response.data
        .filter(actor => actor.isBookmarkedByUser)
        .map(actor => actor.actorId);
      setBookmarkedActors(bookmarked);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error(error.response?.data?.error || 'Failed to load bookmarks');
    }
  };
  
  const toggleBookmark = async (actorId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await api.patch(`/api/actors/${actorId}/bookmark`);
      // Update local state
      if (bookmarkedActors.includes(actorId)) {
        setBookmarkedActors(bookmarkedActors.filter(id => id !== actorId));
        toast.success('Bookmark removed');
      } else {
        setBookmarkedActors([...bookmarkedActors, actorId]);
        toast.success('Actor bookmarked');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error(error.response?.data?.error || 'Failed to update bookmark');
    }
  };
  
  const filteredActors = actors.filter(actor => {
    const matchesSearch = actor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || actor.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const getActorIcon = (actorId) => {
    const icons = {
      'google-maps': <MapPin className="h-6 w-6" />,
      'amazon': <Package className="h-6 w-6" />,
      'instagram': <Instagram className="h-6 w-6" />,
      'twitter': <Twitter className="h-6 w-6" />,
      'facebook': <Facebook className="h-6 w-6" />,
      'tiktok': <Music className="h-6 w-6" />,
      'website': <Globe className="h-6 w-6" />,
      'linkedin': <Linkedin className="h-6 w-6" />
    };
    return icons[actorId] || <Globe className="h-6 w-6" />;
  };
  
  return (
    <div className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20">
      <Header title="Scrapi Store" />
      
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold">Scrapi Store</h1>
          <p className="text-lg text-muted-foreground">
            Discover thousands of web scraping actors
          </p>
          
          {/* Search */}
          <div className="max-w-2xl mx-auto mt-8">
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for Actors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg"
              />
            </div>
          </div>
        </div>
        
        {/* Categories */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="rounded-full"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
        
        {/* All Actors Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">All Actors</h2>
            <Link to="/actors">
              <Button variant="ghost">View all →</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {filteredActors.map((actor) => (
              <Link to={`/actors/${actor.actorId}`} key={actor.actorId}>
                <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                  <CardContent className="p-6 relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 z-10"
                      onClick={(e) => toggleBookmark(actor.actorId, e)}
                    >
                      <Bookmark 
                        className={`h-4 w-4 ${bookmarkedActors.includes(actor.actorId) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
                      />
                    </Button>
                    
                    <div className="flex items-start gap-4 mb-4">
                      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getActorIcon(actor.actorId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 truncate">{actor.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{actor.slug}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[60px]">
                      {actor.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <span className="text-xs font-bold">{actor.author.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-muted-foreground">{actor.author}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{(actor.stats.runs / 1000).toFixed(0)}K</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span>{actor.stats.rating} ({actor.stats.reviews})</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          
          {filteredActors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No actors found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
