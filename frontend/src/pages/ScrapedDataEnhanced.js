import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Search, Database, ExternalLink, Download, Filter, BarChart3, GitCompare, FileSpreadsheet, ArrowUpDown } from 'lucide-react';
import { SocialMediaLinks } from '../components/SocialMediaLinks';
import { DataVisualizer } from '../components/DataVisualizer';
import { ColumnManager } from '../components/ColumnManager';
import api from '../services/api';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

export function ScrapedDataEnhanced() {
  const navigate = useNavigate();
  const [scrapedData, setScrapedData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [goToPageInput, setGoToPageInput] = useState('1');
  const [loading, setLoading] = useState(true);
  const [selectedScraper, setSelectedScraper] = useState('all');
  const [showCharts, setShowCharts] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortField, setSortField] = useState('scrapedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Column visibility management
  const allColumns = useMemo(() => {
    if (scrapedData.length === 0) return [];
    const columns = new Set(['actorName', 'runId', 'scrapedAt']);
    scrapedData.forEach(item => {
      if (item.dataItem && typeof item.dataItem === 'object') {
        Object.keys(item.dataItem).forEach(key => columns.add(key));
      }
    });
    return Array.from(columns);
  }, [scrapedData]);

  const [visibleColumns, setVisibleColumns] = useState(new Set(allColumns));

  // Update visible columns when data changes
  useEffect(() => {
    if (allColumns.length > 0 && visibleColumns.size === 0) {
      setVisibleColumns(new Set(allColumns));
    }
  }, [allColumns]);
  
  useEffect(() => {
    fetchScrapedData();
  }, []);
  
  const fetchScrapedData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/scraped-data');
      setScrapedData(response.data.data || []);
    } catch (error) {
      // Error fetching scraped data
    } finally {
      setLoading(false);
    }
  };

  // Get unique scrapers that user has actually used
  const usedScrapers = useMemo(() => {
    const scraperMap = new Map();
    scrapedData.forEach(item => {
      if (!scraperMap.has(item.actorId)) {
        scraperMap.set(item.actorId, {
          id: item.actorId,
          name: item.actorName,
          count: 0
        });
      }
      scraperMap.get(item.actorId).count++;
    });
    return Array.from(scraperMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [scrapedData]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let filtered = scrapedData.filter(item => {
      const matchesSearch = JSON.stringify(item.dataItem).toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.actorName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (selectedScraper === 'all') return matchesSearch;
      return matchesSearch && item.actorId === selectedScraper;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'scrapedAt') {
        aVal = new Date(a.scrapedAt).getTime();
        bVal = new Date(b.scrapedAt).getTime();
      } else if (sortField === 'actorName') {
        aVal = a.actorName || '';
        bVal = b.actorName || '';
      } else {
        aVal = a.dataItem?.[sortField] || '';
        bVal = b.dataItem?.[sortField] || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [scrapedData, searchTerm, selectedScraper, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

  const exportData = (format = 'json') => {
    const dataToExport = selectedRows.size > 0 
      ? filteredData.filter((_, i) => selectedRows.has(i))
      : filteredData;

    if (format === 'json') {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scraped-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scraped Data');
      
      const ws_data = dataToExport.map(item => ({
        'Actor': item.actorName,
        'Run ID': item.runId,
        'Scraped At': new Date(item.scrapedAt).toLocaleString(),
        ...item.dataItem
      }));
      
      // Add headers
      if (ws_data.length > 0) {
        worksheet.addRow(Object.keys(ws_data[0]));
        ws_data.forEach(row => {
          worksheet.addRow(Object.values(row));
        });
        
        // Style header
        worksheet.getRow(1).font = { bold: true };
      }
      
      // Generate and download
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scraped-data-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      });
    } else if (format === 'csv') {
      const ws_data = dataToExport.map(item => ({
        'Actor': item.actorName,
        'Run ID': item.runId,
        'Scraped At': new Date(item.scrapedAt).toLocaleString(),
        ...item.dataItem
      }));
      
      // Convert to CSV using papaparse (already installed)
      const csv = Papa.unparse(ws_data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scraped-data-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleRowSelection = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map((_, i) => i)));
    }
  };

  const compareSelected = () => {
    if (selectedRows.size < 2) {
      alert('Please select at least 2 runs to compare');
      return;
    }
    const runIds = Array.from(selectedRows).map(i => filteredData[i].runId);
    navigate(`/compare-runs?runs=${runIds.join(',')}`);
  };

  const getAllFieldKeys = (data) => {
    const keysSet = new Set();
    data.forEach(item => {
      if (item.dataItem && typeof item.dataItem === 'object') {
        Object.keys(item.dataItem).forEach(key => keysSet.add(key));
      }
    });
    return Array.from(keysSet).filter(key => visibleColumns.has(key));
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 100) + '...';
    return String(value);
  };

  // Prepare data for visualization
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      ...item.dataItem,
      actorName: item.actorName,
      scrapedAt: new Date(item.scrapedAt).toLocaleDateString()
    }));
  }, [filteredData]);
  
  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="All Scraped Data"
        subtitle="Interactive data explorer with filtering, sorting, and visualization"
        actions={
          <div className="flex gap-2">
            {selectedRows.size > 0 && (
              <Button variant="outline" onClick={compareSelected}>
                <GitCompare className="h-4 w-4 mr-2" />
                Compare ({selectedRows.size})
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowCharts(!showCharts)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {showCharts ? 'Hide' : 'Show'} Charts
            </Button>
            <Select onValueChange={exportData}>
              <SelectTrigger className="w-[140px]">
                <Download className="h-4 w-4 mr-2" />
                Export
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
      
      <div className="p-6 max-w-full mx-auto space-y-6">
        {/* Filters and Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scraped data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Scraper Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedScraper} onValueChange={setSelectedScraper}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by scraper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scrapers ({scrapedData.length})</SelectItem>
                {usedScrapers.map(scraper => (
                  <SelectItem key={scraper.id} value={scraper.id}>
                    {scraper.name} ({scraper.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Column Manager */}
          <ColumnManager 
            columns={allColumns}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
          />
          
          <div className="text-sm font-medium">
            {filteredData.length} Records
            {selectedRows.size > 0 && ` • ${selectedRows.size} Selected`}
          </div>
        </div>

        {/* Charts Section */}
        {showCharts && chartData.length > 0 && (
          <DataVisualizer data={chartData} title="Scraped Data Visualization" />
        )}

        {/* Data Table */}
        <div className="mt-0">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50 sticky top-0">
                      <tr className="text-sm text-muted-foreground">
                        <th className="text-left p-4 font-medium w-12 bg-muted/50">
                          <Checkbox
                            checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                            onCheckedChange={toggleAllRows}
                          />
                        </th>
                        <th className="text-left p-4 font-medium w-12 bg-muted/50">#</th>
                        {visibleColumns.has('actorName') && (
                          <th 
                            className="text-left p-4 font-medium min-w-[180px] bg-muted/50 cursor-pointer hover:bg-muted"
                            onClick={() => handleSort('actorName')}
                          >
                            <div className="flex items-center gap-1">
                              Actor
                              {sortField === 'actorName' && (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                        )}
                        {visibleColumns.has('runId') && (
                          <th className="text-left p-4 font-medium min-w-[120px] bg-muted/50">Run ID</th>
                        )}
                        {visibleColumns.has('scrapedAt') && (
                          <th 
                            className="text-left p-4 font-medium min-w-[180px] bg-muted/50 cursor-pointer hover:bg-muted"
                            onClick={() => handleSort('scrapedAt')}
                          >
                            <div className="flex items-center gap-1">
                              Scraped At
                              {sortField === 'scrapedAt' && (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                        )}
                        
                        {/* Dynamic columns based on actual data fields */}
                        {paginatedData.length > 0 && getAllFieldKeys(paginatedData).map((key) => (
                          <th 
                            key={key} 
                            className="text-left p-4 font-medium min-w-[200px] bg-muted/50 whitespace-nowrap cursor-pointer hover:bg-muted"
                            onClick={() => handleSort(key)}
                          >
                            <div className="flex items-center gap-1">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              {sortField === key && (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </div>
                          </th>
                        ))}
                        
                        <th className="text-left p-4 font-medium min-w-[80px] bg-muted/50">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="20" className="p-12 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              <span className="text-muted-foreground">Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedData.length > 0 ? (
                        paginatedData.map((item, index) => {
                          const globalIndex = startIndex + index;
                          return (
                            <tr 
                              key={item.id} 
                              className={`border-b hover:bg-muted/50 transition-colors ${selectedRows.has(globalIndex) ? 'bg-muted/30' : ''}`}
                            >
                              <td className="p-4">
                                <Checkbox
                                  checked={selectedRows.has(globalIndex)}
                                  onCheckedChange={() => toggleRowSelection(globalIndex)}
                                />
                              </td>
                              <td className="p-4 text-sm text-muted-foreground font-mono">
                                {globalIndex + 1}
                              </td>
                              {visibleColumns.has('actorName') && (
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                      {item.actorName?.charAt(0) || 'D'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm whitespace-nowrap">{item.actorName || 'Unknown Actor'}</p>
                                      <p className="text-xs text-muted-foreground whitespace-nowrap">{item.actorId || 'unknown'}</p>
                                    </div>
                                  </div>
                                </td>
                              )}
                              {visibleColumns.has('runId') && (
                                <td className="p-4">
                                  <span 
                                    className="text-blue-600 dark:text-blue-400 text-xs font-mono cursor-pointer hover:underline"
                                    onClick={() => navigate(`/runs/${item.runId}`)}
                                  >
                                    {item.runId?.slice(0, 12)}...
                                  </span>
                                </td>
                              )}
                              {visibleColumns.has('scrapedAt') && (
                                <td className="p-4">
                                  {item.scrapedAt ? (
                                    <div className="text-sm">
                                      <div className="font-medium">
                                        {new Date(item.scrapedAt).toLocaleDateString('en-US', { 
                                          year: 'numeric', 
                                          month: '2-digit', 
                                          day: '2-digit' 
                                        })}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {new Date(item.scrapedAt).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit',
                                          second: '2-digit',
                                          hour12: false
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </td>
                              )}
                              
                              {/* Dynamic data cells */}
                              {getAllFieldKeys(paginatedData).map((key) => (
                                <td key={key} className="p-4 text-sm">
                                  {item.dataItem && item.dataItem[key] !== undefined ? (
                                    key === 'socialMedia' ? (
                                      <SocialMediaLinks socialMedia={item.dataItem[key]} maxVisible={5} />
                                    ) : key === 'additionalEmails' || key === 'additionalPhones' || key === 'websiteAddresses' ? (
                                      Array.isArray(item.dataItem[key]) && item.dataItem[key].length > 0 ? (
                                        <span className="block max-w-xs truncate text-xs" title={item.dataItem[key].join(', ')}>
                                          {item.dataItem[key].slice(0, 2).join(', ')}
                                          {item.dataItem[key].length > 2 && ` +${item.dataItem[key].length - 2} more`}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )
                                    ) : key === 'contactPageUrl' ? (
                                      <a 
                                        href={item.dataItem[key]} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                      >
                                        📄 Contact Page
                                      </a>
                                    ) : typeof item.dataItem[key] === 'string' && item.dataItem[key].startsWith('http') ? (
                                      <a 
                                        href={item.dataItem[key]} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                      >
                                        🔗 Open
                                      </a>
                                    ) : (
                                      <span className="block max-w-xs truncate" title={String(item.dataItem[key])}>
                                        {formatValue(item.dataItem[key])}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              ))}
                              
                              <td className="p-4">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => navigate(`/runs/${item.runId}`)}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="20" className="p-12 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                <Database className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div>
                                <h3 className="font-semibold mb-1">No scraped data found</h3>
                                <p className="text-sm text-muted-foreground">
                                  Run a scraper to collect data and see it here
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {paginatedData.length > 0 && (
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
                          <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground ml-4">
                        Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length}
                      </span>
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
    </div>
  );
}
