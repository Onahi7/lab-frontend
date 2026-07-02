import { externalApiClientsAPI } from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ExternalApiClient {
  _id: string;
  id?: string;
  facilityName: string;
  keyPrefix: string;
  apiKey?: string;
  isActive: boolean;
  priceMarkupPercentage?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt?: string;
  lastUsedAt?: string;
}

export function useExternalApiClients() {
  return useQuery({
    queryKey: ['external-api-clients'],
    queryFn: async () => externalApiClientsAPI.getAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateExternalApiClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: externalApiClientsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-api-clients'] });
    },
  });
}

export function useUpdateExternalApiClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof externalApiClientsAPI.update>[1] }) =>
      externalApiClientsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-api-clients'] });
    },
  });
}
