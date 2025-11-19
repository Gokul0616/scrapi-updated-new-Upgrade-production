import React, { useState } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Columns3, Eye, EyeOff } from 'lucide-react';

export function ColumnManager({ columns, visibleColumns, onVisibilityChange }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = columns.filter(col =>
    col.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleColumn = (column) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(column)) {
      newVisible.delete(column);
    } else {
      newVisible.add(column);
    }
    onVisibilityChange(newVisible);
  };

  const showAll = () => {
    onVisibilityChange(new Set(columns));
  };

  const hideAll = () => {
    onVisibilityChange(new Set());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="h-4 w-4 mr-2" />
          Columns ({visibleColumns.size}/{columns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-2 space-y-2">
          <input
            type="text"
            placeholder="Search columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          />
          
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={showAll} className="flex-1">
              <Eye className="h-3 w-3 mr-1" />
              Show All
            </Button>
            <Button variant="ghost" size="sm" onClick={hideAll} className="flex-1">
              <EyeOff className="h-3 w-3 mr-1" />
              Hide All
            </Button>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredColumns.map(column => (
              <div
                key={column}
                className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                onClick={() => toggleColumn(column)}
              >
                <Checkbox
                  checked={visibleColumns.has(column)}
                  onCheckedChange={() => toggleColumn(column)}
                />
                <label className="text-sm cursor-pointer flex-1">
                  {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
              </div>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
