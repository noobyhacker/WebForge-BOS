import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function CrmLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-4 md:p-6 pt-16 md:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
