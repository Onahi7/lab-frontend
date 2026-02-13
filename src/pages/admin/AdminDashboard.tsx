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
import { 
  Users, 
  ClipboardList, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  Cpu,
  DollarSign,
  Clock,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { profile } = useAuth();
  
  // Enable real-time updates
  useRealtimeOrders();
  useRealtimeResults();
  useRealtimePatients();
  
  const { data: patients = [] } = useSearchPatients('');
  const { data: orders = [] } = useOrders('all');
  const { data: results = [] } = useResults();
  const { data: machines } = useMachines();
  const navigate = useNavigate();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayPatients = patients.filter(p => new Date(p.created_at) >= todayStart).length;
  const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart).length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const criticalResults = results.filter(r => r.flag === 'critical_high' || r.flag === 'critical_low').length;
  const todayRevenue = orders
    .filter(o => new Date(o.created_at) >= todayStart && o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);
  const onlineMachines = machines?.filter((m: any) => m.status === 'online' || m.status === 'processing').length || 0;
  const totalMachines = machines?.length || 0;
  
  // Calculate average turnaround time (in minutes)
  const completedOrdersWithTime = orders.filter(o => o.status === 'completed' && o.completed_at);
  const avgTAT = completedOrdersWithTime.length > 0
    ? Math.round(
        completedOrdersWithTime.reduce((sum, o) => {
          const start = new Date(o.created_at).getTime();
          const end = new Date(o.completed_at!).getTime();
          return sum + (end - start) / (1000 * 60); // Convert to minutes
        }, 0) / completedOrdersWithTime.length
      )
    : 0;

  return (
    <RoleLayout 
      title="Admin Dashboard" 
      subtitle="System overview and management"
      role="admin"
      userName={profile?.full_name}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
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
          value={`Le ${(todayRevenue / 1000).toFixed(0)}K`}
          icon={DollarSign}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Avg TAT"
          value={avgTAT > 0 ? `${avgTAT}m` : 'N/A'}
          icon={TrendingUp}
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Button 
          variant="outline" 
          className="h-16 justify-start px-4"
          onClick={() => navigate('/admin/users')}
        >
          <Users className="w-5 h-5 mr-3" />
          <span className="font-medium">User Management</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 justify-start px-4"
          onClick={() => navigate('/admin/reports')}
        >
          <BarChart3 className="w-5 h-5 mr-3" />
          <span className="font-medium">Reports & Analytics</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 justify-start px-4"
          onClick={() => navigate('/admin/machines')}
        >
          <Cpu className="w-5 h-5 mr-3" />
          <span className="font-medium">Machine Config</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 justify-start px-4"
          onClick={() => navigate('/admin/settings')}
        >
          <TrendingUp className="w-5 h-5 mr-3" />
          <span className="font-medium">System Settings</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-card border rounded-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Recent Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Tests</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(-5).reverse().map(order => (
                  <tr key={order.id}>
                    <td className="font-mono text-sm">{order.order_number}</td>
                    <td>{order.patients.first_name} {order.patients.last_name}</td>
                    <td>{(order.order_tests || []).map((t: any) => t.test_code).join(', ')}</td>
                    <td className="font-medium">Le {order.total.toLocaleString()}</td>
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
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card border rounded-lg">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold">System Status</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Machine Status Summary */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Analyzers</p>
              <div className="space-y-2">
                {machines && machines.length > 0 ? (
                  machines.map((machine: any) => (
                    <div key={machine.id} className="flex items-center justify-between text-sm">
                      <span>{machine.model || machine.name}</span>
                      <div className="flex items-center gap-2">
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

            {/* Staff Activity */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Active Staff</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Receptionists</span>
                  <span className="font-medium">2 online</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Lab Technicians</span>
                  <span className="font-medium">3 online</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Today's Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Tests</span>
                  <span className="font-medium">{orders.reduce((sum, o) => sum + (o.order_tests?.length || 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Revenue</span>
                  <span className="font-medium text-status-normal">Le {todayRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}
