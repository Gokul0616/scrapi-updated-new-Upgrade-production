import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users, Filter, Search, Code, MapPin, Package, Instagram, Twitter, Facebook, Music, Globe, Linkedin, Bookmark } from 'lucide-react';
import api from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import { toast } from 'sonner';


export function Actors() {
  const navigate = useNavigate();
  const { runUpdates } = useWebSocket();
  const [actors, setActors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('1');
  const [loading, setLoading] = useState(true);
  const [selectedActors, setSelectedActors] = useState([]);
  const [filterLastRunStatus, setFilterLastRunStatus] = useState('all');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [filterPricingModel, setFilterPricingModel] = useState('all');
  const [recentlyUpdatedActors, setRecentlyUpdatedActors] = useState(new Set());
  
  useEffect(() => {
    fetchActors();
  }, []);

  // Handle real-time run updates from WebSocket
  useEffect(() => {
    if (Object.keys(runUpdates).length > 0) {
      const updatedActorIds = new Set();
      
      setActors((prevActors) => {
        return prevActors.map((actor) => {
          // Find if there's an update for this actor
          const runUpdate = Object.values(runUpdates).find(
            (update) => update.actorId === actor.actorId
          );

          if (runUpdate) {
            // Calculate duration if run is completed or failed
            let duration = null;
            if (runUpdate.finishedAt && runUpdate.startedAt) {
              duration = Math.round(
                (new Date(runUpdate.finishedAt) - new Date(runUpdate.startedAt)) / 1000
              );
            }

            // Update the actor's run stats with real-time data
            const updatedActor = {
              ...actor,
              userRunStats: {
                ...actor.userRunStats,
                lastRun: {
                  runId: runUpdate.runId,
                  status: runUpdate.status,
                  startedAt: runUpdate.startedAt,
                  finishedAt: runUpdate.finishedAt,
                  duration: duration
                }
              }
            };

            // If the run is completed or failed, increment total runs count
            if (
              (runUpdate.status === 'succeeded' || runUpdate.status === 'failed') &&
              (!actor.userRunStats?.lastRun || 
               actor.userRunStats.lastRun.runId !== runUpdate.runId ||
               actor.userRunStats.lastRun.status === 'running' ||
               actor.userRunStats.lastRun.status === 'queued')
            ) {
              updatedActor.userRunStats.totalRuns = (actor.userRunStats?.totalRuns || 0) + 1;
            }

            // Mark this actor as recently updated
            updatedActorIds.add(actor.actorId);

            return updatedActor;
          }

          return actor;
        });
      });

      // Update recently updated actors set
      if (updatedActorIds.size > 0) {
        setRecentlyUpdatedActors(updatedActorIds);
        
        // Clear the highlight after 2 seconds
        setTimeout(() => {
          setRecentlyUpdatedActors(new Set());
        }, 2000);
      }
    }
  }, [runUpdates]);
  
  const fetchActors = async () => {
    try {
      setLoading(true);
      // Fetch user's used and bookmarked actors
      const response = await api.get('/api/actors?userActors=true');
      setActors(response.data);
    } catch (error) {
      console.error('Error fetching actors:', error);
      toast.error(error.response?.data?.error || 'Failed to load actors');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleBookmark = async (actorId) => {
    try {
      await api.patch(`/api/actors/${actorId}/bookmark`);
      toast.success('Bookmark updated');
      // Refresh actors list
      fetchActors();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error(error.response?.data?.error || 'Failed to update bookmark');
    }
  };
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedActors(filteredActors.map(a => a.actorId));
    } else {
      setSelectedActors([]);
    }
  };

  const handleSelectActor = (actorId) => {
    if (selectedActors.includes(actorId)) {
      setSelectedActors(selectedActors.filter(id => id !== actorId));
    } else {
      setSelectedActors([...selectedActors, actorId]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '-';
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} m ${remainingSeconds} s`;
  };

  const getStatusBadge = (status) => {
    if (!status) {
      return <Badge variant="outline">No runs yet</Badge>;
    }
    
    const statusConfig = {
      'succeeded': { color: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400', icon: '✓', text: 'Succeeded' },
      'failed': { color: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400', icon: '✗', text: 'Failed' },
      'running': { color: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', icon: '▶', text: 'Running' },
      'queued': { color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '⏳', text: 'Queued' },
      'aborted': { color: 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400', icon: '⊗', text: 'Aborted' }
    };
    
    const config = statusConfig[status] || statusConfig['queued'];
    return (
      <Badge className={config.color}>
        {config.icon} {config.text}
      </Badge>
    );
  };
  
  // Extract unique pricing models from actors for dynamic dropdown
  const uniquePricingModels = [...new Set(actors.map(actor => actor.pricingModel).filter(Boolean))];
  
  const filteredActors = actors.filter(actor => {
    // Search filter
    if (searchTerm && !actor.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Bookmark filter
    if (filterBookmarked && !actor.isBookmarkedByUser) {
      return false;
    }
    
    // Last run status filter
    if (filterLastRunStatus !== 'all') {
      const lastRunStatus = actor.userRunStats?.lastRun?.status;
      if (filterLastRunStatus === 'no-runs' && lastRunStatus) {
        return false;
      } else if (filterLastRunStatus !== 'no-runs' && lastRunStatus !== filterLastRunStatus) {
        return false;
      } else if (filterLastRunStatus === 'no-runs' && !lastRunStatus) {
        // Keep actors with no runs when filtering for "no-runs"
        return true;
      }
    }
    
    // Pricing model filter
    if (filterPricingModel !== 'all' && actor.pricingModel !== filterPricingModel) {
      return false;
    }
    
    // Tab filter
    if (selectedTab === 'issues') {
      // Show only actors with failed runs
      return actor.userRunStats?.lastRun?.status === 'failed';
    }
    
    return true;
  });

  const getActorIcon = (actorId) => {
    const icons = {
      'google-maps': <MapPin className="h-5 w-5" />,
      'amazon': <Package className="h-5 w-5" />,
      'instagram': <Instagram className="h-5 w-5" />,
      'twitter': <Twitter className="h-5 w-5" />,
      'facebook': <Facebook className="h-5 w-5" />,
      'tiktok': <Music className="h-5 w-5" />,
      'website': <Globe className="h-5 w-5" />,
      'linkedin': <Linkedin className="h-5 w-5" />
    };
    return icons[actorId] || <Globe className="h-5 w-5" />;
  };

  const totalPages = Math.ceil(filteredActors.length / itemsPerPage);

  const handleGoToPage = () => {
    let pageNum = parseInt(goToPageInput);
    if (isNaN(pageNum) || pageNum < 1) {
      pageNum = 1;
    } else if (pageNum > totalPages) {
      pageNum = totalPages;
    }
    setCurrentPage(pageNum);
    setGoToPageInput(pageNum.toString());
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setGoToPageInput((currentPage - 1).toString());
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setGoToPageInput((currentPage + 1).toString());
    }
  };
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Actors"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => navigate('/store')}>Go to Store</Button>
            <Button variant="outline">Develop new</Button>
            <Button variant="outline">API</Button>
          </div>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-6">
            <button 
              className={`pb-3 text-sm font-medium border-b-2 ${
                selectedTab === 'recent' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedTab('recent')}
            >
              Recent & Bookmarked
            </button>
            <button 
              className={`pb-3 text-sm font-medium border-b-2 ${
                selectedTab === 'issues' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedTab('issues')}
            >
              Issues
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Actor name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterLastRunStatus} onValueChange={setFilterLastRunStatus}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Last run status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="no-runs">No runs yet</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant={filterBookmarked ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterBookmarked(!filterBookmarked)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {filterBookmarked ? 'Bookmarked only' : 'Bookmarked'}
          </Button>
          
          <Select value={filterPricingModel} onValueChange={setFilterPricingModel}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Pricing model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pricing models</SelectItem>
              {uniquePricingModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="ml-auto text-sm font-medium">
            {filteredActors.length} Actor{filteredActors.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Actors Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left p-4 font-medium w-12">
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={selectedActors.length === filteredActors.length && filteredActors.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Total runs</th>
                    <th className="text-left p-4 font-medium">Pricing model</th>
                    <th className="text-left p-4 font-medium">Last run started</th>
                    <th className="text-left p-4 font-medium">Last run status</th>
                    <th className="text-left p-4 font-medium">Last run duration</th>
                    <th className="text-left p-4 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredActors.length > 0 ? (
                    filteredActors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((actor) => (
                      <tr 
                        key={actor.actorId} 
                        className={`border-b hover:bg-muted/50 transition-colors duration-500 ${
                          recentlyUpdatedActors.has(actor.actorId) 
                            ? 'bg-green-50 dark:bg-green-900/20 animate-pulse' 
                            : ''
                        }`}
                      >
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            className="rounded" 
                            checked={selectedActors.includes(actor.actorId)}
                            onChange={() => handleSelectActor(actor.actorId)}
                          />
                        </td>
                        <td className="p-4">
                          <Link to={`/actors/${actor.actorId}`} className="flex items-center gap-3 hover:underline">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              {getActorIcon(actor.actorId)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{actor.name}</p>
                              <p className="text-xs text-muted-foreground">{actor.slug}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{actor.userRunStats?.totalRuns || 0}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{actor.pricingModel || 'Free'}</span>
                        </td>
                        <td className="p-4 text-sm">
                          {formatDate(actor.userRunStats?.lastRun?.startedAt)}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(actor.userRunStats?.lastRun?.status)}
                        </td>
                        <td className="p-4 text-sm">
                          {formatDuration(actor.userRunStats?.lastRun?.duration)}
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleBookmark(actor.actorId);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Bookmark 
                              className={`h-4 w-4 ${actor.isBookmarkedByUser ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
                            />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Code className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">No actors yet</h3>
                            <p className="text-sm text-muted-foreground">
                              {searchTerm 
                                ? 'Try adjusting your search' 
                                : 'Start using actors from the Store, and they will appear here'}
                            </p>
                          </div>
                          <Link to="/store">
                            <Button>Browse Store</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredActors.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items per page:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                    setGoToPageInput('1');
                  }}>
                    <SelectTrigger className="w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Go to page:</span>
                  <Input 
                    className="w-16 h-8" 
                    value={goToPageInput} 
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                    type="number" 
                    min="1" 
                  />
                  <Button variant="outline" size="sm" onClick={handleGoToPage}>Go</Button>
                  <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>‹</Button>
                  <span className="text-sm px-2">{currentPage} / {totalPages || 1}</span>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>›</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}