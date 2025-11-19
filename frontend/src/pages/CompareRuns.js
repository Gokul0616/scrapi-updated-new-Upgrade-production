import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, GitCompare, Download, BarChart3 } from 'lucide-react';
import { DataVisualizer } from '../components/DataVisualizer';
import api from '../services/api';
import ExcelJS from 'exceljs';

export function CompareRuns() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runIds = searchParams.get('runs')?.split(',') || [];
  
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    if (runIds.length > 0) {
      fetchRuns();
    }
  }, [runIds]);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const promises = runIds.map(id => api.get(`/api/runs/${id}`));
      const responses = await Promise.all(promises);
      setRuns(responses.map(r => r.data));
    } catch (error) {
      console.error('Error fetching runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportComparison = async () => {
    const workbook = new ExcelJS.Workbook();
    
    runs.forEach((run, index) => {
      const worksheet = workbook.addWorksheet(`Run ${index + 1}`);
      
      // Add metadata
      worksheet.addRow(['Field', 'Value']);
      worksheet.addRow(['Run ID', run._id]);
      worksheet.addRow(['Actor', run.actorName]);
      worksheet.addRow(['Status', run.status]);
      worksheet.addRow(['Started At', new Date(run.startedAt).toLocaleString()]);
      worksheet.addRow(['Finished At', run.finishedAt ? new Date(run.finishedAt).toLocaleString() : 'N/A']);
      worksheet.addRow(['Duration', run.duration || 'N/A']);
      worksheet.addRow(['Results Count', Array.isArray(run.output) ? run.output.length : 'N/A']);
      worksheet.addRow([]);
      worksheet.addRow(['Results Data']);
      
      // Add results data
      if (Array.isArray(run.output) && run.output.length > 0) {
        const headers = Object.keys(run.output[0]);
        worksheet.addRow(headers);
        run.output.forEach(item => {
          worksheet.addRow(headers.map(h => item[h]));
        });
      }
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(10).font = { bold: true };
    });
    
    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `run-comparison-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getCommonFields = () => {
    if (runs.length === 0) return [];
    const allOutputs = runs.flatMap(run => Array.isArray(run.output) ? run.output : []);
    if (allOutputs.length === 0) return [];
    
    const fieldsSet = new Set();
    allOutputs.forEach(item => {
      Object.keys(item).forEach(key => fieldsSet.add(key));
    });
    return Array.from(fieldsSet);
  };

  const getDifferences = () => {
    if (runs.length < 2) return [];
    
    const differences = [];
    const fields = ['status', 'duration', 'resultsCount'];
    
    fields.forEach(field => {
      const values = runs.map(run => {
        if (field === 'resultsCount') {
          return Array.isArray(run.output) ? run.output.length : 0;
        }
        return run[field];
      });
      
      const uniqueValues = new Set(values);
      if (uniqueValues.size > 1) {
        differences.push({
          field,
          values: runs.map((run, i) => ({ runIndex: i, value: values[i] }))
        });
      }
    });
    
    return differences;
  };

  if (runIds.length === 0) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Compare Runs" />
        <div className="p-6 max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <GitCompare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Runs Selected</h3>
              <p className="text-muted-foreground mb-4">
                Please select at least 2 runs to compare
              </p>
              <Button onClick={() => navigate('/runs')}>
                Go to Runs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Compare Runs"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCharts(!showCharts)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {showCharts ? 'Hide' : 'Show'} Charts
            </Button>
            <Button variant="outline" onClick={exportComparison}>
              <Download className="h-4 w-4 mr-2" />
              Export Comparison
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        }
      />
      
      <div className="p-6 max-w-full mx-auto space-y-6">
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading runs...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Comparing</div>
                  <div className="text-2xl font-bold">{runs.length} Runs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Total Results</div>
                  <div className="text-2xl font-bold">
                    {runs.reduce((sum, run) => sum + (Array.isArray(run.output) ? run.output.length : 0), 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Differences Found</div>
                  <div className="text-2xl font-bold">{getDifferences().length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Differences */}
            {getDifferences().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Differences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getDifferences().map((diff, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <div className="font-medium mb-2 capitalize">{diff.field}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {diff.values.map((v, j) => (
                            <div key={j} className="text-sm">
                              <span className="text-muted-foreground">Run {j + 1}:</span>
                              <span className="ml-2 font-medium">{String(v.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Side by Side Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Side-by-Side Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Field</th>
                        {runs.map((run, i) => (
                          <th key={i} className="text-left p-3 font-medium">
                            Run {i + 1}
                            <div className="text-xs font-normal text-muted-foreground">
                              {run._id.slice(0, 8)}...
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium">Actor</td>
                        {runs.map((run, i) => (
                          <td key={i} className="p-3 text-sm">{run.actorName}</td>
                        ))}
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium">Status</td>
                        {runs.map((run, i) => (
                          <td key={i} className="p-3">
                            <Badge variant={run.status === 'completed' ? 'success' : 'default'}>
                              {run.status}
                            </Badge>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium">Started At</td>
                        {runs.map((run, i) => (
                          <td key={i} className="p-3 text-sm">
                            {new Date(run.startedAt).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium">Duration</td>
                        {runs.map((run, i) => (
                          <td key={i} className="p-3 text-sm">{run.duration || 'N/A'}</td>
                        ))}
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium">Results Count</td>
                        {runs.map((run, i) => (
                          <td key={i} className="p-3 text-sm font-mono">
                            {Array.isArray(run.output) ? run.output.length : 0}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            {showCharts && runs.some(run => Array.isArray(run.output) && run.output.length > 0) && (
              <div className="space-y-4">
                {runs.map((run, i) => (
                  Array.isArray(run.output) && run.output.length > 0 && (
                    <DataVisualizer
                      key={i}
                      data={run.output}
                      title={`Run ${i + 1} - ${run.actorName}`}
                    />
                  )
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
