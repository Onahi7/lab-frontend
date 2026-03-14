import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CreditCard, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/hooks/useOrders';
import { getPatientName } from '@/utils/orderHelpers';
import { PaymentDialog } from '@/components/orders/PaymentDialog';

export default function OrdersPage() {
  const { profile, primaryRole } = useAuth();
  const currentRole = primaryRole === 'admin' ? 'admin' : 'receptionist';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  const { data: orders, isLoading } = useOrders(statusFilter as any);

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const orderNum = (order.orderNumber || order.order_number || '').toLowerCase();
    const firstName = (order.patientId?.firstName || order.patients?.first_name || '').toLowerCase();
    const lastName = (order.patientId?.lastName || order.patients?.last_name || '').toLowerCase();
    const patientId = (order.patientId?.patientId || order.patients?.patient_id || '').toLowerCase();
    
    return (
      orderNum.includes(search) ||
      firstName.includes(search) ||
      lastName.includes(search) ||
      patientId.includes(search)
    );
  }) : [];

  const statusStyles: Record<string, string> = {
    pending_payment: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    pending_collection: 'bg-primary/10 text-primary border-primary/20',
    collected: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-status-normal/10 text-status-normal border-status-normal/20',
    cancelled: 'bg-muted text-muted-foreground border-muted',
  };

  const priorityStyles: Record<string, string> = {
    routine: 'bg-muted text-muted-foreground',
    urgent: 'bg-status-warning/10 text-status-warning',
    stat: 'bg-status-critical/10 text-status-critical',
  };

  return (
    <RoleLayout 
      title="Orders" 
      subtitle="View and manage test orders"
      role={currentRole}
      userName={profile?.full_name}
    >
      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search orders..." 
              className="pl-10 w-80"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="pending_collection">Pending Collection</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
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
                <th>Tests</th>
                <th>Total</th>
                <th>Priority</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders?.map(order => (
                <tr key={order.id || order._id}>
                  <td className="font-mono text-sm">{order.orderNumber || order.order_number}</td>
                  <td>
                    <div>
                      <p className="font-medium">
                        {getPatientName(order)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.patientId?.patientId || order.patients?.patient_id}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium">{order.order_tests?.length || 0} test(s)</p>
                      <p className="text-xs text-muted-foreground">
                        {order.order_tests?.slice(0, 2).map(t => 
                          `${t.test_code || t.testCode} (${t.test_name || t.testName})`
                        ).join(', ')}
                        {order.order_tests?.length > 2 && ` +${order.order_tests.length - 2} more`}
                      </p>
                    </div>
                  </td>
                  <td className="font-medium">Le {Number(order.total || order.totalAmount).toLocaleString()}</td>
                  <td>
                    <Badge variant="outline" className={cn('capitalize', priorityStyles[order.priority])}>
                      {order.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="outline" className={cn(
                      (order.paymentStatus || order.payment_status) === 'paid' ? 'bg-status-normal/10 text-status-normal' :
                      (order.paymentStatus || order.payment_status) === 'pending' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {order.paymentStatus || order.payment_status}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="outline" className={cn('capitalize', statusStyles[order.status])}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground text-sm">
                    {format(new Date(order.createdAt || order.created_at), 'MMM dd, HH:mm')}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(order.paymentStatus || order.payment_status) !== 'paid' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowPaymentDialog(true);
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Pay
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!filteredOrders || filteredOrders.length === 0) && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Dialog */}
      {selectedOrder && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={(open) => {
            setShowPaymentDialog(open);
            if (!open) setSelectedOrder(null);
          }}
          order={{
            id: selectedOrder.id || (selectedOrder as any)._id || '',
            orderNumber: selectedOrder.orderNumber || selectedOrder.order_number || '',
            patientName: getPatientName(selectedOrder),
            patientId: selectedOrder.patient?.patientId || selectedOrder.patients?.patient_id || '',
            patientPhone: selectedOrder.patient?.phone || selectedOrder.patients?.phone,
            tests: (selectedOrder.order_tests || selectedOrder.tests || []).map(t => ({
              code: t.testCode || (t as any).test_code || '',
              name: t.testName || (t as any).test_name || '',
              price: t.price || 0,
            })),
            subtotal: selectedOrder.subtotal || selectedOrder.total || selectedOrder.totalAmount || 0,
            discount: selectedOrder.discount || 0,
            discountType: (selectedOrder.discountType || 'fixed') as 'percentage' | 'fixed',
            total: selectedOrder.total || selectedOrder.totalAmount || 0,
          }}
          cashierName={profile?.full_name || 'Receptionist'}
        />
      )}
    </RoleLayout>
  );
}
