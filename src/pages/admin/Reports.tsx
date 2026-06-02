import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrders, useTodayOrders, usePaymentStats, useDailyIncome } from '@/hooks/useOrders';
import { useMachines } from '@/hooks/useMachines';
import { getPanelTestCount } from '@/utils/orderHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Download, TrendingUp, Users, DollarSign, TestTube, Loader2, Banknote, Calendar, 
  Smartphone, CreditCard, Activity, AlertTriangle, CheckCircle2, Clock, 
  Percent, ArrowUpRight, ArrowDownRight, Stethoscope
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { subDays, format } from 'date-fns';

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--status-normal))', 
  'hsl(var(--status-warning))', 
  'hsl(var(--status-critical))', 
  'hsl(var(--muted-foreground))',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ec4899',
  '#10b981'
];

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#10b981',
  orange_money: '#f59e0b',
  afrimoney: '#8b5cf6',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  processing: '#f59e0b',
  collected: '#06b6d4',
  pending_payment: '#ef4444',
  pending_collection: '#8b5cf6',
  cancelled: '#6b7280',
};

export default function Reports() {
  const { profile } = useAuth();
  const { data: allOrders, isLoading: ordersLoading } = useOrders('all');
  const { data: todayOrders } = useTodayOrders();
  const { data: machines } = useMachines();

  const [dateRange, setDateRange] = useState('7days');

  const getDateRange = () => {
    const end = new Date().toISOString();
    let start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start = subDays(start, 7);
        break;
      case '30days':
        start = subDays(start, 30);
        break;
      case '90days':
        start = subDays(start, 90);
        break;
      default:
        start = subDays(start, 7);
    }
    
    return { start: start.toISOString(), end };
  };

  const { start, end } = getDateRange();
  const { data: paymentStats } = usePaymentStats(start, end);
  const { data: dailyIncome } = useDailyIncome(start, end);

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    const startDate = new Date(start);
    return allOrders.filter(o => new Date(o.createdAt) >= startDate);
  }, [allOrders, start]);

  // ─── CORE METRICS ───────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!filteredOrders.length) return null;

    const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid');
    const partialOrders = filteredOrders.filter(o => o.paymentStatus === 'partial');
    const pendingOrders = filteredOrders.filter(o => o.paymentStatus === 'pending');
    const todayRevenue = todayOrders?.filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0) || 0;
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0);
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    const totalTests = filteredOrders.reduce((sum, o) => sum + getPanelTestCount(o), 0);
    
    const totalSubtotal = filteredOrders.reduce((sum, o) => sum + Number(o.subtotal || o.total || 0), 0);
    const totalDiscount = filteredOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0);
    const totalBilled = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalPaid = filteredOrders.reduce((sum, o) => sum + Number(o.amountPaid || 0), 0);
    const totalOutstanding = totalBilled - totalPaid;

    const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    const processingOrders = filteredOrders.filter(o => o.status === 'processing').length;
    const completionRate = filteredOrders.length > 0 ? (completedOrders / filteredOrders.length) * 100 : 0;

    return {
      todayRevenue,
      totalRevenue,
      avgOrderValue,
      totalOrders: filteredOrders.length,
      completedOrders,
      processingOrders,
      totalTests,
      uniquePatients: new Set(
        filteredOrders.map((o) => {
          if (typeof o.patientId === 'string') return o.patientId;
          if (o.patientId?._id) return o.patientId._id;
          if (o.patientId?.id) return o.patientId.id;
          return '';
        }).filter(Boolean),
      ).size,
      paidOrders: paidOrders.length,
      partialOrders: partialOrders.length,
      pendingOrders: pendingOrders.length,
      totalSubtotal,
      totalDiscount,
      totalBilled,
      totalPaid,
      totalOutstanding,
      completionRate,
    };
  }, [filteredOrders, todayOrders]);

  // ─── PAYMENT METHOD BREAKDOWN ───────────────────────────────────
  const paymentMethodData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const methodCounts: Record<string, number> = {};
    const methodRevenue: Record<string, number> = {};
    
    filteredOrders.forEach(o => {
      if (o.paymentStatus !== 'paid' && o.paymentStatus !== 'partial') return;
      const method = o.paymentMethod || o.payment_method || 'unknown';
      const amount = Number(o.amountPaid || o.total || 0);
      methodCounts[method] = (methodCounts[method] || 0) + 1;
      methodRevenue[method] = (methodRevenue[method] || 0) + amount;
    });

    return Object.entries(methodCounts).map(([method, count]) => ({
      name: method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      revenue: methodRevenue[method],
      value: count,
    })).sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  // ─── TOP TESTS BY REVENUE ───────────────────────────────────────
  const testRevenueData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const revenueMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};

    filteredOrders.forEach(order => {
      const orderTests = order.tests || order.order_tests || [];
      const seenPanels = new Set<string>();
      const seenStandalone = new Set<string>();

      orderTests.forEach((test: any) => {
        const panelCode = test.panelCode || test.panel_code;
        const testCode = test.testCode || test.test_code || '';
        const price = Number(test.price || 0);

        if (panelCode) {
          const key = `${panelCode}_${order._id || order.id}`;
          if (!seenPanels.has(key)) {
            seenPanels.add(key);
            revenueMap[panelCode] = (revenueMap[panelCode] || 0) + price;
            countMap[panelCode] = (countMap[panelCode] || 0) + 1;
          }
        } else {
          const key = `${testCode}_${order._id || order.id}`;
          if (!seenStandalone.has(key)) {
            seenStandalone.add(key);
            revenueMap[testCode] = (revenueMap[testCode] || 0) + price;
            countMap[testCode] = (countMap[testCode] || 0) + 1;
          }
        }
      });
    });

    return Object.entries(revenueMap)
      .map(([code, revenue]) => ({
        name: code,
        revenue,
        orders: countMap[code],
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // ─── DAILY ORDER VOLUME ─────────────────────────────────────────
  const dailyVolumeData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const days: Record<string, { orders: number; revenue: number; tests: number }> = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = format(date, 'EEE, MMM dd');
      days[key] = { orders: 0, revenue: 0, tests: 0 };
    }

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        const key = format(orderDate, 'EEE, MMM dd');
        if (days[key]) {
          days[key].orders++;
          if (order.paymentStatus === 'paid') {
            days[key].revenue += Number(order.total || order.totalAmount || 0);
          }
          days[key].tests += getPanelTestCount(order);
        }
      }
    });

    return Object.entries(days).map(([day, data]) => ({
      day: day.split(',')[0],
      orders: data.orders,
      revenue: data.revenue,
      tests: data.tests,
    }));
  }, [filteredOrders]);

  // ─── REVENUE TREND ──────────────────────────────────────────────
  const revenueData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const days: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = format(date, 'EEE');
      days[key] = 0;
    }

    filteredOrders.forEach(order => {
      if (order.paymentStatus !== 'paid') return;
      const orderDate = new Date(order.createdAt);
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        const key = format(orderDate, 'EEE');
        days[key] = (days[key] || 0) + Number(order.total || order.totalAmount || 0);
      }
    });

    return Object.entries(days).map(([day, revenue]) => ({ day, revenue }));
  }, [filteredOrders]);

  // ─── STATUS DISTRIBUTION ────────────────────────────────────────
  const statusData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const statusCounts: Record<string, number> = {};
    filteredOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
    }));
  }, [filteredOrders]);

  // ─── TOP TESTS BY VOLUME ────────────────────────────────────────
  const categoryData = useMemo(() => {
    if (!filteredOrders.length) return [];
    const panelOrderCounts: Record<string, Set<string>> = {};
    const standaloneCounts: Record<string, number> = {};
    
    filteredOrders.forEach(order => {
      const orderId = order._id || order.id || '';
      const orderTests = order.tests || order.order_tests || [];
      const seenPanels = new Set<string>();
      const seenStandalone = new Set<string>();
      
      orderTests.forEach((test: any) => {
        const panelCode = test.panelCode || test.panel_code;
        const testCode = test.testCode || test.test_code || '';
        
        if (panelCode) {
          const key = `${panelCode}_${orderId}`;
          if (!seenPanels.has(key)) {
            seenPanels.add(key);
            if (!panelOrderCounts[panelCode]) panelOrderCounts[panelCode] = new Set();
            panelOrderCounts[panelCode].add(orderId);
          }
        } else {
          const key = `${testCode}_${orderId}`;
          if (!seenStandalone.has(key)) {
            seenStandalone.add(key);
            standaloneCounts[testCode] = (standaloneCounts[testCode] || 0) + 1;
          }
        }
      });
    });
    
    const results: Array<{ name: string; count: number }> = [];
    Object.entries(panelOrderCounts).forEach(([code, orderIds]) => {
      results.push({ name: code, count: orderIds.size });
    });
    Object.entries(standaloneCounts).forEach(([code, count]) => {
      results.push({ name: code, count });
    });
    
    return results.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredOrders]);

  // ─── REVENUE VS ORDERS DUAL CHART ───────────────────────────────
  const dualAxisData = useMemo(() => {
    if (!dailyVolumeData.length) return [];
    return dailyVolumeData.map(d => ({
      day: d.day,
      revenue: d.revenue / 1000,
      orders: d.orders,
    }));
  }, [dailyVolumeData]);

  // ─── TEST CATEGORY BREAKDOWN (for pie chart) ────────────────────
  const testCategoryPie = useMemo(() => {
    if (!categoryData.length) return [];
    const total = categoryData.reduce((s, d) => s + d.count, 0);
    return categoryData.slice(0, 6).map(d => ({
      name: d.name,
      value: d.count,
      pct: total > 0 ? ((d.count / total) * 100).toFixed(1) : '0',
    }));
  }, [categoryData]);

  if (ordersLoading) {
    return (
      <RoleLayout title="Reports" subtitle="Analytics and insights" role="admin" userName={profile?.full_name}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout 
      title="Reports & Analytics" 
      subtitle="Business insights and performance metrics"
      role="admin"
      userName={profile?.full_name}
    >
      {/* Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* ═══════════════ ROW 1: KEY REVENUE CARDS ═══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border-l-4 border-l-status-normal border rounded-lg p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-status-normal/10">
            <DollarSign className="w-6 h-6 text-status-normal" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
            <p className="text-3xl font-bold text-status-normal mt-1">
              Le {(metrics?.todayRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">From fully paid orders today</p>
          </div>
        </div>
        <div className="bg-card border-l-4 border-l-primary border rounded-lg p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Banknote className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              Collected ({dateRange === 'today' ? 'Today' : dateRange === '7days' ? '7 Days' : dateRange === '30days' ? '30 Days' : '90 Days'})
            </p>
            <p className="text-3xl font-bold mt-1">
              Le {(paymentStats?.paidRevenue || metrics?.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentStats?.paidOrders || 0} paid orders
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════ ROW 2: KPI GRID ═══════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded bg-blue-500/10">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
          </div>
          <p className="text-2xl font-bold">{metrics?.totalOrders || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.completedOrders || 0} done
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded bg-emerald-500/10">
              <TestTube className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Total Tests</p>
          </div>
          <p className="text-2xl font-bold">{metrics?.totalTests || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Across all orders</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded bg-violet-500/10">
              <Users className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Patients</p>
          </div>
          <p className="text-2xl font-bold">{metrics?.uniquePatients || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Unique patients</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded bg-amber-500/10">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Avg Order</p>
          </div>
          <p className="text-2xl font-bold">Le {Math.round(metrics?.avgOrderValue || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Per paid order</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded bg-rose-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
          </div>
          <p className="text-2xl font-bold text-rose-600">Le {(metrics?.totalOutstanding || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.partialOrders || 0} partial, {metrics?.pendingOrders || 0} pending
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded bg-cyan-500/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Completion</p>
          </div>
          <p className="text-2xl font-bold">{Math.round(metrics?.completionRate || 0)}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.completedOrders || 0}/{metrics?.totalOrders || 0} orders
          </p>
        </div>
      </div>

      {/* ═══════════════ ROW 3: DISCOUNT & COLLECTION SUMMARY ═══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Discount Summary</h3>
          </div>
          <p className="text-2xl font-bold">Le {(metrics?.totalDiscount || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Total discounts given in period
          </p>
          {metrics && metrics.totalSubtotal > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Discount Rate</span>
                <span className="font-medium">{((metrics.totalDiscount / metrics.totalSubtotal) * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Collection Efficiency</h3>
          </div>
          <p className="text-2xl font-bold">{metrics && metrics.totalBilled > 0 ? ((metrics.totalPaid / metrics.totalBilled) * 100).toFixed(0) : 0}%</p>
          <div className="w-full bg-muted rounded-full h-2.5 mt-3">
            <div 
              className="bg-status-normal h-2.5 rounded-full transition-all" 
              style={{ width: `${metrics && metrics.totalBilled > 0 ? (metrics.totalPaid / metrics.totalBilled) * 100 : 0}%` }} 
            />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-muted-foreground">Paid: Le {(metrics?.totalPaid || 0).toLocaleString()}</span>
            <span className="text-muted-foreground">Billed: Le {(metrics?.totalBilled || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Order Pipeline</h3>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-status-normal" />
                <span className="text-xs">Completed</span>
              </div>
              <span className="text-sm font-bold">{metrics?.completedOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs">Processing</span>
              </div>
              <span className="text-sm font-bold">{metrics?.processingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs">Pending Payment</span>
              </div>
              <span className="text-sm font-bold">{metrics?.pendingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-xs">Partial</span>
              </div>
              <span className="text-sm font-bold">{metrics?.partialOrders || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ ROW 4: DAILY INCOME BREAKDOWN ═══════════════ */}
      {dailyIncome && dailyIncome.length > 0 && (
        <div className="bg-card border rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Daily Income Breakdown</h3>
            <span className="text-xs text-muted-foreground">Last {dailyIncome.length} day(s)</span>
          </div>
          <div className="divide-y">
            {dailyIncome.slice(0, 7).map((day: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{format(new Date(day.date), 'EEE, MMM dd')}</p>
                  <p className="text-xs text-muted-foreground">{day.orderCount} order{day.orderCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {day.cashPayments > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs">
                        <Banknote className="w-3 h-3" />
                        Le {day.cashPayments.toLocaleString()}
                      </span>
                    )}
                    {day.orangeMoneyPayments > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs">
                        <Smartphone className="w-3 h-3" />
                        Le {day.orangeMoneyPayments.toLocaleString()}
                      </span>
                    )}
                    {day.afrimoneyPayments > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 text-xs">
                        <Smartphone className="w-3 h-3" />
                        Le {day.afrimoneyPayments.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm min-w-[100px] text-right">Le {day.totalIncome.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ ROW 5: CHARTS 2x2 ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`Le ${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={paymentMethodPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, pct }) => `${name} (${pct}%)`}
                  >
                    {paymentMethodPie.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PAYMENT_COLORS[entry.name.toLowerCase().replace(/ /g, '_')] || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} orders`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No payment data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ ROW 6: ORDERS + TESTS CHARTS ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Order Volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Daily Order Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyVolumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="orders" name="Orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tests" name="Tests" fill="hsl(var(--status-normal))" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ ROW 7: REVENUE vs ORDERS DUAL AXIS ═══════════════ */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Revenue vs Orders (Daily)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dualAxisData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis yAxisId="left" tickFormatter={(v) => `${v}K`} className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? `Le ${(value * 1000).toLocaleString()}` : value,
                  name === 'revenue' ? 'Revenue' : 'Orders'
                ]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue (K)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="orders" name="Orders" fill="hsl(var(--status-normal))" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ═══════════════ ROW 8: TEST VOLUME + TEST REVENUE ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Tests by Volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Tests by Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={70} className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="count" name="Orders" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Tests by Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Tests by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={testRevenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <YAxis dataKey="name" type="category" width={70} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`Le ${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--status-normal))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ ROW 9: TEST CATEGORY PIE ═══════════════ */}
      {testCategoryPie.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Test Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={testCategoryPie}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, pct }) => `${name} (${pct}%)`}
                  >
                    {testCategoryPie.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Summary Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Revenue by Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto max-h-[280px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Test</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Orders</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Revenue</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testRevenueData.map((test, i) => (
                      <tr key={test.name} className="border-b last:border-0">
                        <td className="py-2 font-medium">{test.name}</td>
                        <td className="py-2 text-right text-muted-foreground">{test.orders}</td>
                        <td className="py-2 text-right font-semibold">Le {test.revenue.toLocaleString()}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          Le {test.orders > 0 ? Math.round(test.revenue / test.orders).toLocaleString() : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </RoleLayout>
  );
}
