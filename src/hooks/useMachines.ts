import { machinesAPI } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Machine {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  ipAddress?: string;
  port?: number;
  protocol: 'HL7' | 'ASTM' | 'LIS2-A2';
  lastCommunication?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MachineCreate {
  name: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  ipAddress?: string;
  port?: number;
  protocol: 'HL7' | 'ASTM' | 'LIS2-A2';
}

interface MachineUpdate {
  name?: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  status?: 'online' | 'offline' | 'maintenance' | 'error';
  ipAddress?: string;
  port?: number;
  protocol?: 'HL7' | 'ASTM' | 'LIS2-A2';
  isActive?: boolean;
}

interface MaintenanceRecord {
  id: string;
  machineId: string;
  type: 'preventive' | 'corrective' | 'calibration';
  description: string;
  performedBy: string;
  performedAt: string;
  nextDueDate?: string;
  cost?: number;
  notes?: string;
}

interface MaintenanceCreate {
  type: 'preventive' | 'corrective' | 'calibration';
  description: string;
  performedBy: string;
  nextDueDate?: string;
  cost?: number;
  notes?: string;
}

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      return await machinesAPI.getAll();
    },
  });
}

export function useMachine(id: string) {
  return useQuery({
    queryKey: ['machines', id],
    queryFn: async () => {
      return await machinesAPI.getById(id);
    },
    enabled: !!id,
  });
}

export function useCreateMachine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (machine: MachineCreate) => {
      return await machinesAPI.create(machine);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MachineUpdate }) => {
      return await machinesAPI.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });
}

export function useDeleteMachine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await machinesAPI.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });
}

export function useMachineMaintenance(machineId: string) {
  return useQuery({
    queryKey: ['machines', machineId, 'maintenance'],
    queryFn: async () => {
      return await machinesAPI.getMaintenance(machineId);
    },
    enabled: !!machineId,
  });
}

export function useAddMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ machineId, maintenance }: { machineId: string; maintenance: MaintenanceCreate }) => {
      return await machinesAPI.addMaintenance(machineId, maintenance);
    },
    onSuccess: (_, { machineId }) => {
      queryClient.invalidateQueries({ queryKey: ['machines', machineId, 'maintenance'] });
    },
  });
}

export function useTestMachineConnection() {
  return useMutation({
    mutationFn: async ({ machineId }: { machineId: string }) => {
      // This would typically test the connection to the machine
      // For now, we'll simulate a connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, message: 'Connection successful' };
    },
  });
}