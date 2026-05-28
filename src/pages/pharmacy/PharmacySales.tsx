import { useState, useEffect } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { pharmacyService, SaleRecord } from '@/services/pharmacyService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Loader2, Calendar } from 'lucide-react';

export default function PharmacySales() {
  const { profile, primaryRole } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales(start?: string, end?: string) {
    setLoading(true);
    try {
      const result = await pharmacyService.getSales(start || undefined, end || undefined);
      setSales(result);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  function handleFilter() {
    loadSales(startDate || undefined, endDate || undefined);
  }

  function getTotal(): number {
    return sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  }

  return (
    <RoleLayout title="Sales History" role={primaryRole || 'lab_tech'} userName={profile?.full_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sales History</h1>
          <p className="text-muted-foreground">View lab dispensary sales from CAF</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={handleFilter} size="sm">Filter</Button>
              <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); loadSales(); }} size="sm">Clear</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Sales ({sales.length}) — Total: {getTotal().toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sales found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale._id}>
                        <TableCell className="font-mono text-sm">{sale.receiptNumber}</TableCell>
                        <TableCell>{sale.customerName || '—'}</TableCell>
                        <TableCell>{sale.items?.length || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {(sale.paymentMethod || 'cash').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {(sale.total || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
