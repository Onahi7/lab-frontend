import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { usePendingCollectionOrders, useProcessingOrders, useTodayOrders } from '@/hooks/useOrders';
import { useCriticalResults } from '@/hooks/useResults';
import { useMachines } from '@/hooks/useMachines';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useRealtimeResults } from '@/hooks/useRealtimeResults';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { MachineStatusCard } from '@/components/dashboard/MachineStatusCard';
import { LiveConnectionMonitor } from '@/components/machines/LiveConnectionMonitor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPatientName, getTestCodes, getOrderId, getOrderPriority } from '@/utils/orderHelpers';
import { 
  TestTube, 
  FileText, 
  FlaskConical,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function LabDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Enable real-time updates
  useRealtimeOrders();
  useRealtimeResults();

  const { data: pendingOrders, isLoading: pendingLoading } = usePendingCollectionOrders();
  const { data: processingOrders, isLoading: processingLoading } = useProcessingOrders();
  const { data: todayOrders } = useTodayOrders();
  const { data: criticalResults } = useCriticalResults();
  const { data: machines } = useMachines();

  const completedToday = Array.isArray(todayOrders) ? todayOrders.filter(o => o.status === 'completed').length : 0;
  const onlineMachines = Array.isArray(machines) ? machines.filter(m => m.status === 'online' || m.status === 'processing').length : 0;

  const isLoading = pendingLoading || processingLoading;

  return (
    <RoleLayout 
      title="Lab Dashboard" 
      subtitle="Sample processing and result management"
      role="lab-tech"
      userName={profile?.full_name}
    >
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Button 
          size="lg" 
          className="h-20 text-lg"
          onClick={() => navigate('/lab/collect')}
        >
          <TestTube className="w-6 h-6 mr-3" />
          Collect Samples ({pendingOrders?.length || 0})
        </Button>
        <Button 
          size="lg" 
          variant="secondary"
          className="h-20 text-lg"
          onClick={() => navigate('/lab/processing')}
        >
          <FlaskConical className="w-6 h-6 mr-3" />
          Enter Results ({processingOrders?.length || 0})
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          className="h-20 text-lg"
          onClick={() => navigate('/lab/results')}
        >
          <FileText className="w-6 h-6 mr-3" />
          View All Results
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Pending Collection"
          value={pendingOrders?.length || 0}
          icon={TestTube}
          variant={(pendingOrders?.length || 0) > 5 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Processing"
          value={processingOrders?.length || 0}
          icon={FlaskConical}
        />
        <MetricCard
          title="Completed Today"
          value={completedToday}
          icon={CheckCircle}
        />
        <MetricCard
          title="Critical Results"
          value={criticalResults?.length || 0}
          icon={AlertTriangle}
          variant={(criticalResults?.length || 0) > 0 ? 'critical' : 'default'}
        />
        <MetricCard
          title="Machines Online"
          value={`${onlineMachines}/${machines?.length || 0}`}
          icon={Cpu}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pending Samples Queue */}
        <div className="bg-card border rounded-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Pending Sample Collection</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/lab/collect')}>
              View All
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {Array.isArray(pendingOrders) && pendingOrders.slice(0, 5).map(order => {
                const patientName = getPatientName(order);
                const orderId = getOrderId(order);
                
                return (
                  <div key={getOrderId(order)} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {patientName}
                          </p>
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            order.priority === 'stat' ? 'bg-status-critical/10 text-status-critical' :
                            order.priority === 'urgent' ? 'bg-status-warning/10 text-status-warning' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {getOrderPriority(order)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{getTestCodes(order)}</p>
                      </div>
                      <Button size="sm" onClick={() => navigate(`/lab/collect?order=${getOrderId(order)}`)}>
                        Collect
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(!pendingOrders || !Array.isArray(pendingOrders) || pendingOrders.length === 0) && (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  No samples pending collection
                </div>
              )}
            </div>
          )}
        </div>

        {/* Processing Queue */}
        <div className="bg-card border rounded-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Awaiting Results</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/lab/processing')}>
              View All
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {Array.isArray(processingOrders) && processingOrders.slice(0, 5).map(order => (
                <div key={getOrderId(order)} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getPatientName(order)}</p>
                      <p className="text-sm text-muted-foreground">{getTestCodes(order)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/lab/processing?order=${getOrderId(order)}`)}>
                      Enter Results
                    </Button>
                  </div>
                </div>
              ))}
              {(!processingOrders || !Array.isArray(processingOrders) || processingOrders.length === 0) && (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  No samples currently processing
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Status */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Analyzer Status</h3>
          <div className="grid grid-cols-1 gap-3">
            {machines?.slice(0, 3).map(machine => (
              <MachineStatusCard key={machine.id} machine={machine as any} />
            ))}
            {(!machines || machines.length === 0) && (
              <p className="text-muted-foreground text-center py-4">No analyzers configured</p>
            )}
          </div>
        </div>

        {/* Live Connection Monitor */}
        <LiveConnectionMonitor />
      </div>
    </RoleLayout>
  );
}
