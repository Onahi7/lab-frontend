import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrders, useDeleteOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Search, CreditCard, Loader2, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/hooks/useOrders';
import { getPatientName, getGroupedTestsByPanel, getPanelTestCount } from '@/utils/orderHelpers';
import { PaymentDialog } from '@/components/orders/PaymentDialog';
import { toast } from 'sonner';

export default function OrdersPage() {
  const { profile, primaryRole } = useAuth();
  const currentRole = primaryRole === 'admin' ? 'admin' : 'receptionist';
  const isAdmin = primaryRole === 'admin';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmNum, setDeleteConfirmNum] = useState('');
  
  const { data: orders, isLoading } = useOrders(statusFilter as any);
  const deleteOrder = useDeleteOrder();

  const handleDeleteOrder = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteOrder.mutateAsync(deleteConfirmId);
      toast.success('Order deleted');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to delete order');
    }
  };

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
    collected: 'bg-primary/10 text-primary border-primary/20',
    processing: 'bg-status-warning/10 text-status-warning border-status-warning/20',
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
                    {(() => {
                      const testCount = getPanelTestCount(order);
                      const groupedTests = getGroupedTestsByPanel(order, true); // hide component counts
                      const displayItems = groupedTests.split(', ').slice(0, 2);
                      const totalItems = groupedTests.split(', ').length;
                      
                      return (
                        <div>
                          <p className="font-medium">{testCount} test{testCount !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-muted-foreground">
                            {displayItems.join(', ')}
                            {totalItems > 2 && ` +${totalItems - 2} more`}
                          </p>
                        </div>
                      );
                    })()}
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
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-status-critical hover:text-status-critical hover:bg-status-critical/10"
                          onClick={() => {
                            setDeleteConfirmId(order.id || (order as any)._id);
                            setDeleteConfirmNum(order.orderNumber || '');
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
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
            tests: (() => {
              // Group by panel for display
              const allTests = selectedOrder.order_tests || selectedOrder.tests || [];
              const panelGroups = new Map<string, { code: string; name: string; price: number }>();
              const individualTests: typeof allTests = [];
              
              for (const t of allTests) {
                const panelCode = t.panelCode || t.panel_code;
                const panelName = t.panelName || t.panel_name;
                if (panelCode || panelName) {
                  const key = panelCode || panelName;
                  if (!panelGroups.has(key)) {
                    panelGroups.set(key, {
                      code: panelCode || '',
                      name: panelName || panelCode || '',
                      price: t.price || 0,
                    });
                  }
                } else {
                  individualTests.push(t);
                }
              }
              
              return [
                ...Array.from(panelGroups.values()).map(p => ({ code: p.code, name: p.name, price: p.price })),
                ...individualTests.map(t => ({
                  code: t.testCode || t.test_code || '',
                  name: t.testName || t.test_name || '',
                  price: t.price || 0,
                }))
              ];
            })(),
            subtotal: selectedOrder.subtotal || selectedOrder.total || selectedOrder.totalAmount || 0,
            discount: selectedOrder.discount || 0,
            discountType: (selectedOrder.discountType || 'fixed') as 'percentage' | 'fixed',
            total: selectedOrder.total || selectedOrder.totalAmount || 0,
          }}
          cashierName={profile?.full_name || 'Receptionist'}
        />
      )}
      {/* Delete Order Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Permanently delete order <strong>{deleteConfirmNum}</strong>? This will also remove all associated tests and payments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrder}
              disabled={deleteOrder.isPending}
            >
              {deleteOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
