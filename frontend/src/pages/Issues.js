import React, { useState, useEffect } from 'react';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import api from '../services/api';

export function Issues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, resolved, closed

  useEffect(() => {
    fetchIssues();
  }, [filter]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/issues${filter !== 'all' ? `?status=${filter}` : ''}`);
      setIssues(response.data || []);
    } catch (error) {
      // If endpoint doesn't exist yet, show empty state
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      open: <AlertCircle className="h-4 w-4 text-red-500" />,
      in_progress: <Clock className="h-4 w-4 text-yellow-500" />,
      resolved: <CheckCircle className="h-4 w-4 text-green-500" />,
      closed: <XCircle className="h-4 w-4 text-gray-500" />
    };
    return icons[status] || icons.open;
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
      in_progress: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
      resolved: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      closed: 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return styles[status] || styles.open;
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="My Issues" />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filter Tabs */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All Issues
              </Button>
              <Button 
                variant={filter === 'open' ? 'default' : 'outline'}
                onClick={() => setFilter('open')}
              >
                Open
              </Button>
              <Button 
                variant={filter === 'resolved' ? 'default' : 'outline'}
                onClick={() => setFilter('resolved')}
              >
                Resolved
              </Button>
              <Button 
                variant={filter === 'closed' ? 'default' : 'outline'}
                onClick={() => setFilter('closed')}
              >
                Closed
              </Button>
            </div>

            {/* Issues List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading issues...</p>
              </div>
            ) : issues.length > 0 ? (
              <div className="space-y-4">
                {issues.map((issue) => (
                  <Card key={issue._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(issue.status)}
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{issue.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusBadge(issue.status)}>
                                {issue.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(issue.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No {filter !== 'all' ? filter : ''} issues</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? "You don't have any issues. Everything is working perfectly!" 
                    : `No ${filter} issues found.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
