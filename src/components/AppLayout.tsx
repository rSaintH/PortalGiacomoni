import { ReactNode, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePermissionSettings } from "@/hooks/useSupabaseQuery";
import { isSupervisorRole, canAccessAdmin as checkCanAccessAdmin, isNavItemVisible } from "@/services/permissions.logic";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Building2,
  Home,
  Users,
  FileText,
  ClipboardList,
  FileSpreadsheet,
  FolderSearch,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ArrowLeftToLine,
  ArrowRightFromLine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import gremioLogo from "@/assets/gremio-logo.png";
import renatoGauchoImage from "@/assets/renato-gaucho.jpeg";

const navItems = [
  { path: "/", label: "Início", icon: Home, permKey: null },
  { path: "/clients", label: "Clientes", icon: Users, permKey: null },
  { path: "/pops", label: "POPs", icon: FileText, permKey: null },
  { path: "/tasks", label: "Pendências", icon: ClipboardList, permKey: null },
  { path: "/reinf", label: "EFD-REINF", icon: FileSpreadsheet, permKey: null },
  { path: "/documents", label: "Documentos", icon: FolderSearch, permKey: null },
  { path: "/accounting-ready", label: "Contabilidades Prontas", icon: ClipboardCheck, permKey: "view_accounting_ready" },
  { path: "/management", label: "Gerência", icon: ShieldCheck, permKey: "view_management" },
];

const adminItems = [
  { path: "/admin", label: "Administração", icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, userRole, userSectorId, signOut } = useAuth();
  const { easterEggUnlocked, palette, paletteActive } = useTheme();
  const { data: permissions } = usePermissionSettings();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const isGremioThemeActive =
    paletteActive &&
    palette.primary.toLowerCase() === "#00a3e0" &&
    palette.sidebarBackground.toLowerCase() === "#000000";

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem("sidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  const easterEggItems = easterEggUnlocked
    ? [{ path: "/customization", label: "Customização", icon: Sparkles, permKey: null }]
    : [];

  const isSupervisor = isSupervisorRole(userRole);
  const hasAdminAccess = checkCanAccessAdmin(isAdmin, userRole);

  // Filter nav items by permission settings
  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) =>
      isNavItemVisible(item.permKey, isAdmin, userRole, userSectorId, permissions as any)
    );
  }, [permissions, userRole, userSectorId, isAdmin]);

  const allItems = [...visibleNavItems, ...(hasAdminAccess ? adminItems : []), ...easterEggItems];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          // Mobile
          sidebarOpen ? "translate-x-0 w-60" : "-translate-x-full w-60",
          // Desktop
          "lg:static lg:translate-x-0",
          sidebarCollapsed ? "lg:w-0 lg:overflow-hidden" : "lg:w-64"
        )}
      >
        <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border justify-between">
          <div className="flex items-center gap-2">
            {isGremioThemeActive ? (
              <img
                src={gremioLogo}
                alt="Gremio"
                className="h-7 w-7 object-contain flex-shrink-0"
                loading="lazy"
              />
            ) : (
              <Building2 className="h-6 w-6 text-sidebar-primary flex-shrink-0" />
            )}
            <span className="font-bold text-lg text-sidebar-accent-foreground whitespace-nowrap">ContaOffice</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent h-8 w-8"
            onClick={toggleCollapsed}
          >
            <ArrowLeftToLine className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {allItems.map((item) => {
            const active = location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            );
          })}

          {isGremioThemeActive && (
            <div className="mt-4 rounded-md border border-sidebar-border bg-sidebar-accent/70 p-2">
              <img
                src={renatoGauchoImage}
                alt="Renato Gaucho"
                className="h-50 w-full rounded object-cover object-top"
                loading="lazy"
              />
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-sidebar-accent-foreground">
                {user?.email}
              </p>
              <p className="text-[10px] text-sidebar-muted">
                {{ admin: "Admin", supervisao: "Supervisão", colaborador: "Colaborador" }[userRole] || "Colaborador"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
        )}
      >
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={toggleCollapsed}
            >
              <ArrowRightFromLine className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
