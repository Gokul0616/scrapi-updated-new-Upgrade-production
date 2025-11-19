import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, Play, XCircle, Square, CheckSquare, GitCompare } from 'lucide-react';
import api from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';
import { AlertModal } from '../components/AlertModal';
import { toast } from 'sonner';

export function Runs() {
  const navigate = useNavigate();
  const { runUpdates } = useWebSocket();
  const [runs, setRuns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pricingModelFilter, setPricingModelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('1');
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAbortModal, setShowAbortModal] = useState(false);
  const [abortAction, setAbortAction] = useState(null);
  const [isAborting, setIsAborting] = useState(false);
  
  useEffect(() => {
    fetchRuns();
  }, []);
  
  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (Object.keys(runUpdates).length > 0) {
      setRuns((prevRuns) => {
        const updatedRuns = [...prevRuns];
        
        Object.values(runUpdates).forEach((update) => {
          const runIndex = updatedRuns.findIndex(r => r.runId === update.runId || r._id === update._id);
          
          if (runIndex !== -1) {
            // Update existing run
            updatedRuns[runIndex] = {
              ...updatedRuns[runIndex],
              ...update
            };
          } else if (update._id) {
            // Add new run to the beginning
            updatedRuns.unshift(update);
          }
        });
        
        return updatedRuns;
      });
    }
  }, [runUpdates]);
  
  const fetchRuns = async () => {
    try {
      const response = await api.get('/api/runs');
      setRuns(response.data.runs || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
      toast.error(error.response?.data?.error || 'Failed to load runs');
    }
  };

  // Handle checkbox selection
  const toggleSelectRun = (runId, event) => {
    event.stopPropagation();
    setSelectedRuns(prev => {
      if (prev.includes(runId)) {
        return prev.filter(id => id !== runId);
      } else {
        return [...prev, runId];
      }
    });
  };

  // Handle select all checkbox
  const toggleSelectAll = (event) => {
    event.stopPropagation();
    if (selectAll) {
      setSelectedRuns([]);
      setSelectAll(false);
    } else {
      // Only select runs that can be aborted (queued or running)
      const abortableRuns = runs.filter(run => run.status === 'queued' || run.status === 'running');
      setSelectedRuns(abortableRuns.map(run => run.runId));
      setSelectAll(true);
    }
  };

  // Update selectAll state when selection changes
  useEffect(() => {
    const abortableRuns = runs.filter(run => run.status === 'queued' || run.status === 'running');
    if (abortableRuns.length > 0 && selectedRuns.length === abortableRuns.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedRuns, runs]);

  // Abort single run
  const handleAbortSingle = async (runId, event) => {
    event.stopPropagation();
    setAbortAction({ type: 'single', runId });
    setShowAbortModal(true);
  };

  // Abort selected runs
  const handleAbortSelected = () => {
    if (selectedRuns.length === 0) {
      toast.error('No runs selected');
      return;
    }
    setAbortAction({ type: 'selected', runIds: selectedRuns });
    setShowAbortModal(true);
  };

  // Compare selected runs
  const handleCompareSelected = () => {
    if (selectedRuns.length < 2) {
      toast.error('Please select at least 2 runs to compare');
      return;
    }
    navigate(`/compare-runs?runs=${selectedRuns.join(',')}`);
  };

  // Abort all runs
  const handleAbortAll = () => {
    const abortableRuns = runs.filter(run => run.status === 'queued' || run.status === 'running');
    if (abortableRuns.length === 0) {
      toast.error('No runs to abort');
      return;
    }
    setAbortAction({ type: 'all', runIds: abortableRuns.map(run => run.runId) });
    setShowAbortModal(true);
  };

  // Confirm abort action
  const confirmAbort = async () => {
    if (!abortAction) return;

    setIsAborting(true);
    try {
      if (abortAction.type === 'single') {
        // Abort single run
        const response = await api.post(`/api/runs/${abortAction.runId}/abort`);
        toast.success('Run aborted successfully');
        
        // Update local state
        setRuns(prev => prev.map(run => 
          run.runId === abortAction.runId ? response.data.run : run
        ));
      } else {
        // Abort multiple runs (selected or all)
        const response = await api.post('/api/runs/abort-bulk', {
          runIds: abortAction.runIds
        });
        
        toast.success(`${response.data.results.aborted.length} run(s) aborted`);
        
        if (response.data.results.failed.length > 0) {
          toast.error(`Failed to abort ${response.data.results.failed.length} run(s)`);
        }
        
        // Refresh runs
        await fetchRuns();
        setSelectedRuns([]);
        setSelectAll(false);
      }
    } catch (error) {
      console.error('Error aborting run(s):', error);
      toast.error(error.response?.data?.error || 'Failed to abort run(s)');
    } finally {
      setIsAborting(false);
      setShowAbortModal(false);
      setAbortAction(null);
    }
  };

  // Get abort modal message
  const getAbortModalMessage = () => {
    if (!abortAction) return '';
    
    if (abortAction.type === 'single') {
      return `Are you sure you want to abort this run?\n\nRun ID: ${abortAction.runId}\n\nAny scraped data will be preserved.`;
    } else if (abortAction.type === 'selected') {
      return `Are you sure you want to abort ${abortAction.runIds.length} selected run(s)? Any scraped data will be preserved.`;
    } else {
      return `Are you sure you want to abort all ${abortAction.runIds.length} running/queued task(s)? Any scraped data will be preserved.`;
    }
  };

  const handleGoToPage = () => {
    let pageNum = parseInt(goToPageInput);
    if (isNaN(pageNum) || pageNum < 1) {
      pageNum = 1;
    } else if (pageNum > totalFilteredPages) {
      pageNum = totalFilteredPages;
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
    if (currentPage < totalFilteredPages) {
      setCurrentPage(currentPage + 1);
      setGoToPageInput((currentPage + 1).toString());
    }
  };
  
  const getStatusBadge = (status) => {
    const styles = {
      succeeded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse',
      queued: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      aborted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    };
    
    const statusText = {
      succeeded: '✓ Succeeded',
      failed: '✗ Failed',
      running: '⟳ Running',
      queued: '⏳ Queued',
      aborted: '⊘ Aborted'
    };
    
    return (
      <Badge className={`${styles[status] || styles.running} hover:${styles[status]} whitespace-nowrap`}>
        {statusText[status] || status}
      </Badge>
    );
  };
  
  // Get unique pricing models from runs
  const uniquePricingModels = [...new Set(runs.map(run => run.pricingModel).filter(Boolean))];
  
  // Apply filters
  const filteredRuns = runs.filter(run => {
    // Search filter
    const matchesSearch = !searchTerm || run.runId?.toLowerCase().includes(searchTerm.toLowerCase()) || run.actorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    
    // Pricing model filter
    const matchesPricingModel = pricingModelFilter === 'all' || run.pricingModel === pricingModelFilter;
    
    return matchesSearch && matchesStatus && matchesPricingModel;
  });
  
  // Paginate filtered runs
  const paginatedRuns = filteredRuns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalFilteredPages = Math.ceil(filteredRuns.length / itemsPerPage);
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Runs"
        actions={
          <div className="flex items-center gap-3">
            {selectedRuns.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCompareSelected}
                  disabled={selectedRuns.length < 2}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare ({selectedRuns.length})
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleAbortSelected}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Abort Selected ({selectedRuns.length})
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAbortAll}
              className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Abort All
            </Button>
            <Button variant="outline">API</Button>
          </div>
        }
      />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by run ID or actor name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="aborted">Aborted</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={pricingModelFilter} onValueChange={setPricingModelFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Pricing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pricing</SelectItem>
              {uniquePricingModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="ml-auto text-sm font-medium">
            {filteredRuns.length} of {runs.length} Runs
          </div>
        </div>
        
        {/* Runs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="border-b bg-muted/50">
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left p-4 font-medium w-12 bg-muted/50" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center"
                      >
                        {selectAll ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium min-w-[200px] bg-muted/50">Actor</th>
                    <th className="text-left p-4 font-medium min-w-[120px] bg-muted/50">Status</th>
                    <th className="text-left p-4 font-medium min-w-[140px] bg-muted/50">Run ID</th>
                    <th className="text-left p-4 font-medium text-center min-w-[100px] bg-muted/50">Results</th>
                    <th className="text-left p-4 font-medium min-w-[100px] bg-muted/50">Usage</th>
                    <th className="text-left p-4 font-medium min-w-[180px] bg-muted/50">Started</th>
                    <th className="text-left p-4 font-medium min-w-[180px] bg-muted/50">Finished</th>
                    <th className="text-left p-4 font-medium min-w-[100px] bg-muted/50">Duration</th>
                    <th className="text-left p-4 font-medium min-w-[120px] bg-muted/50">Origin</th>
                    <th className="text-left p-4 font-medium min-w-[100px] bg-muted/50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRuns.length > 0 ? (
                    paginatedRuns.map((run) => {
                      const isAbortable = run.status === 'queued' || run.status === 'running';
                      const isSelected = selectedRuns.includes(run.runId);
                      
                      return (
                        <tr 
                          key={run.runId} 
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors" 
                          onClick={() => navigate(`/runs/${run.runId}`)}
                        >
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            {isAbortable ? (
                              <button
                                onClick={(e) => toggleSelectRun(run.runId, e)}
                                className="flex items-center justify-center"
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <div className="h-4 w-4"></div>
                            )}
                          </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {run.actorName?.charAt(0) || 'R'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm whitespace-nowrap">{run.actorName || 'Unknown Actor'}</p>
                              <p className="text-xs text-muted-foreground whitespace-nowrap">{run.actorId?.replace('-', '/') || 'unknown'}-scraper</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(run.status)}
                        </td>
                        <td className="p-4">
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-mono">
                            {run.runId?.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {run.resultCount || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">${run.usage?.toFixed(2) || '0.00'}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">
                              {new Date(run.startedAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit' 
                              })}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(run.startedAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {run.finishedAt ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(run.finishedAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit' 
                                })}
                              </div>
                              <div className="text-muted-foreground">
                                {new Date(run.finishedAt).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: false
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Running...</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-medium">
                          {run.duration || '-'}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="font-normal">
                            Web
                          </Badge>
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          {isAbortable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleAbortSingle(run.runId, e)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Abort
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                  ) : (
                    <tr>
                      <td colSpan="11" className="p-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Play className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">No runs found</h3>
                            <p className="text-sm text-muted-foreground">
                              Start a scraper to see runs appear here
                            </p>
                          </div>
                          <Link to="/store">
                            <Button>Browse Scrapers</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {runs.length > 0 && (
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
                  <span className="text-sm px-2">{currentPage} / {totalFilteredPages || 1}</span>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalFilteredPages}>›</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Abort Confirmation Modal */}
      <AlertModal
        open={showAbortModal}
        onOpenChange={setShowAbortModal}
        title="Abort Task(s)"
        description={getAbortModalMessage()}
        onConfirm={confirmAbort}
        confirmText="Abort"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isAborting}
      />
    </div>
  );
}
