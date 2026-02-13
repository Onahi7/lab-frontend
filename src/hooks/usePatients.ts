import { patientsAPI } from '@/services/api';
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
  createdAt: string;
  updatedAt: string;
}

interface PatientCreate {
  firstName: string;
  lastName: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  address?: string;
}

interface PatientUpdate {
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  address?: string;
}

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await patientsAPI.getAll();
      // Backend returns { data: Patient[] }
      return response.data || response;
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      return await patientsAPI.getById(id);
    },
    enabled: !!id,
  });
}

export function useSearchPatients(searchTerm: string) {
  return useQuery({
    queryKey: ['patients', 'search', searchTerm],
    queryFn: async () => {
      try {
        if (!searchTerm || searchTerm.length < 2) {
          const response = await patientsAPI.getAll({ limit: 20 });
          // Backend returns { data: Patient[] } for getAll
          return response.data || response;
        }
        // Backend returns Patient[] directly for search
        return await patientsAPI.search(searchTerm);
      } catch (error) {
        console.error('useSearchPatients error:', error);
        return [];
      }
    },
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
