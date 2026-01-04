import { Link, useLocation } from 'react-router-dom';
import { Building2, Users, Settings, LogOut, LayoutDashboard, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { PropulseLogo } from '@/components/brand/PropulseLogo';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Building2, label: 'Unidades', path: '/admin/units' },
  { icon: Users, label: 'Usuários', path: '/admin/users' },
  { icon: Settings, label: 'Configurações', path: '/admin/settings' },
];

export function AdminSidebar() {
  const location = useLocation();
  const { logout, currentUser } = useMultiTenantStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="h-12 flex items-center px-4 border-b border-sidebar-border">
        <PropulseLogo size="sm" />
      </div>

      {/* Admin Badge */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        <div className="px-2 py-1.5 rounded bg-accent/10 border border-accent/20">
          <p className="text-[10px] text-accent font-medium uppercase tracking-wide">Super Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive && "text-accent")} />
                  <span className={cn("font-medium", isActive && "text-accent")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-sidebar-border">
        {currentUser && (
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-border"
            />
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}