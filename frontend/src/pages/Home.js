import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Star, Users, MapPin, Package, Instagram, Twitter, Facebook, Play } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';


export function Home() {
  const { user } = useAuth();
  const [actors, setActors] = useState([]);
  const [runs, setRuns] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [showSuggestedActors, setShowSuggestedActors] = useState(true);
  const [activeRunsTab, setActiveRunsTab] = useState('recent'); // recent or scheduled
  
  useEffect(() => {
    fetchActors();
    fetchRuns();
    loadRecentlyViewed();
    loadSuggestedActorsPreference();
  }, []);
  
  useEffect(() => {
    fetchRuns();
  }, [activeRunsTab]);
  
  const fetchActors = async () => {
    try {
      const response = await api.get('/api/actors');
      setActors(response.data.slice(0, 4));
    } catch (error) {
      console.error('Error fetching actors:', error);
      toast.error(error.response?.data?.error || 'Failed to load actors');
    }
  };
  
  const fetchRuns = async () => {
    try {
      const endpoint = activeRunsTab === 'scheduled' 
        ? '/api/runs?limit=3&scheduled=true' 
        : '/api/runs?limit=3';
      const response = await api.get(endpoint);
      setRuns(response.data.runs || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
      toast.error(error.response?.data?.error || 'Failed to load runs');
    }
  };
  
  const loadRecentlyViewed = () => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    setRecentlyViewed(viewed.slice(0, 4));
  };
  
  const loadSuggestedActorsPreference = () => {
    const preference = localStorage.getItem('showSuggestedActors');
    if (preference !== null) {
      setShowSuggestedActors(preference === 'true');
    }
  };
  
  const handleHideSuggestedActors = () => {
    setShowSuggestedActors(false);
    localStorage.setItem('showSuggestedActors', 'false');
  };
  
  const handleShowSuggestedActors = () => {
    setShowSuggestedActors(true);
    localStorage.setItem('showSuggestedActors', 'true');
  };
  
  const getActorIcon = (actorId) => {
    const icons = {
      'google-maps': <MapPin className="h-5 w-5" />,
      'amazon': <Package className="h-5 w-5" />,
      'instagram': <Instagram className="h-5 w-5" />,
      'twitter': <Twitter className="h-5 w-5" />,
      'facebook': <Facebook className="h-5 w-5" />
    };
    return icons[actorId] || <Play className="h-5 w-5" />;
  };
  
  return (
    <div className="flex-1 overflow-auto">
      <Header title="Scrapi Console" />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* User Info Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-purple-600">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{user?.fullName || 'User'}</h2>
                    <p className="text-sm text-muted-foreground">{user?.username} • {user?.email}</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400">
                    {user?.plan || 'Free'} plan
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Recently Viewed */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Recently viewed</h3>
          {recentlyViewed.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {recentlyViewed.map((item, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getActorIcon(item.actorId)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8">
                <p className="text-muted-foreground text-center">No recently viewed items</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* My Issues */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">My issues</h3>
              <Link to="/issues">
                <Button variant="outline" size="sm">View all</Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-center py-8">No active issues</p>
          </CardContent>
        </Card>
        
        {/* Suggested Actors */}
        {showSuggestedActors ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Suggested Actors for you</h3>
              <div className="flex gap-2">
                <Link to="/store">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleHideSuggestedActors}>Hide</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
            {actors.map((actor) => (
              <Link to={`/actors/${actor.actorId}`} key={actor.actorId}>
                <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                        {getActorIcon(actor.actorId)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{actor.name}</h4>
                        <p className="text-xs text-muted-foreground">{actor.slug}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {actor.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{(actor.stats.runs / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>{actor.stats.rating} ({actor.stats.reviews})</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Suggested actors are hidden</p>
                <Button variant="outline" size="sm" onClick={handleShowSuggestedActors}>
                  Show Suggested Actors
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Actor Runs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Actor runs</h3>
            <Link to="/runs">
              <Button variant="ghost" size="sm">View all runs</Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex gap-6 px-6 py-3">
                  <button 
                    className={`text-sm font-medium pb-3 ${
                      activeRunsTab === 'recent' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setActiveRunsTab('recent')}
                  >
                    Recent
                  </button>
                  <button 
                    className={`text-sm font-medium pb-3 ${
                      activeRunsTab === 'scheduled' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setActiveRunsTab('scheduled')}
                  >
                    Scheduled
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-sm text-muted-foreground">
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actor</th>
                      <th className="text-left p-4 font-medium">Task</th>
                      <th className="text-left p-4 font-medium">Results</th>
                      <th className="text-left p-4 font-medium">Started</th>
                      <th className="text-left p-4 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.length > 0 ? (
                      runs.map((run) => {
                        // Dynamic status badge colors
                        const getStatusBadge = (status) => {
                          const styles = {
                            succeeded: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
                            failed: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
                            running: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse',
                            queued: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
                            aborted: 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
                          };
                          
                          const icons = {
                            succeeded: '✓',
                            failed: '✗',
                            running: '⟳',
                            queued: '⏳',
                            aborted: '⊘'
                          };
                          
                          return (
                            <Badge className={styles[status] || styles.running}>
                              {icons[status] || ''} {status}
                            </Badge>
                          );
                        };
                        
                        return (
                          <tr key={run.runId} className="border-b hover:bg-muted/50 cursor-pointer">
                            <td className="p-4">
                              {getStatusBadge(run.status)}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                  {getActorIcon(run.actorId)}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{run.actorName}</p>
                                  <p className="text-xs text-muted-foreground">comp...places</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">Pay per event</Badge>
                            </td>
                            <td className="p-4">
                              <span className="text-blue-600 dark:text-blue-400 font-medium">{run.resultCount || 0}</span>
                            </td>
                            <td className="p-4 text-sm">
                              {new Date(run.startedAt).toLocaleDateString()} {new Date(run.startedAt).toLocaleTimeString()}
                            </td>
                            <td className="p-4 text-sm">{run.duration || '-'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-muted-foreground">
                          No recent runs
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}