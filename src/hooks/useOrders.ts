import { ordersAPI } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Patient {
  id?: string;
  _id?: string;
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
  id?: string;
  _id?: string;
  orderId: string;
  testId: string;
  testCode: string;
  testName: string;
  price: number;
  status: string;
  // Backend snake_case format
  test_id?: string;
  test_code?: string;
  test_name?: string;
}

function normalizeOrderTest(test: any): OrderTest {
  return {
    ...test,
    id: test.id || test._id,
    orderId: test.orderId || test.order_id,
    testId: test.testId || test.test_id,
    testCode: test.testCode || test.test_code,
    testName: test.testName || test.test_name,
  };
}

function normalizePatient(patient: any): Patient | undefined {
  if (!patient) return undefined;

  return {
    ...patient,
    id: patient.id || patient._id,
    patientId: patient.patientId || patient.patient_id,
    firstName: patient.firstName || patient.first_name,
    lastName: patient.lastName || patient.last_name,
  };
}

function normalizeOrder(order: any): OrderWithDetails {
  const patient = normalizePatient(order.patient || order.patients || (typeof order.patientId === 'object' ? order.patientId : undefined));
  const orderTests = (order.order_tests || order.tests || []).map((test: any) => normalizeOrderTest(test));

  return {
    ...order,
    id: order.id || order._id,
    orderNumber: order.orderNumber || order.order_number,
    patientId: typeof order.patientId === 'string' ? order.patientId : patient || order.patientId,
    patient,
    tests: orderTests,
    order_tests: orderTests,
    status: order.status,
    priority: order.priority,
    total: order.total ?? order.totalAmount,
    totalAmount: order.totalAmount ?? order.total,
    paymentStatus: order.paymentStatus || order.payment_status,
    paymentMethod: order.paymentMethod || order.payment_method,
    createdAt: order.createdAt || order.created_at,
    updatedAt: order.updatedAt || order.updated_at,
  };
}

interface Order {
  id?: string;
  _id?: string;
  orderNumber: string;
  patientId: string | Patient;
  status: 'pending_payment' | 'pending_collection' | 'collected' | 'processing' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  total?: number;
  totalAmount?: number;
  subtotal?: number;
  discount?: number;
  discountType?: 'fixed' | 'percentage';
  paidAmount?: number;
  amountPaid?: number;
  balance?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'orange_money' | 'afrimoney';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderWithDetails extends Order {
  patient?: Patient;
  tests?: OrderTest[];
  // Backend MongoDB format
  order_tests?: OrderTest[];
  patients?: Patient;
  order_number?: string;
  payment_status?: 'pending' | 'partial' | 'paid';
  payment_method?: 'cash' | 'orange_money' | 'afrimoney';
  created_at?: string;
  updated_at?: string;
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
    panelCode?: string;
    panelName?: string;
  }>;
  discount?: number;
  discountType?: 'fixed' | 'percentage';
  paymentMethod?: 'cash' | 'orange_money' | 'afrimoney';
  initialPaymentAmount?: number;
}

interface OrderUpdate {
  status?: 'pending_payment' | 'pending_collection' | 'collected' | 'processing' | 'completed' | 'cancelled';
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
  paidAmount?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'orange_money' | 'afrimoney';
  // Backend snake_case format
  payment_status?: 'pending' | 'partial' | 'paid';
  payment_method?: 'cash' | 'orange_money' | 'afrimoney';
}

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async () => {
      const params: any = {};
      if (status && status !== 'all') {
        params.status = status;
      }
      const orders = await ordersAPI.getAll(params);
      return (orders || []).map((order: any) => normalizeOrder(order));
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const order = await ordersAPI.getById(id);
      return normalizeOrder(order);
    },
    enabled: !!id,
  });
}

export function useTodayOrders() {
  return useQuery({
    queryKey: ['orders', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const orders = await ordersAPI.getAll({ date: today });
      return (orders || []).map((order: any) => normalizeOrder(order));
    },
  });
}

export function usePendingCollectionOrders() {
  return useQuery({
    queryKey: ['orders', 'pending_collection'],
    queryFn: async () => {
      const orders = await ordersAPI.getPendingCollection();
      return (orders || []).map((order: any) => normalizeOrder(order));
    },
  });
}

export function useProcessingOrders() {
  return useQuery({
    queryKey: ['orders', 'processing'],
    queryFn: async () => {
      const orders = await ordersAPI.getPendingResults();
      return (orders || []).map((order: any) => normalizeOrder(order));
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
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-income'] });
    },
  });
}

export function usePaymentStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['payment-stats', startDate, endDate],
    queryFn: async () => {
      return await ordersAPI.getPaymentStats(startDate, endDate);
    },
  });
}

export function useDailyIncome(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['daily-income', startDate, endDate],
    queryFn: async () => {
      return await ordersAPI.getDailyIncome(startDate, endDate);
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: { amount: number; paymentMethod: string; notes?: string } }) => {
      return await ordersAPI.addPayment(orderId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-income'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
  });
}

export function usePaymentHistory(orderId: string) {
  return useQuery({
    queryKey: ['payment-history', orderId],
    queryFn: async () => {
      return await ordersAPI.getPaymentHistory(orderId);
    },
    enabled: !!orderId,
  });
}

export function useCollectOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderId: string) => {
      return await ordersAPI.collect(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'pending_collection'] });
    },
  });
}
