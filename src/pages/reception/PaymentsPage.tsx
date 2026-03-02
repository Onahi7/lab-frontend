import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrders, useAddPayment, usePaymentHistory, usePaymentStats, useDailyIncome } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, CreditCard, Banknote, Smartphone, Check, Loader2, Receipt, TrendingUp, Calendar, History, Plus } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/hooks/useOrders';

export default function PaymentsPage() {
  const { profile, primaryRole } = useAuth();
  const currentRole = primaryRole === 'admin' ? 'admin' : 'receptionist';
  const [paymentFilter, setPaymentFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyOrderId, setHistoryOrderId] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('today');
  
  const { data: orders, isLoading } = useOrders('all');
  const addPayment = useAddPayment();
  const { data: paymentHistory, isLoading: historyLoading } = usePaymentHistory(historyOrderId);
  
  // Get date range for stats
  const getDateRange = () => {
    const end = new Date().toISOString();
    let start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start = subDays(start, 7);
        break;
      case 'month':
        start = subDays(start, 30);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }
    
    return { start: start.toISOString(), end };
  };
  
  const { start, end } = getDateRange();
  const { data: paymentStats } = usePaymentStats(start, end);
  const { data: dailyIncome } = useDailyIncome(start, end);

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    // Filter by payment status
    const paymentStatus = order.paymentStatus || order.payment_status;
    if (paymentFilter !== 'all' && paymentStatus !== paymentFilter) return false;
    
    // Filter by search
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const orderNum = (order.orderNumber || order.order_number || '').toLowerCase();
    const firstName = (order.patientId?.firstName || order.patients?.first_name || '').toLowerCase();
    const lastName = (order.patientId?.lastName || order.patients?.last_name || '').toLowerCase();
    
    return (
      orderNum.includes(search) ||
      firstName.includes(search) ||
      lastName.includes(search)
    );
  }) : [];

  const pendingTotal = Array.isArray(orders) ? orders
    .filter(o => ['pending', 'partial'].includes(o.paymentStatus || o.payment_status || ''))
    .reduce((sum, o) => sum + Number(o.balance ?? (Number(o.total || o.totalAmount || 0) - Number(o.amountPaid || 0))), 0) : 0;

  const paidTodayTotal = Array.isArray(orders) ? orders
    .filter(o => {
      const paymentStatus = o.paymentStatus || o.payment_status;
      if (paymentStatus !== 'paid') return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(o.createdAt || o.created_at) >= today;
    })
    .reduce((sum, o) => sum + Number(o.amountPaid || o.total || o.totalAmount || 0), 0) : 0;

  const handleProcessPayment = async () => {
    if (!selectedOrder || !selectedPaymentMethod) return;
    const orderId = selectedOrder.id || selectedOrder._id;
    const orderTotal = Number(selectedOrder.total || selectedOrder.totalAmount || 0);
    const alreadyPaid = Number(selectedOrder.amountPaid || 0);
    const remaining = orderTotal - alreadyPaid;
    const amount = parseFloat(paymentAmount) || remaining;

    if (amount <= 0 || amount > remaining + 0.001) {
      toast.error(`Amount must be between 0.01 and Le ${remaining.toLocaleString()}`);
      return;
    }

    try {
      await addPayment.mutateAsync({ orderId, data: { amount, paymentMethod: selectedPaymentMethod } });
      toast.success(`Payment of Le ${amount.toLocaleString()} recorded`);
      setShowPaymentDialog(false);
      setSelectedOrder(null);
      setSelectedPaymentMethod(null);
      setPaymentAmount('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process payment');
    }
  };

  return (
    <RoleLayout 
      title="Payments" 
      subtitle="Process and track order payments"
      role={currentRole as any}
      userName={profile?.full_name}
    >
      {/* Date Range Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
          <p className="text-2xl font-bold text-amber-600">
            Le {pendingTotal.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Pending &amp; partial orders
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Collected ({dateRange})</p>
          <p className="text-2xl font-bold text-status-normal">
            Le {(paymentStats?.paidRevenue || 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {paymentStats?.paidOrders || 0} orders
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">
            Le {(paymentStats?.totalRevenue || 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {paymentStats?.totalOrders || 0} orders
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Avg Daily Income
          </p>
          <p className="text-2xl font-bold">
            Le {dailyIncome && dailyIncome.length > 0 
              ? Math.round(dailyIncome.reduce((sum: number, day: any) => sum + day.totalIncome, 0) / dailyIncome.length).toLocaleString()
              : '0'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {dailyIncome?.length || 0} days
          </p>
        </div>
      </div>

      {/* Daily Income Breakdown */}
      {dailyIncome && dailyIncome.length > 0 && (
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-4">Daily Income Breakdown</h3>
          <div className="space-y-2">
            {dailyIncome.slice(0, 7).map((day: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{format(new Date(day.date), 'MMM dd, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{day.orderCount} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Le {day.totalIncome.toLocaleString()}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                    {day.cashPayments > 0 && <span>Cash: Le {day.cashPayments.toLocaleString()}</span>}
                    {day.orangeMoneyPayments > 0 && <span>Orange Money: Le {day.orangeMoneyPayments.toLocaleString()}</span>}
                    {day.afrimoneyPayments > 0 && <span>Afrimoney: Le {day.afrimoneyPayments.toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Last Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders?.map(order => {
                const orderNum = order.orderNumber || order.order_number;
                const firstName = order.patientId?.firstName || order.patients?.first_name;
                const lastName = order.patientId?.lastName || order.patients?.last_name;
                const createdAt = order.createdAt || order.created_at;
                const total = order.total || order.totalAmount || 0;
                const paymentMethod = order.paymentMethod || order.payment_method;
                const paymentStatus = order.paymentStatus || order.payment_status;
                const amountPaid = Number(order.amountPaid || 0);
                const balance = Number(order.balance ?? (Number(total) - amountPaid));
                
                return (
                  <tr key={order.id || order._id}>
                    <td className="font-mono text-sm">{orderNum}</td>
                    <td>
                      <div>
                        <p className="font-medium">{firstName} {lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(createdAt), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </td>
                    <td className="font-bold">Le {Number(total).toLocaleString()}</td>
                    <td className="text-status-normal font-medium">Le {amountPaid.toLocaleString()}</td>
                    <td className={cn(balance > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                      {balance > 0 ? `Le ${balance.toLocaleString()}` : '-'}
                    </td>
                    <td className="capitalize text-muted-foreground">
                      {paymentMethod?.replace(/_/g, ' ') || '-'}
                    </td>
                    <td>
                      <Badge variant="outline" className={cn(
                        paymentStatus === 'paid' ? 'bg-status-normal/10 text-status-normal' :
                        paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-status-warning/10 text-status-warning'
                      )}>
                        {paymentStatus}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {paymentStatus !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setPaymentAmount('');
                              setShowPaymentDialog(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Payment history"
                          onClick={() => {
                            setHistoryOrderId(order.id || order._id || '');
                            setShowHistoryDialog(true);
                          }}
                        >
                          <History className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
      <Dialog open={showPaymentDialog} onOpenChange={open => { setShowPaymentDialog(open); if (!open) { setSelectedPaymentMethod(null); setPaymentAmount(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="py-4">
              <div className="bg-muted rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-mono">{selectedOrder.orderNumber || selectedOrder.order_number}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Patient</span>
                  <span>
                    {selectedOrder.patientId?.firstName || selectedOrder.patients?.first_name}{' '}
                    {selectedOrder.patientId?.lastName || selectedOrder.patients?.last_name}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Order Total</span>
                  <span className="font-bold">Le {Number(selectedOrder.total || selectedOrder.totalAmount || 0).toLocaleString()}</span>
                </div>
                {Number(selectedOrder.amountPaid || 0) > 0 && (
                  <div className="flex justify-between mb-2 text-status-normal">
                    <span>Already Paid</span>
                    <span>Le {Number(selectedOrder.amountPaid).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2 text-amber-600">
                  <span>Remaining Balance</span>
                  <span>Le {(Number(selectedOrder.total || selectedOrder.totalAmount || 0) - Number(selectedOrder.amountPaid || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Amount to Pay</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(selectedOrder.total || 0) - Number(selectedOrder.amountPaid || 0)}
                    placeholder={`Max: Le ${(Number(selectedOrder.total || 0) - Number(selectedOrder.amountPaid || 0)).toLocaleString()}`}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                  {parseFloat(paymentAmount) > 0 && parseFloat(paymentAmount) < (Number(selectedOrder.total || 0) - Number(selectedOrder.amountPaid || 0)) && (
                    <p className="text-xs text-amber-600">
                      Remaining credit after this: Le {(Number(selectedOrder.total || 0) - Number(selectedOrder.amountPaid || 0) - parseFloat(paymentAmount)).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'orange_money', label: 'Orange Money', icon: Smartphone },
                      { id: 'afrimoney', label: 'Afrimoney', icon: CreditCard },
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPaymentMethod(method.id)}
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={handleProcessPayment}
              disabled={!selectedPaymentMethod || addPayment.isPending}
            >
              {addPayment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Check className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !paymentHistory || paymentHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((p: any, i: number) => (
                  <div key={p._id || i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{p.paymentMethod?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.createdAt), 'MMM dd, yyyy HH:mm')}
                        {p.receivedBy?.fullName && ` · ${p.receivedBy.fullName}`}
                      </p>
                      {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                    </div>
                    <span className="font-bold text-status-normal">Le {Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t font-bold">
                  <span>Total Paid</span>
                  <span>Le {paymentHistory.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
