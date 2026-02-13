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
import { Search, CreditCard, Banknote, Smartphone, Check, Loader2, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { OrderWithDetails } from '@/hooks/useOrders';

type PaymentMethod = Database['public']['Enums']['payment_method'];

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [paymentFilter, setPaymentFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  const { data: orders, isLoading } = useOrders('all');
  const updateOrder = useUpdateOrder();

  const filteredOrders = orders?.filter(order => {
    // Filter by payment status
    if (paymentFilter !== 'all' && order.payment_status !== paymentFilter) return false;
    
    // Filter by search
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(search) ||
      order.patients.first_name.toLowerCase().includes(search) ||
      order.patients.last_name.toLowerCase().includes(search)
    );
  });

  const pendingTotal = orders
    ?.filter(o => o.payment_status === 'pending')
    .reduce((sum, o) => sum + Number(o.total), 0) || 0;

  const paidTodayTotal = orders
    ?.filter(o => {
      if (o.payment_status !== 'paid') return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(o.created_at) >= today;
    })
    .reduce((sum, o) => sum + Number(o.total), 0) || 0;

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

  return (
    <RoleLayout 
      title="Payments" 
      subtitle="Process and track order payments"
      role="receptionist"
      userName={profile?.full_name}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pending Payments</p>
          <p className="text-2xl font-bold text-status-warning">
            Le {pendingTotal.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {orders?.filter(o => o.payment_status === 'pending').length || 0} orders
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Collected Today</p>
          <p className="text-2xl font-bold text-status-normal">
            Le {paidTodayTotal.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {orders?.filter(o => {
              if (o.payment_status !== 'paid') return false;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return new Date(o.created_at) >= today;
            }).length || 0} orders
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold">
            Le {orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total), 0).toLocaleString() || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {orders?.filter(o => o.payment_status === 'paid').length || 0} orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search orders..." 
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
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
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Total</th>
                <th>Method</th>
                <th>Status</th>
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
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </td>
                  <td>{order.order_tests.length}</td>
                  <td>Le {Number(order.subtotal).toLocaleString()}</td>
                  <td className="text-status-normal">
                    {Number(order.discount) > 0 ? `-Le ${Number(order.discount).toLocaleString()}` : '-'}
                  </td>
                  <td className="font-bold">Le {Number(order.total).toLocaleString()}</td>
                  <td className="capitalize text-muted-foreground">
                    {order.payment_method?.replace(/_/g, ' ') || '-'}
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
                    {order.payment_status !== 'paid' ? (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowPaymentDialog(true);
                        }}
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Pay
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <Receipt className="w-4 h-4 mr-1" />
                        Receipt
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {(!filteredOrders || filteredOrders.length === 0) && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    No payments found
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
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Le {Number(selectedOrder.subtotal).toLocaleString()}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between mb-2 text-status-normal">
                    <span>Discount</span>
                    <span>-Le {Number(selectedOrder.discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total Due</span>
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
