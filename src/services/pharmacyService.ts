import api from './api';

export interface PackSize {
  code?: string;
  name: string;
  unit: string;
  quantityPerPack: number;
  sellingPrice: number;
  barcode?: string;
}

export interface CafProduct {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  quantityAvailable: number;
  reorderLevel: number;
  basePrice: number;
  suggestedRetailPrice: number;
  requiresPrescription: boolean;
  isActive: boolean;
  packSizes?: PackSize[];
}

export interface CartItem {
  product: CafProduct;
  quantity: number;
  unitPrice: number;
  packSize?: PackSize;
}

export interface CheckoutResult {
  saleId: string;
  receiptNumber: string;
  total: number;
}

export interface SaleRecord {
  _id: string;
  receiptNumber: string;
  total: number;
  paymentMethod: string;
  customerName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  createdAt: string;
  status: string;
}

export const pharmacyService = {
  async getProducts(search?: string, category?: string): Promise<CafProduct[]> {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (category) params.category = category;
    const { data } = await api.get('/pharmacy/products', { params });
    return data.data;
  },

  async getProductByBarcode(barcode: string): Promise<CafProduct | null> {
    const { data } = await api.get(`/pharmacy/products/barcode/${barcode}`);
    return data.data;
  },

  async getLowStock(): Promise<any[]> {
    const { data } = await api.get('/pharmacy/low-stock');
    return data.data;
  },

  async getProductStock(productId: string): Promise<number> {
    const { data } = await api.get(`/pharmacy/stock/${productId}`);
    return data.data.quantityAvailable;
  },

  async checkout(params: {
    items: Array<{ productId: string; quantity: number; unitPrice: number; packSize?: PackSize }>;
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    discount?: number;
  }): Promise<CheckoutResult> {
    // Generate deterministic idempotency key from cart contents
    const cartHash = params.items
      .map((i) => `${i.productId}:${i.quantity}:${i.unitPrice}`)
      .sort()
      .join('|');
    const idempotencyKey = `lab-${cartHash}-${params.paymentMethod}`;

    const { data } = await api.post('/pharmacy/checkout', {
      ...params,
      idempotencyKey,
    });
    return data.data;
  },

  async getSales(startDate?: string, endDate?: string): Promise<SaleRecord[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const { data } = await api.get('/pharmacy/sales', { params });
    return data.data;
  },
};

export default pharmacyService;
