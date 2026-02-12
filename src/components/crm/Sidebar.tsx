import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Calendar, Shield, LogOut, ChevronLeft, ClipboardList, Menu, Sun, Moon, Contact, Building2, Handshake, ListTodo, Package, Mail, Zap, TrendingUp } from 'lucide-react';
import webforgeLogo from '@/assets/webforge-logo.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';

function DarkModeToggle({ collapsed }: { collapsed: boolean }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center'
      )}
    >
      {isDark ? <Moon className="h-5 w-5 text-sidebar-foreground flex-shrink-0" /> : <Sun className="h-5 w-5 text-sidebar-foreground flex-shrink-0" />}
      {!collapsed && (
        <>
          <span className="text-sm font-medium text-sidebar-foreground flex-1 text-left">Dark Mode</span>
          <Switch checked={isDark} onCheckedChange={setIsDark} onClick={(e) => e.stopPropagation()} />
        </>
      )}
    </button>
  );
}

type View = 'dashboard' | 'clients' | 'followups' | 'logs' | 'admin' | 'contacts' | 'accounts' | 'deals' | 'activities' | 'products' | 'templates' | 'automation' | 'scoring';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients' as const, label: 'Clients', icon: Users },
  { id: 'contacts' as const, label: 'Contacts', icon: Contact },
  { id: 'accounts' as const, label: 'Accounts', icon: Building2 },
  { id: 'deals' as const, label: 'Deals', icon: Handshake },
  { id: 'activities' as const, label: 'Activities', icon: ListTodo },
  { id: 'products' as const, label: 'Products', icon: Package },
  { id: 'templates' as const, label: 'Email Templates', icon: Mail },
  { id: 'automation' as const, label: 'Automation', icon: Zap },
  { id: 'scoring' as const, label: 'Lead Scoring', icon: TrendingUp },
  { id: 'followups' as const, label: 'Follow-ups', icon: Calendar },
  { id: 'logs' as const, label: 'Action Logs', icon: ClipboardList },
];

function SidebarContent({ 
  activeView, 
  onViewChange, 
  collapsed, 
  onCollapse,
  onNavigate 
}: SidebarProps & { onNavigate?: () => void }) {
  const { isAdmin, signOut, profile } = useAuth();

  const handleNavClick = (view: View) => {
    onViewChange(view);
    onNavigate?.();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <img src={webforgeLogo} alt="WebForge" className="h-14 object-contain" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hidden md:flex"
          onClick={() => onCollapse(!collapsed)}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeView === item.id
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* Admin Section */}
        {isAdmin && (
          <button
            onClick={() => handleNavClick('admin')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeView === 'admin'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Shield className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>User Management</span>}
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <DarkModeToggle collapsed={collapsed} />
        {!collapsed && profile && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {profile.full_name || profile.email}
          </div>
        )}
        <button
          onClick={signOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ activeView, onViewChange, collapsed, onCollapse }: SidebarProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 bg-background shadow-md border"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar">
          <SidebarContent
            activeView={activeView}
            onViewChange={onViewChange}
            collapsed={false}
            onCollapse={onCollapse}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent
        activeView={activeView}
        onViewChange={onViewChange}
        collapsed={collapsed}
        onCollapse={onCollapse}
      />
    </aside>
  );
}
