import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Bookmark, Play, Database } from 'lucide-react';
import api from '../services/api';

export function SavedTasks() {
  const navigate = useNavigate();
  const [savedTasks, setSavedTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Placeholder - saved tasks feature coming soon
    setLoading(false);
  }, []);

  const filteredTasks = savedTasks.filter(task =>
    task.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Saved Tasks"
        actions={
          <Button variant="outline" onClick={() => navigate('/scraped-data')}>
            View Scraped Data
          </Button>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="ml-auto text-sm font-medium">
            {filteredTasks.length} Saved Tasks
          </div>
        </div>
        
        {/* Saved Tasks Content */}
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Bookmark className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Save your scraping tasks</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Save your scraping configurations and queries to quickly run them again later. 
                  This feature is coming soon!
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/store">
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Browse Scrapers
                  </Button>
                </Link>
                <Link to="/scraped-data">
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    View Scraped Data
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
