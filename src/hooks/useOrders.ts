import { ordersAPI } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  address?: string;
}

interface OrderTest {
  id: string;
  orderId: string;
  testId: string;
  testCode: string;
  testName: string;
  price: number;
  status: string;
}

interface Order {
  id: string;
  orderNumber: string;
  patientId: string;
  status: 'pending_collection' | 'collected' | 'processing' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithDetails extends Order {
  patient: Patient;
  tests: OrderTest[];
}

interface OrderCreate {
  patientId: string;
  priority: 'routine' | 'urgent' | 'stat';
  notes?: string;
  tests: Array<{
    testId: string;
    testCode: string;
    testName: string;
    price: number;
  }>;
  discount?: number;
  discountType?: 'fixed' | 'percentage';
  paymentMethod?: 'cash' | 'card' | 'mobile-money';
}

interface OrderUpdate {
  status?: 'pending_collection' | 'collected' | 'processing' | 'completed' | 'cancelled';
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
  paidAmount?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
}

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async () => {
      const params: any = {};
      if (status && status !== 'all') {
        params.status = status;
      }
      return await ordersAPI.getAll(params);
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      return await ordersAPI.getById(id);
    },
    enabled: !!id,
  });
}

export function useTodayOrders() {
  return useQuery({
    queryKey: ['orders', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return await ordersAPI.getAll({ date: today });
    },
  });
}

export function usePendingCollectionOrders() {
  return useQuery({
    queryKey: ['orders', 'pending_collection'],
    queryFn: async () => {
      return await ordersAPI.getPendingCollection();
    },
  });
}

export function useProcessingOrders() {
  return useQuery({
    queryKey: ['orders', 'processing'],
    queryFn: async () => {
      return await ordersAPI.getPendingResults();
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData: OrderCreate) => {
      return await ordersAPI.create(orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: OrderUpdate }) => {
      return await ordersAPI.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
