import { useState, useEffect } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { pharmacyService, CafProduct } from '@/services/pharmacyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, AlertTriangle, Package, Loader2 } from 'lucide-react';

export default function PharmacyDashboard() {
  const { profile, primaryRole } = useAuth();
  const [products, setProducts] = useState<CafProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    loadProducts();
    loadLowStock();
  }, []);

  async function loadProducts(query?: string) {
    setLoading(true);
    try {
      const result = await pharmacyService.getProducts(query);
      setProducts(result);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadLowStock() {
    try {
      const result = await pharmacyService.getLowStock();
      setLowStockItems(result);
    } catch {
      setLowStockItems([]);
    }
  }

  function handleSearch() {
    loadProducts(search || undefined);
  }

  return (
    <RoleLayout title="Pharmacy Dashboard" role={primaryRole || 'lab_tech'} userName={profile?.full_name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pharmacy</h1>
            <p className="text-muted-foreground">Browse CAF products and check stock</p>
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-amber-700 space-y-1">
                {lowStockItems.slice(0, 5).map((item: any, i: number) => (
                  <div key={i}>
                    {item.productName || item.productId}: {item.currentStock ?? 0} remaining
                    (reorder at {item.reorderLevel})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-sm"
          />
          <Button onClick={handleSearch} size="sm">
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found. Search for products from the CAF pharmacy catalog.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>{product.brand}</TableCell>
                      <TableCell className="text-right">
                        <span className={product.quantityAvailable <= (product.reorderLevel || 10) ? 'text-amber-600 font-semibold' : ''}>
                          {product.quantityAvailable}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {(product.suggestedRetailPrice || product.basePrice || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
