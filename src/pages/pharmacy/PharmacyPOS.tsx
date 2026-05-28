import { useState, useEffect, useRef } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { pharmacyService, CafProduct, CartItem } from '@/services/pharmacyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, Barcode, CheckCircle, X } from 'lucide-react';

export default function PharmacyPOS() {
  const { profile, primaryRole } = useAuth();
  const [products, setProducts] = useState<CafProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saleResult, setSaleResult] = useState<{ receiptNumber: string; total: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    barcodeRef.current?.focus();
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

  async function handleBarcodeScan() {
    if (!barcode.trim()) return;
    setLoading(true);
    try {
      const product = await pharmacyService.getProductByBarcode(barcode.trim());
      if (product) {
        addToCart(product);
        setBarcode('');
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      barcodeRef.current?.focus();
    }
  }

  function addToCart(product: CafProduct) {
    if (product.quantityAvailable <= 0) {
      setError(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.quantityAvailable) {
          setError(`Only ${product.quantityAvailable} in stock`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.suggestedRetailPrice || product.basePrice }];
    });
    setError('');
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.quantityAvailable) {
            setError(`Only ${item.product.quantityAvailable} in stock`);
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[],
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  }

  function getSubtotal(): number {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setChecking(true);
    setError('');
    try {
      const result = await pharmacyService.checkout({
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod,
        customerName: customerName || undefined,
      });
      setSaleResult({ receiptNumber: result.receiptNumber, total: result.total });
      setCart([]);
      setCustomerName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setChecking(false);
    }
  }

  if (saleResult) {
    return (
      <RoleLayout title="Pharmacy POS" role={primaryRole || 'lab_tech'} userName={profile?.full_name}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Sale Complete</h2>
              <p className="text-muted-foreground">Receipt: <span className="font-mono font-bold">{saleResult.receiptNumber}</span></p>
              <p className="text-3xl font-bold">{saleResult.total.toLocaleString()}</p>
              <Button onClick={() => setSaleResult(null)} className="w-full">
                New Sale
              </Button>
            </CardContent>
          </Card>
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout title="Pharmacy POS" role={primaryRole || 'lab_tech'} userName={profile?.full_name}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Search + Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Barcode className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                placeholder="Scan barcode..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScan()}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drugs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadProducts(search || undefined)}
                className="flex-1"
              />
              <Button onClick={() => loadProducts(search || undefined)} size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded flex items-center gap-2">
              <X className="h-4 w-4" />
              {error}
              <button onClick={() => setError('')} className="ml-auto"><X className="h-3 w-3" /></button>
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
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
                  Scan a barcode or search for products
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product._id} className="cursor-pointer hover:bg-muted/50" onClick={() => addToCart(product)}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{product.category}</Badge></TableCell>
                          <TableCell className="text-right">
                            <span className={product.quantityAvailable <= 0 ? 'text-red-500' : product.quantityAvailable <= (product.reorderLevel || 10) ? 'text-amber-600' : ''}>
                              {product.quantityAvailable}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(product.suggestedRetailPrice || product.basePrice || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" disabled={product.quantityAvailable <= 0}>
                              <Plus className="h-4 w-4" />
                            </Button>
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

        {/* Right: Cart + Checkout */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No items in cart
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product._id} className="flex items-center gap-2 text-sm border-b pb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.product.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {(item.unitPrice || 0).toLocaleString()} x {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.product._id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-xs font-mono">{item.quantity}</span>
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.product._id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => removeFromCart(item.product._id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold">{getSubtotal().toLocaleString()}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Customer Name</label>
                      <Input
                        placeholder="Optional"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Payment Method</label>
                      <div className="grid grid-cols-2 gap-1">
                        {['cash', 'card', 'orange_money', 'africell_money'].map((method) => (
                          <Button
                            key={method}
                            size="sm"
                            variant={paymentMethod === method ? 'default' : 'outline'}
                            onClick={() => setPaymentMethod(method)}
                            className="text-xs capitalize"
                          >
                            {method.replace('_', ' ')}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleCheckout}
                      disabled={checking || cart.length === 0}
                      className="w-full"
                      size="lg"
                    >
                      {checking ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Checkout ({getSubtotal().toLocaleString()})
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleLayout>
  );
}
