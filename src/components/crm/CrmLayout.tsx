import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';

export function CrmLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar with notifications */}
        <div className="flex-shrink-0 flex justify-end px-4 pt-3 pb-1 md:px-6 md:pt-4 md:pb-0">
          <NotificationBell />
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6 pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
