import React from 'react';
import { Header } from '../components/Layout';

export function Schedules() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Schedules" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-muted-foreground">Schedules</h2>
            <p className="text-sm text-muted-foreground mt-2">This feature is coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
