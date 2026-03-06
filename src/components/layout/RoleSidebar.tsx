import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  FileText, 
  Cpu, 
  Settings,
  FlaskConical,
  UserPlus,
  CreditCard,
  TestTube,
  FileCheck,
  BarChart3,
  Shield,
  LucideIcon,
  LogOut,
  Calculator,
  FileEdit,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/lis';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Shield, label: 'User Management' },
    { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { to: '/admin/reconciliation', icon: Calculator, label: 'Reconciliation' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
    { to: '/admin/report-template', icon: FileEdit, label: 'Report Template' },
    { to: '/admin/test-catalog', icon: FlaskConical, label: 'Test Catalog' },
    { to: '/admin/patients', icon: Users, label: 'All Patients' },
    { to: '/admin/orders', icon: ClipboardList, label: 'All Orders' },
    { to: '/admin/results', icon: FileText, label: 'All Results' },
    { to: '/admin/machines', icon: Cpu, label: 'Machines' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ],
  receptionist: [
    { to: '/reception', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/reception/register', icon: UserPlus, label: 'Register Patient' },
    { to: '/reception/patients', icon: Users, label: 'Patients' },
    { to: '/reception/new-order', icon: ClipboardList, label: 'New Order' },
    { to: '/reception/orders', icon: FileText, label: 'Orders' },
    { to: '/reception/payments', icon: CreditCard, label: 'Payments' },
    { to: '/reception/reconciliation', icon: Calculator, label: 'Reconciliation' },
    { to: '/reception/enter-results', icon: FlaskConical, label: 'Quick Entry' },
    { to: '/reception/results', icon: FileCheck, label: 'View Results' },
  ],
  lab_tech: [
    { to: '/lab', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lab/match-results', icon: FlaskConical, label: 'Match Results' },
    { to: '/lab/pending', icon: ClipboardList, label: 'Pending Samples' },
    { to: '/lab/collect', icon: TestTube, label: 'Collect Samples' },
    { to: '/lab/processing', icon: FlaskConical, label: 'Processing' },
    { to: '/lab/results', icon: FileText, label: 'Enter Results' },
    { to: '/lab/patients', icon: Users, label: 'Patients' },
    { to: '/lab/machines', icon: Cpu, label: 'Machines' },
    { to: '/lab/test-catalog', icon: BookOpen, label: 'Test Catalog' },
  ],
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  receptionist: 'Reception',
  lab_tech: 'Laboratory',
};

interface RoleSidebarProps {
  role: UserRole;
  userName?: string;
}

export function RoleSidebar({ role, userName }: RoleSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const navItems = roleNavItems[role];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">LabConnect</h1>
            <p className="text-xs text-sidebar-foreground/60">{roleLabels[role]} Portal</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {userName && (
        <div className="px-6 py-3 border-b border-sidebar-border bg-sidebar-accent/30">
          <p className="text-xs text-sidebar-foreground/60">Logged in as</p>
          <p className="font-medium text-sm">{userName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'hover:bg-sidebar-accent text-sidebar-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </Button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/50">
          <p>Version 1.0.0</p>
          <p>HL7 • ASTM • FHIR Compatible</p>
        </div>
      </div>
    </aside>
  );
}
