import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useSearchPatients } from '@/hooks/usePatients';
import { useOrders } from '@/hooks/useOrders';
import { useResults } from '@/hooks/useResults';
import { useMachines } from '@/hooks/useMachines';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useRealtimeResults } from '@/hooks/useRealtimeResults';
import { useRealtimePatients } from '@/hooks/useRealtimePatients';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/button';
import { getPatientName, getTestCodes, getOrderNumber } from '@/utils/orderHelpers';
import { 
  Users, 
  ClipboardList, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  Cpu,
  DollarSign,
  Clock,
  BarChart3,
  Printer,
  Shield,
  Settings,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { profile } = useAuth();
  
  useRealtimeOrders();
  useRealtimeResults();
  useRealtimePatients();
  
  const { data: patients = [] } = useSearchPatients('');
  const { data: orders = [], isLoading } = useOrders('all');
  const { data: results = [] } = useResults();
  const { data: machines } = useMachines();
  const navigate = useNavigate();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayPatients = patients.filter(p => new Date(p.createdAt) >= todayStart).length;
  const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart).length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const criticalResults = results.filter(r => r.flag === 'critical_high' || r.flag === 'critical_low').length;
  const todayRevenue = orders
    .filter(o => new Date(o.createdAt) >= todayStart && o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0);
  const onlineMachines = machines?.filter((m: any) => m.status === 'online' || m.status === 'processing').length || 0;
  const totalMachines = machines?.length || 0;
  
  const completedOrdersWithTime = orders.filter(o => o.status === 'completed' && o.completedAt);
  const avgTAT = completedOrdersWithTime.length > 0
    ? Math.round(
        completedOrdersWithTime.reduce((sum, o) => {
          const start = new Date(o.createdAt).getTime();
          const end = new Date(o.completedAt!).getTime();
          return sum + (end - start) / (1000 * 60);
        }, 0) / completedOrdersWithTime.length
      )
    : 0;

  const quickLinks = [
    { icon: Shield, label: 'User Management', to: '/admin/users' },
    { icon: BarChart3, label: 'Reports & Analytics', to: '/admin/reports' },
    { icon: Cpu, label: 'Machine Config', to: '/admin/machines' },
    { icon: Printer, label: 'Printer Settings', to: '/admin/printers' },
    { icon: DollarSign, label: 'Reconciliation', to: '/admin/reconciliation' },
    { icon: Settings, label: 'System Settings', to: '/admin/settings' },
  ];

  return (
    <RoleLayout 
      title="Admin Dashboard" 
      subtitle="System overview and management"
      role="admin"
      userName={profile?.full_name}
    >
      {/* Key Metrics - 2 rows of 4 on desktop, 2-col on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          title="Patients Today"
          value={todayPatients}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Orders Today"
          value={todayOrders}
          icon={ClipboardList}
        />
        <MetricCard
          title="Pending"
          value={pendingOrders}
          icon={Clock}
          variant={pendingOrders > 10 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Completed"
          value={completedOrders}
          icon={FileText}
        />
        <MetricCard
          title="Critical Results"
          value={criticalResults}
          icon={AlertTriangle}
          variant={criticalResults > 0 ? 'critical' : 'default'}
        />
        <MetricCard
          title="Machines"
          value={`${onlineMachines}/${totalMachines}`}
          icon={Cpu}
        />
        <MetricCard
          title="Revenue Today"
          value={`Le ${todayRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Avg TAT"
          value={avgTAT > 0 ? `${avgTAT}m` : 'N/A'}
          icon={TrendingUp}
        />
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {quickLinks.map(({ icon: Icon, label, to }, index) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={cn(
              "group flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200",
              index === 0
                ? "border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary hover:border-primary"
                : "border bg-card hover:bg-secondary hover:shadow-md"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              index === 0
                ? "bg-primary/10 group-hover:bg-white/20"
                : "bg-muted group-hover:bg-primary/10"
            )}>
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                index === 0
                  ? "text-primary group-hover:text-white"
                  : "text-muted-foreground group-hover:text-primary"
              )} />
            </div>
            <span className={cn(
              "text-xs font-semibold text-center leading-tight",
              index === 0
                ? "text-primary group-hover:text-white"
                : "text-foreground"
            )}>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Recent Orders</h3>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/admin/orders')}>
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th className="hidden md:table-cell">Tests</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(-5).reverse().map(order => (
                  <tr key={order.id || order._id}>
                    <td className="font-mono text-xs">{getOrderNumber(order)}</td>
                    <td className="text-sm">{getPatientName(order)}</td>
                    <td className="text-sm hidden md:table-cell">{getTestCodes(order)}</td>
                    <td className="font-medium text-sm">Le {(order.total || order.totalAmount || 0).toLocaleString()}</td>
                    <td>
                      <span className={cn(
                        'status-badge capitalize',
                        order.status === 'completed' && 'status-normal',
                        order.status === 'processing' && 'bg-primary/10 text-primary',
                        (order.status === 'pending_collection' || order.status === 'pending_payment') && 'status-pending'
                      )}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-sm">System Status</h3>
          </div>
          <div className="p-5 space-y-5">
            {/* Machine Status Summary */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Analyzers</p>
              <div className="space-y-2.5">
                {machines && machines.length > 0 ? (
                  machines.map((machine: any) => (
                    <div key={machine.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{machine.model || machine.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn(
                          'machine-indicator',
                          machine.status === 'online' && 'machine-online',
                          machine.status === 'offline' && 'machine-offline',
                          machine.status === 'error' && 'machine-error',
                          machine.status === 'processing' && 'machine-processing',
                        )} />
                        <span className={cn(
                          'text-xs font-medium capitalize',
                          machine.status === 'online' && 'text-status-normal',
                          machine.status === 'offline' && 'text-muted-foreground',
                          machine.status === 'error' && 'text-status-critical',
                          machine.status === 'processing' && 'text-primary',
                        )}>
                          {machine.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No machines configured</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="pt-4 border-t">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Today's Summary</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tests</span>
                  <span className="font-semibold">{orders.reduce((sum, o) => sum + (o.order_tests?.length || 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-semibold text-status-normal">Le {todayRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turnaround</span>
                  <span className="font-semibold">{avgTAT > 0 ? `${avgTAT} min` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}
