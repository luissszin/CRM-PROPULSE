import { Link, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Bot,
  Users,
  Settings,
  LogOut,
  Building2,
  Phone,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { PropulseLogo } from '@/components/brand/PropulseLogo';
import { cn } from '@/lib/utils';

export function UnitSidebar() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { logout, currentUser, currentUnit } = useMultiTenantStore();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `/${slug}/dashboard` },
    { icon: Kanban, label: 'Funil', path: `/${slug}/funnel` },
    { icon: MessageSquare, label: 'Conversas', path: `/${slug}/inbox` },
    { icon: Zap, label: 'Automação', path: `/${slug}/automations` },
    { icon: Phone, label: 'WhatsApp', path: `/${slug}/whatsapp` },
    { icon: Bot, label: 'Chatbot', path: `/${slug}/chatbot` },
    { icon: Users, label: 'Leads', path: `/${slug}/leads` },
    { icon: Settings, label: 'Campos', path: `/${slug}/fields` },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo - Propulse sempre na frente + logo da unidade */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <PropulseLogo size="sm" unitLogo={currentUnit?.logo} />
      </div>

      {/* Unit Info */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-primary/10 border border-primary/20">
          <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <p className="text-xs text-primary font-medium truncate">{currentUnit?.name}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                  <span className={cn("font-medium", isActive && "text-primary")}>{item.label}</span>
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