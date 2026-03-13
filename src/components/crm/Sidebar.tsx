import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Calendar, Shield, LogOut, ChevronLeft, ClipboardList, Menu, Sun, Moon, Contact, Building2, Handshake, ListTodo, Package, Mail, Zap, TrendingDown, FileText, Receipt, Paperclip, GitBranch, Trash2, CheckSquare, Lock, FileInput, Target, MessageCircle, UserPlus } from 'lucide-react';
import webforgeLogo from '@/assets/webforge-logo.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { useActiveChats } from '@/hooks/useChatMessages';
import { Switch } from '@/components/ui/switch';
import { useNavigate, useLocation } from 'react-router-dom';

function DarkModeToggle({ collapsed }: { collapsed: boolean }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    // Default to dark mode if no preference saved
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className={cn(
        'w-full flex items-center gap-3 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed ? 'justify-center px-2' : 'px-3'
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

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Permission key required to see this item. Undefined = always visible. */
  requiredPermission?: string;
  /** If true, only admins see this item */
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, requiredPermission: 'view_dashboard' },
      { path: '/revenue-leakage', label: 'Revenue Leakage', icon: TrendingDown, requiredPermission: 'view_revenue' },
      { path: '/kpis', label: 'KPIs', icon: Target, requiredPermission: 'view_kpis' },
      { path: '/tasks', label: 'Tasks', icon: CheckSquare, requiredPermission: 'manage_tasks' },
    ],
  },
  {
    label: 'Contacts & Sales',
    items: [
      { path: '/clients', label: 'Clients', icon: Users, requiredPermission: 'manage_clients' },
      { path: '/contacts', label: 'Contacts', icon: Contact, requiredPermission: 'view_all_contacts' },
      { path: '/accounts', label: 'Accounts', icon: Building2, requiredPermission: 'view_all_accounts' },
      { path: '/deals', label: 'Deals', icon: Handshake, requiredPermission: 'manage_deals' },
      { path: '/activities', label: 'Activities', icon: ListTodo },
      { path: '/followups', label: 'Follow-ups', icon: Calendar },
      { path: '/bulk-assign', label: 'Assign Clients', icon: UserPlus, requiredPermission: 'assign_clients' },
    ],
  },
  {
    label: 'Products & Billing',
    items: [
      { path: '/products', label: 'Products', icon: Package },
      { path: '/quotes', label: 'Quotes', icon: FileText, requiredPermission: 'manage_quotes' },
      { path: '/invoices', label: 'Invoices', icon: Receipt, requiredPermission: 'manage_invoices' },
    ],
  },
  {
    label: 'Automation & Config',
    items: [
      { path: '/automation', label: 'Automation', icon: Zap, adminOnly: true },
      { path: '/pipeline-stages', label: 'Pipeline Stages', icon: GitBranch, adminOnly: true },
      { path: '/templates', label: 'Email Templates', icon: Mail },
      { path: '/forms', label: 'Lead Forms', icon: FileInput, adminOnly: true },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/documents', label: 'Documents', icon: Paperclip },
      { path: '/logs', label: 'Action Logs', icon: ClipboardList },
      { path: '/trash', label: 'Trash', icon: Trash2, requiredPermission: 'restore_trash' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

function SidebarContent({ 
  collapsed, 
  onCollapse,
  onNavigate 
}: SidebarProps & { onNavigate?: () => void }) {
  const { isAdmin, signOut, profile, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className={cn(
        "h-20 flex items-center border-b border-sidebar-border",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!collapsed && (
          <img src={webforgeLogo} alt="WebForge" className="h-14 object-contain" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hidden md:flex flex-shrink-0"
          onClick={() => onCollapse(!collapsed)}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
        </Button>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (isAdmin) return true;
            if (item.adminOnly) return false;
            if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="border-t border-sidebar-border my-1" />}
              {visibleItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all',
                    collapsed ? 'justify-center px-2' : 'px-3',
                    isActive(item.path)
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_12px_hsl(var(--neon-glow)/0.5),0_0_24px_hsl(var(--neon-glow)/0.2)]'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          );
        })}

        {/* Admin Section */}
        {isAdmin && (
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Admin
              </p>
            )}
            {collapsed && <div className="border-t border-sidebar-border my-1" />}
            <button
              onClick={() => handleNavClick('/admin')}
              className={cn(
                'w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive('/admin')
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_12px_hsl(var(--neon-glow)/0.5),0_0_24px_hsl(var(--neon-glow)/0.2)]'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Shield className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>User Management</span>}
            </button>
            <button
              onClick={() => handleNavClick('/permissions')}
              className={cn(
                'w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive('/permissions')
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_12px_hsl(var(--neon-glow)/0.5),0_0_24px_hsl(var(--neon-glow)/0.2)]'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Lock className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Permissions</span>}
            </button>
            <button
              onClick={() => handleNavClick('/chats')}
              className={cn(
                'w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive('/chats')
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_12px_hsl(var(--neon-glow)/0.5),0_0_24px_hsl(var(--neon-glow)/0.2)]'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <MessageCircle className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>All Chats</span>}
            </button>
          </div>
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
            'w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            collapsed ? 'justify-center px-2' : 'px-3',
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

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
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
        collapsed={collapsed}
        onCollapse={onCollapse}
      />
    </aside>
  );
}
