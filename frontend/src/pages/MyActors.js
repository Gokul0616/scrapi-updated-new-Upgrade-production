import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Code, Star, Users, Plus, Loader2 } from 'lucide-react';
import api from '../services/api';

export function MyActors() {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyActors();
  }, []);

  const fetchMyActors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/actors?myActors=true');
      setActors(response.data);
    } catch (error) {
      console.error('Error fetching my actors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="My Actors"
        actions={
          <div className="flex gap-2">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Actor
            </Button>
          </div>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : actors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Code className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No actors yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Create your own actors to automate tasks, scrape websites, or build custom workflows.
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Actor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actors.map((actor) => (
              <Link key={actor.actorId} to={`/actors/${actor.actorId}`}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl">{actor.icon || '📦'}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{actor.name}</h3>
                        <p className="text-xs text-muted-foreground">{actor.author}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {actor.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{actor.stats.runs.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{actor.stats.rating}</span>
                      </div>
                      <Badge variant="secondary" className="ml-auto">
                        Private
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
