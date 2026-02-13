import { resultsAPI } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Result {
  id: string;
  orderId: string;
  testId: string;
  testCode: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
  status: 'pending' | 'verified' | 'amended';
  enteredBy?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ResultCreate {
  orderId: string;
  testId: string;
  testCode: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
}

interface ResultUpdate {
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
  status?: 'pending' | 'verified' | 'amended';
}

export function useResults(orderId?: string) {
  return useQuery({
    queryKey: ['results', orderId],
    queryFn: async () => {
      const params: any = {};
      if (orderId) params.orderId = orderId;
      return await resultsAPI.getAll(params);
    },
  });
}

export function useCriticalResults() {
  return useQuery({
    queryKey: ['results', 'critical'],
    queryFn: async () => {
      return await resultsAPI.getCritical();
    },
  });
}

export function usePendingVerificationResults() {
  return useQuery({
    queryKey: ['results', 'pending_verification'],
    queryFn: async () => {
      return await resultsAPI.getPendingVerification();
    },
  });
}

export function useCreateResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (result: ResultCreate) => {
      return await resultsAPI.create(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useVerifyResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await resultsAPI.verify(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });
}

export function useUpdateResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ResultUpdate }) => {
      return await resultsAPI.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });
}