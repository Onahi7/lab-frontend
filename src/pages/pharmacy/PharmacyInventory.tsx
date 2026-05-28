import { useState, useEffect } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { pharmacyService, CafProduct } from '@/services/pharmacyService';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, Loader2, Barcode } from 'lucide-react';

export default function PharmacyInventory() {
  const { profile, primaryRole } = useAuth();
  const [products, setProducts] = useState<CafProduct[]>([]);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllProducts();
  }, []);

  async function loadAllProducts(query?: string) {
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

  async function handleBarcodeLookup() {
    if (!barcode.trim()) return;
    setLoading(true);
    try {
      const product = await pharmacyService.getProductByBarcode(barcode.trim());
      setProducts(product ? [product] : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RoleLayout title="Pharmacy Inventory" role={primaryRole || 'lab_tech'} userName={profile?.full_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">View pharmacy stock from CAF</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAllProducts(search || undefined)}
                  className="w-60"
                />
              </div>
              <div className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Scan barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeLookup()}
                  className="w-48"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Stock Levels ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Reorder At</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const isLow = product.quantityAvailable <= (product.reorderLevel || 10);
                    const isOut = product.quantityAvailable === 0;
                    return (
                      <TableRow key={product._id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{product.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{product.quantityAvailable}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {product.reorderLevel || 10}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(product.suggestedRetailPrice || product.basePrice || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {isOut ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">Low Stock</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
