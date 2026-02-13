import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrders, useTodayOrders } from '@/hooks/useOrders';
import { useMachines } from '@/hooks/useMachines';
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
  Legend
} from 'recharts';
import { Download, TrendingUp, Users, DollarSign, TestTube, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--status-normal))', 'hsl(var(--status-warning))', 'hsl(var(--status-critical))', 'hsl(var(--muted-foreground))'];

export default function Reports() {
  const { profile } = useAuth();
  const { data: allOrders, isLoading: ordersLoading } = useOrders('all');
  const { data: todayOrders } = useTodayOrders();
  const { data: machines } = useMachines();

  const [dateRange, setDateRange] = useState('7days');

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!allOrders) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paidOrders = allOrders.filter(o => o.payment_status === 'paid');
    const todayRevenue = todayOrders?.filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total), 0) || 0;
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    const totalTests = allOrders.reduce((sum, o) => sum + o.order_tests.length, 0);

    return {
      todayRevenue,
      totalRevenue,
      avgOrderValue,
      totalOrders: allOrders.length,
      completedOrders: allOrders.filter(o => o.status === 'completed').length,
      totalTests,
      uniquePatients: new Set(allOrders.map(o => o.patient_id)).size,
    };
  }, [allOrders, todayOrders]);

  // Orders by status chart data
  const statusData = useMemo(() => {
    if (!allOrders) return [];
    
    const statusCounts: Record<string, number> = {};
    allOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
    }));
  }, [allOrders]);

  // Tests by category chart data
  const categoryData = useMemo(() => {
    if (!allOrders) return [];
    
    const categoryCounts: Record<string, number> = {};
    allOrders.forEach(order => {
      order.order_tests.forEach(test => {
        // Use test code prefix as category approximation
        const category = test.test_code.substring(0, 3);
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
    });

    return Object.entries(categoryCounts)
      .map(([category, count]) => ({ name: category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [allOrders]);

  // Daily revenue trend (last 7 days)
  const revenueData = useMemo(() => {
    if (!allOrders) return [];

    const days: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString('en-US', { weekday: 'short' });
      days[key] = 0;
    }

    // Aggregate revenue
    allOrders.forEach(order => {
      if (order.payment_status !== 'paid') return;
      const orderDate = new Date(order.created_at);
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        const key = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
        days[key] = (days[key] || 0) + Number(order.total);
      }
    });

    return Object.entries(days).map(([day, revenue]) => ({ day, revenue: revenue / 1000 }));
  }, [allOrders]);

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
      <div className="flex items-center justify-between mb-6">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">Le {(metrics?.todayRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-status-normal/10">
                <DollarSign className="w-6 h-6 text-status-normal" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{metrics?.totalOrders || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{metrics?.totalTests || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-status-warning/10">
                <TestTube className="w-6 h-6 text-status-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Patients</p>
                <p className="text-2xl font-bold">{metrics?.uniquePatients || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis tickFormatter={(v) => `Le ${v}K`} className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`Le ${(value * 1000).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Tests by Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={60} className="text-xs" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </RoleLayout>
  );
}
