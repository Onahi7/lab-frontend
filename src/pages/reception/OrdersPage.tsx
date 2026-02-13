import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrders, useUpdateOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, CreditCard, Banknote, Smartphone, Check, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { OrderWithDetails } from '@/hooks/useOrders';

type PaymentMethod = Database['public']['Enums']['payment_method'];

export default function OrdersPage() {
  const { profile } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  const { data: orders, isLoading } = useOrders(statusFilter as any);
  const updateOrder = useUpdateOrder();

  const filteredOrders = orders?.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(search) ||
      order.patients.first_name.toLowerCase().includes(search) ||
      order.patients.last_name.toLowerCase().includes(search) ||
      order.patients.patient_id.toLowerCase().includes(search)
    );
  });

  const handleProcessPayment = async () => {
    if (!selectedOrder || !selectedPaymentMethod) return;

    try {
      await updateOrder.mutateAsync({
        id: selectedOrder.id,
        updates: {
          payment_status: 'paid',
          payment_method: selectedPaymentMethod,
          status: selectedOrder.status === 'pending_payment' ? 'pending_collection' : selectedOrder.status,
        },
      });
      toast.success('Payment processed successfully');
      setShowPaymentDialog(false);
      setSelectedOrder(null);
      setSelectedPaymentMethod(null);
    } catch (error) {
      toast.error('Failed to process payment');
    }
  };

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
      role="receptionist"
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
                <tr key={order.id}>
                  <td className="font-mono text-sm">{order.order_number}</td>
                  <td>
                    <div>
                      <p className="font-medium">{order.patients.first_name} {order.patients.last_name}</p>
                      <p className="text-xs text-muted-foreground">{order.patients.patient_id}</p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium">{order.order_tests.length} test(s)</p>
                      <p className="text-xs text-muted-foreground">
                        {order.order_tests.slice(0, 2).map(t => t.test_code).join(', ')}
                        {order.order_tests.length > 2 && ` +${order.order_tests.length - 2}`}
                      </p>
                    </div>
                  </td>
                  <td className="font-medium">Le {Number(order.total).toLocaleString()}</td>
                  <td>
                    <Badge variant="outline" className={cn('capitalize', priorityStyles[order.priority])}>
                      {order.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="outline" className={cn(
                      order.payment_status === 'paid' ? 'bg-status-normal/10 text-status-normal' :
                      order.payment_status === 'pending' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {order.payment_status}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="outline" className={cn('capitalize', statusStyles[order.status])}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground text-sm">
                    {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {order.payment_status !== 'paid' && (
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
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="py-4">
              <div className="bg-muted rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-mono">{selectedOrder.order_number}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Patient</span>
                  <span>{selectedOrder.patients.first_name} {selectedOrder.patients.last_name}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Amount Due</span>
                  <span>Le {Number(selectedOrder.total).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id as PaymentMethod)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                        selectedPaymentMethod === method.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <method.icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleProcessPayment} 
              disabled={!selectedPaymentMethod || updateOrder.isPending}
            >
              {updateOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Check className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
