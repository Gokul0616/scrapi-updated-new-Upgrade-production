import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function DataVisualizer({ data, title = "Data Visualization" }) {
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');

  // Extract numeric and string fields
  const fields = useMemo(() => {
    if (!data || data.length === 0) return { numeric: [], string: [] };
    
    const sample = data[0];
    const numeric = [];
    const string = [];
    
    Object.keys(sample).forEach(key => {
      const value = sample[key];
      if (typeof value === 'number') {
        numeric.push(key);
      } else if (typeof value === 'string' && value.length < 50) {
        string.push(key);
      }
    });
    
    return { numeric, string };
  }, [data]);

  // Set default axes
  React.useEffect(() => {
    if (fields.string.length > 0 && !xAxis) setXAxis(fields.string[0]);
    if (fields.numeric.length > 0 && !yAxis) setYAxis(fields.numeric[0]);
  }, [fields, xAxis, yAxis]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!xAxis || !yAxis || !data) return [];
    
    // Group by x-axis and aggregate y-axis
    const grouped = {};
    data.forEach(item => {
      const xValue = item[xAxis];
      const yValue = parseFloat(item[yAxis]) || 0;
      
      if (xValue !== undefined && xValue !== null) {
        if (!grouped[xValue]) {
          grouped[xValue] = { name: String(xValue), value: 0, count: 0 };
        }
        grouped[xValue].value += yValue;
        grouped[xValue].count++;
      }
    });
    
    return Object.values(grouped)
      .map(item => ({
        ...item,
        value: item.count > 0 ? item.value / item.count : item.value
      }))
      .slice(0, 20); // Limit to 20 items for readability
  }, [data, xAxis, yAxis]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available for visualization
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={COLORS[0]} name={yAxis} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} name={yAxis} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value.toFixed(2)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            No data available for visualization
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">X-Axis (Category)</label>
              <Select value={xAxis} onValueChange={setXAxis}>
                <SelectTrigger>
                  <SelectValue placeholder="Select X-axis" />
                </SelectTrigger>
                <SelectContent>
                  {fields.string.map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Y-Axis (Value)</label>
              <Select value={yAxis} onValueChange={setYAxis}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Y-axis" />
                </SelectTrigger>
                <SelectContent>
                  {fields.numeric.map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4">
            {renderChart()}
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Showing {Math.min(chartData.length, 20)} items • {data.length} total records
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
