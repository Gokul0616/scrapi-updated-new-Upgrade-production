import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Star, Users, Play, Bookmark, Share2, Code, BookOpen, MapPin, Package, Instagram, Twitter, Facebook, Music, Globe, Linkedin } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';


export function ActorDetail() {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [input, setInput] = useState({});
  const [runs, setRuns] = useState([]);
  
  useEffect(() => {
    fetchActor();
    fetchActorRuns();
  }, [actorId]);
  
  const fetchActor = async () => {
    try {
      const actorUrl = '/api/actors/' + actorId;
      const response = await api.get(actorUrl);
      setActor(response.data);
      
      // Save to recently viewed
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const newItem = {
        actorId: response.data.actorId,
        name: response.data.name,
        slug: response.data.slug
      };
      const filtered = recentlyViewed.filter(item => item.actorId !== actorId);
      localStorage.setItem('recentlyViewed', JSON.stringify([newItem, ...filtered].slice(0, 4)));
      
      // Set default input values from field schemas
      if (response.data.inputFields) {
        const defaultInputs = {};
        response.data.inputFields.forEach(field => {
          if (field.default !== undefined) {
            defaultInputs[field.key] = field.default;
          }
        });
        setInput(defaultInputs);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching actor:', error);
      toast({
        title: 'Error',
        description: 'Failed to load actor details',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };
  
  const fetchActorRuns = async () => {
    try {
      const response = await api.get(`/api/runs?actorId=${actorId}&limit=5`);
      setRuns(response.data.runs || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load recent runs',
        variant: 'destructive'
      });
    }
  };
  
  const handleInputChange = (key, value) => {
    setInput(prev => ({ ...prev, [key]: value }));
  };
  
  const handleRun = async () => {
    setRunLoading(true);
    try {
      const response = await api.post('/api/runs', {
        actorId: actor.actorId,
        input
      });
      
      toast({
        title: 'Run started!',
        description: `Scraper is now running. Run ID: ${response.data.runId}`,
      });
      
      // Navigate to run detail after a short delay
      setTimeout(() => {
        navigate(`/runs/${response.data.runId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error starting run:', error);
      toast({
        title: 'Error',
        description: 'Failed to start scraper run',
        variant: 'destructive'
      });
    } finally {
      setRunLoading(false);
    }
  };
  
  const toggleBookmark = async () => {
    try {
      const bookmarkUrl = '/api/actors/' + actorId + '/bookmark';
      await api.patch(bookmarkUrl);
      setActor(prev => ({ ...prev, isBookmarked: !prev.isBookmarked }));
      toast({
        title: actor.isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update bookmark',
        variant: 'destructive'
      });
    }
  };
  
  // Dynamic input field renderer based on backend schema
  const renderInputFields = () => {
    if (!actor || !actor.inputFields) return null;
    
    return actor.inputFields.map(field => {
      // Handle checkbox fields separately with different layout
      if (field.type === 'checkbox') {
        return (
          <div key={field.key} className="flex items-start space-x-3 py-2">
            <Checkbox
              id={field.key}
              checked={input[field.key] || false}
              onCheckedChange={(checked) => handleInputChange(field.key, checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor={field.key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {field.label}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {field.description}
                </p>
              )}
            </div>
          </div>
        );
      }
      
      // Handle other field types
      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          
          {field.type === 'textarea' ? (
            <Textarea
              id={field.key}
              value={input[field.key] || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.key}
              value={input[field.key] || field.default || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required={field.required}
            >
              {field.options && field.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <Input
              id={field.key}
              type={field.type}
              value={input[field.key] || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}
        </div>
      );
    });
  };
  
  const getActorIcon = (actorId) => {
    const icons = {
      'google-maps': <MapPin className="h-10 w-10" />,
      'amazon': <Package className="h-10 w-10" />,
      'instagram': <Instagram className="h-10 w-10" />,
      'twitter': <Twitter className="h-10 w-10" />,
      'facebook': <Facebook className="h-10 w-10" />,
      'tiktok': <Music className="h-10 w-10" />,
      'website': <Globe className="h-10 w-10" />,
      'linkedin': <Linkedin className="h-10 w-10" />
    };
    return icons[actorId] || <Globe className="h-10 w-10" />;
  };
  
  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Loading..." />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full max-w-4xl">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!actor) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Actor Not Found" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-4">The actor you're looking for doesn't exist.</p>
          <Link to="/actors">
            <Button>Back to Actors</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Calculate bookmark class
  const bookmarkClass = 'h-4 w-4' + (actor.isBookmarked ? ' fill-current' : '');
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title={actor.name}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={toggleBookmark}>
              <Bookmark className={bookmarkClass} />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline">
              <Code className="h-4 w-4 mr-2" />
              API
            </Button>
          </div>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Actor Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                {getActorIcon(actor.actorId)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold mb-1">{actor.name}</h1>
                    <p className="text-muted-foreground">{actor.slug}</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {actor.category}
                  </Badge>
                </div>
                
                <p className="text-lg mb-4">{actor.description}</p>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold">{actor.author.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="font-medium">{actor.author}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{(actor.stats.runs / 1000).toFixed(1)}K runs</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{actor.stats.rating}</span>
                    <span className="text-muted-foreground">({actor.stats.reviews} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="col-span-2">
            <Tabs defaultValue="input">
              <TabsList>
                <TabsTrigger value="input">
                  <Play className="h-4 w-4 mr-2" />
                  Input
                </TabsTrigger>
                <TabsTrigger value="readme">
                  <BookOpen className="h-4 w-4 mr-2" />
                  README
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="h-4 w-4 mr-2" />
                  Source Code
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="input">
                <Card>
                  <CardHeader>
                    <CardTitle>Input Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderInputFields()}
                    
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={handleRun} 
                        disabled={runLoading}
                        className="w-full"
                        size="lg"
                      >
                        {runLoading ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start Scraper
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="readme">
                <Card>
                  <CardContent className="p-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <h2>About {actor.name}</h2>
                      <p>{actor.description}</p>
                      
                      <h3>Features</h3>
                      <ul>
                        <li>Fast and reliable scraping</li>
                        <li>Structured data output</li>
                        <li>Customizable parameters</li>
                        <li>Production-ready performance</li>
                      </ul>
                      
                      <h3>Use Cases</h3>
                      <p>This scraper is perfect for data collection, market research, competitor analysis, and automation workflows.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="code">
                <Card>
                  <CardContent className="p-6">
                    <div className="bg-muted p-4 rounded font-mono text-sm">
                      <pre>// Source code available on GitHub</pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Recent Runs Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Runs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {runs.length > 0 ? (
                  runs.map(run => {
                    const runLink = '/runs/' + run.runId;
                    
                    // Dynamic status badge colors
                    const getStatusClass = (status) => {
                      const styles = {
                        succeeded: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
                        failed: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
                        running: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse',
                        queued: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
                        aborted: 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
                      };
                      return styles[status] || styles.running;
                    };
                    
                    return (
                    <Link to={runLink} key={run.runId}>
                      <div className="p-3 border rounded hover:bg-muted cursor-pointer transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getStatusClass(run.status)}>
                            {run.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{run.duration || '-'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(run.startedAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-medium">
                          {run.resultCount || 0} results
                        </p>
                      </div>
                    </Link>
                  );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No runs yet</p>
                )}
                
                <Link to={`/runs?actorId=${actor.actorId}`}>
                  <Button variant="outline" className="w-full" size="sm">
                    View all runs →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}