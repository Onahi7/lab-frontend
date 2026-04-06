import { patientsAPI, getAccessToken } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  ageValue?: number;
  ageUnit?: 'years' | 'months' | 'weeks' | 'days';
  gender: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface PatientCreate {
  firstName: string;
  lastName: string;
  age: number;
  ageValue?: number;
  ageUnit?: 'years' | 'months' | 'weeks' | 'days';
  gender: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  address?: string;
}

interface PatientUpdate {
  firstName?: string;
  lastName?: string;
  age?: number;
  ageValue?: number;
  ageUnit?: 'years' | 'months' | 'weeks' | 'days';
  gender?: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  address?: string;
}

export interface PatientResult {
  id: string;
  orderId?: string;
  orderNumber?: string;
  testCode: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
  status?: 'preliminary' | 'verified' | 'amended';
  resultedAt?: string;
  createdAt?: string;
}

function normalizePatientResult(result: any): PatientResult {
  const orderRef = result.orderId || result.order || result.orders;

  return {
    id: result.id || result._id,
    orderId:
      (typeof orderRef === 'string' ? orderRef : orderRef?.id || orderRef?._id) ||
      result.order_id ||
      result.orderId,
    orderNumber:
      (typeof orderRef === 'object' ? orderRef?.orderNumber || orderRef?.order_number : undefined) ||
      result.orderNumber ||
      result.order_number,
    testCode: result.testCode || result.test_code || '',
    testName: result.testName || result.test_name || result.testCode || result.test_code || '',
    value: result.value ?? '',
    unit: result.unit,
    referenceRange: result.referenceRange || result.reference_range,
    flag: result.flag,
    status: result.status,
    resultedAt: result.resultedAt || result.resulted_at,
    createdAt: result.createdAt || result.created_at,
  };
}

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await patientsAPI.getAll();
      // Backend returns { data: Patient[] }
      return response.data || response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes — avoid refetch on every mount
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      return await patientsAPI.getById(id);
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSearchPatients(searchTerm: string) {
  return useQuery({
    queryKey: ['patients', 'search', searchTerm],
    queryFn: async () => {
      try {
        // If no search term, get all patients
        if (!searchTerm || searchTerm.trim().length === 0) {
          const response = await patientsAPI.getAll();
          return response.data || response;
        }
        
        // If search term is too short, return empty
        if (searchTerm.length < 2) {
          return [];
        }
        
        // Backend returns Patient[] directly for search
        return await patientsAPI.search(searchTerm);
      } catch (error) {
        console.error('useSearchPatients error:', error);
        return [];
      }
    },
    enabled: !!getAccessToken(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (patient: PatientCreate) => {
      return await patientsAPI.create(patient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PatientUpdate }) => {
      return await patientsAPI.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await patientsAPI.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function usePatientResults(id: string) {
  return useQuery({
    queryKey: ['patients', id, 'results'],
    queryFn: async () => {
      const response = await patientsAPI.getResults(id);
      const results = Array.isArray(response)
        ? response
        : response?.data || response?.results || [];

      return results.map((result: any) => normalizePatientResult(result));
    },
    enabled: !!id && !!getAccessToken(),
    staleTime: 30 * 1000,
  });
}
