import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy, Download, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// Recursive JSON Tree Component (Apify-style)
function JsonTreeNode({ nodeKey, value, depth = 0, searchTerm = '' }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  
  // Determine if this node or any children match search
  const matchesSearch = (val, key) => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    
    // Check key
    if (key && String(key).toLowerCase().includes(term)) return true;
    
    // Check value
    if (typeof val === 'string' && val.toLowerCase().includes(term)) return true;
    if (typeof val === 'number' && String(val).includes(term)) return true;
    if (typeof val === 'boolean' && String(val).toLowerCase().includes(term)) return true;
    
    return false;
  };
  
  const hasMatch = matchesSearch(value, nodeKey);
  
  if (!isObject) {
    // Leaf node
    return (
      <div className={`flex items-start gap-2 py-1 ${hasMatch ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}>
        <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">
          "{nodeKey}":
        </span>
        <span className={`font-mono text-sm ${
          typeof value === 'string' ? 'text-green-600 dark:text-green-400' :
          typeof value === 'number' ? 'text-purple-600 dark:text-purple-400' :
          typeof value === 'boolean' ? 'text-orange-600 dark:text-orange-400' :
          'text-gray-500'
        }`}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }
  
  // Object or Array node
  const entries = isArray ? value : Object.entries(value);
  const count = isArray ? value.length : Object.keys(value).length;
  
  return (
    <div>
      <div 
        className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded ${hasMatch ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">
          {nodeKey ? `"${nodeKey}":` : ''}
        </span>
        <span className="text-muted-foreground font-mono text-sm">
          {isArray ? `[${count} items]` : `{${count} keys}`}
        </span>
      </div>
      
      {isExpanded && (
        <div className="ml-6 border-l-2 border-muted pl-3">
          {isArray ? (
            value.map((item, index) => (
              <JsonTreeNode 
                key={index} 
                nodeKey={index} 
                value={item} 
                depth={depth + 1}
                searchTerm={searchTerm}
              />
            ))
          ) : (
            Object.entries(value).map(([key, val]) => (
              <JsonTreeNode 
                key={key} 
                nodeKey={key} 
                value={val} 
                depth={depth + 1}
                searchTerm={searchTerm}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function JsonViewer({ data, title = 'View Data', isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'raw'
  const { toast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast({
      title: 'Copied!',
      description: 'JSON data copied to clipboard',
    });
  };
  
  const handleDownload = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-${Date.now()}.json`;
    link.click();
    
    toast({
      title: 'Downloaded',
      description: 'JSON file downloaded successfully',
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tree')}
              >
                Tree View
              </Button>
              <Button
                variant={viewMode === 'raw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('raw')}
              >
                Raw JSON
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {/* Toolbar */}
        <div className="flex gap-2 py-2 border-b">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in JSON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-muted/20 rounded">
          {viewMode === 'tree' ? (
            <JsonTreeNode value={data} nodeKey="" depth={0} searchTerm={searchTerm} />
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t text-sm text-muted-foreground">
          <span>
            {typeof data === 'object' && data !== null ? (
              Array.isArray(data) ? 
                `Array with ${data.length} items` : 
                `Object with ${Object.keys(data).length} keys`
            ) : (
              `${typeof data} value`
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact trigger component for inline use
export function JsonViewerTrigger({ data, label = 'View object', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getDataSummary = () => {
    if (Array.isArray(data)) {
      return `Array (${data.length} items)`;
    }
    if (typeof data === 'object' && data !== null) {
      return `Object (${Object.keys(data).length} keys)`;
    }
    return label;
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`text-blue-600 dark:text-blue-400 hover:underline text-xs cursor-pointer ${className}`}
      >
        {getDataSummary()}
      </button>
      <JsonViewer 
        data={data} 
        title={label}
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
