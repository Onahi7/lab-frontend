import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useSearchPatients } from '@/hooks/usePatients';
import { useOrders } from '@/hooks/useOrders';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useRealtimePatients } from '@/hooks/useRealtimePatients';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  ClipboardList, 
  Users, 
  CreditCard,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReceptionDashboard() {
  const { profile } = useAuth();
  
  // Enable real-time updates
  useRealtimeOrders();
  useRealtimePatients();
  
  const { data: patients = [] } = useSearchPatients('');
  const { data: orders = [] } = useOrders('all');
  const navigate = useNavigate();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayPatients = Array.isArray(patients) ? patients.filter(p => new Date(p.createdAt) >= todayStart).length : 0;
  const pendingOrders = Array.isArray(orders) ? orders.filter(o => o.status === 'pending_collection' || o.status === 'collected').length : 0;
  const todayRevenue = Array.isArray(orders) ? orders
    .filter(o => new Date(o.createdAt) >= todayStart && o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0) : 0;

  return (
    <RoleLayout 
      title="Reception Dashboard" 
      subtitle="Patient registration and order management"
      role="receptionist"
      userName={profile?.full_name}
    >
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Button 
          size="lg" 
          className="h-24 text-lg"
          onClick={() => navigate('/reception/register')}
        >
          <UserPlus className="w-6 h-6 mr-3" />
          Register New Patient
        </Button>
        <Button 
          size="lg" 
          variant="secondary"
          className="h-24 text-lg"
          onClick={() => navigate('/reception/new-order')}
        >
          <ClipboardList className="w-6 h-6 mr-3" />
          Create Test Order
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          className="h-24 text-lg"
          onClick={() => navigate('/reception/patients')}
        >
          <Users className="w-6 h-6 mr-3" />
          Search Patients
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          className="h-24 text-lg"
          onClick={() => navigate('/reception/enter-results')}
        >
          <ClipboardList className="w-6 h-6 mr-3" />
          Enter Results
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Patients Today"
          value={todayPatients}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Pending Orders"
          value={pendingOrders}
          icon={ClipboardList}
          variant={pendingOrders > 5 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Revenue Today"
          value={`Le ${todayRevenue.toLocaleString()}`}
          icon={TrendingUp}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Avg Wait Time"
          value="12 min"
          icon={Clock}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-card border rounded-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Recent Registrations</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reception/patients')}>
              View All
            </Button>
          </div>
          <div className="divide-y">
            {patients.slice(-5).reverse().map((patient: any) => (
              <div key={patient.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                    <p className="text-sm text-muted-foreground">{patient.patientId}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/reception/new-order?patient=${patient.id}`)}>
                    New Order
                  </Button>
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No patients registered yet
              </div>
            )}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-card border rounded-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Pending Payments</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reception/payments')}>
              View All
            </Button>
          </div>
          <div className="divide-y">
            {Array.isArray(orders) && orders.filter(o => o.paymentStatus === 'pending').slice(0, 5).map(order => (
              <div key={order.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{order.patient?.firstName} {order.patient?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Le {order.totalAmount.toLocaleString()}</p>
                    <Button variant="default" size="sm" className="mt-1">
                      <CreditCard className="w-3 h-3 mr-1" />
                      Pay
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {Array.isArray(orders) && orders.filter(o => o.paymentStatus === 'pending').length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No pending payments
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}
