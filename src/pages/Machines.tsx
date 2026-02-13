import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useMachines, useTestMachineConnection, useUpdateMachine } from '@/hooks/useMachines';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Settings, Wifi, WifiOff, Activity, Send, CheckCircle, XCircle, Loader2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LiveConnectionMonitor } from '@/components/machines/LiveConnectionMonitor';
import type { Database } from '@/integrations/supabase/types';

type Machine = Database['public']['Tables']['machines']['Row'];
type MachineStatus = Database['public']['Enums']['machine_status'];
type MachineProtocol = Database['public']['Enums']['machine_protocol'];

export default function Machines() {
  const { data: machines, isLoading, refetch } = useMachines();
  const testConnection = useTestMachineConnection();
  const updateMachine = useUpdateMachine();
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const statusConfig: Record<MachineStatus, { indicator: string; label: string; icon: typeof Wifi; labelClass: string }> = {
    online: {
      indicator: 'machine-online',
      label: 'Online',
      icon: Wifi,
      labelClass: 'text-status-normal',
    },
    offline: {
      indicator: 'machine-offline',
      label: 'Offline',
      icon: WifiOff,
      labelClass: 'text-muted-foreground',
    },
    error: {
      indicator: 'machine-error',
      label: 'Error',
      icon: WifiOff,
      labelClass: 'text-status-critical',
    },
    processing: {
      indicator: 'machine-processing',
      label: 'Processing',
      icon: Activity,
      labelClass: 'text-primary',
    },
  };

  const handleTestConnection = async (machine: Machine) => {
    setSelectedMachine(machine);
    setIsTestOpen(true);
    setTestResult('testing');
    
    try {
      await testConnection.mutateAsync(machine.id);
      setTestResult('success');
      toast.success(`Connection to ${machine.name} successful`);
      refetch();
    } catch (error) {
      setTestResult('error');
      toast.error(`Failed to connect to ${machine.name}`);
    }
  };

  const handleRefreshStatus = async () => {
    await refetch();
    toast.success('Machine status refreshed');
  };

  const handleConfigSave = async (updates: Partial<Machine>) => {
    if (!selectedMachine) return;
    
    try {
      await updateMachine.mutateAsync({
        id: selectedMachine.id,
        updates: updates as Database['public']['Tables']['machines']['Update']
      });
      toast.success('Machine configuration saved');
      setIsConfigOpen(false);
      refetch();
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Machines" subtitle="Configure and monitor laboratory analyzers">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Machines" subtitle="Configure and monitor laboratory analyzers">
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefreshStatus}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Machine
        </Button>
      </div>

      {/* Live Connection Monitor */}
      <div className="mb-6">
        <LiveConnectionMonitor />
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {machines?.map(machine => {
          const config = statusConfig[machine.status];
          const StatusIcon = config.icon;
          
          return (
            <div key={machine.id} className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <StatusIcon className={cn('w-7 h-7', config.labelClass)} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{machine.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {machine.manufacturer} {machine.model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('machine-indicator', config.indicator)} />
                  <span className={cn('text-sm font-medium', config.labelClass)}>
                    {config.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Serial Number</p>
                  <p className="font-mono text-sm">{machine.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Protocol</p>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {machine.protocol}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">IP Address</p>
                  <p className="font-mono text-sm">
                    {machine.ip_address ? `${machine.ip_address}:${machine.port}` : 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Communication</p>
                  <p className="text-sm">
                    {machine.last_communication 
                      ? new Date(machine.last_communication).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Supported Tests</p>
                <div className="flex flex-wrap gap-1">
                  {machine.tests_supported?.slice(0, 6).map(test => (
                    <span key={test} className="px-2 py-1 bg-muted rounded text-xs font-medium">
                      {test}
                    </span>
                  ))}
                  {(machine.tests_supported?.length || 0) > 6 && (
                    <span className="px-2 py-1 bg-muted rounded text-xs">
                      +{(machine.tests_supported?.length || 0) - 6}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedMachine(machine);
                    setIsConfigOpen(true);
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleTestConnection(machine)}
                  disabled={testConnection.isPending}
                >
                  {testConnection.isPending && selectedMachine?.id === machine.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* No machines */}
      {(!machines || machines.length === 0) && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Analyzers Configured</h3>
          <p className="text-muted-foreground mb-4">Add your laboratory analyzers to enable automatic result transmission.</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Machine
          </Button>
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure {selectedMachine?.name}</DialogTitle>
            <DialogDescription>
              Update the network and communication settings for this analyzer.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMachine && (
            <MachineConfigForm 
              machine={selectedMachine} 
              onSave={handleConfigSave}
              onCancel={() => setIsConfigOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Test: {selectedMachine?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="py-8 text-center">
            {testResult === 'testing' && (
              <>
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium">Testing connection...</p>
                <p className="text-muted-foreground text-sm">
                  Attempting to reach {selectedMachine?.ip_address}:{selectedMachine?.port}
                </p>
              </>
            )}
            {testResult === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 text-status-normal mx-auto mb-4" />
                <p className="text-lg font-medium text-status-normal">Connection Successful</p>
                <p className="text-muted-foreground text-sm">
                  The analyzer is responding and ready to receive data.
                </p>
              </>
            )}
            {testResult === 'error' && (
              <>
                <XCircle className="w-16 h-16 text-status-critical mx-auto mb-4" />
                <p className="text-lg font-medium text-status-critical">Connection Failed</p>
                <p className="text-muted-foreground text-sm">
                  Could not establish connection. Check network settings and ensure the analyzer is powered on.
                </p>
              </>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsTestOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// Configuration Form Component
function MachineConfigForm({ 
  machine, 
  onSave, 
  onCancel 
}: { 
  machine: Machine; 
  onSave: (updates: Partial<Machine>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: machine.name,
    manufacturer: machine.manufacturer,
    model: machine.model,
    serial_number: machine.serial_number || '',
    protocol: machine.protocol,
    ip_address: machine.ip_address || '',
    port: machine.port?.toString() || '5000',
    tests_supported: machine.tests_supported?.join(', ') || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serial_number: formData.serial_number || null,
      protocol: formData.protocol as MachineProtocol,
      ip_address: formData.ip_address || null,
      port: formData.port ? parseInt(formData.port) : null,
      tests_supported: formData.tests_supported 
        ? formData.tests_supported.split(',').map(s => s.trim())
        : null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="network" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protocol">Protocol</Label>
              <Select 
                value={formData.protocol} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, protocol: value as MachineProtocol }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HL7">HL7 v2.5.1</SelectItem>
                  <SelectItem value="ASTM">ASTM E1394</SelectItem>
                  <SelectItem value="LIS2_A2">LIS2-A2</SelectItem>
                  <SelectItem value="FHIR">FHIR R4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                placeholder="192.168.1.100"
                value={formData.ip_address}
                onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">TCP Bridge Setup (Recommended)</h4>
              <p className="text-xs text-muted-foreground mb-2">
                For direct TCP connections from analyzers, run the LabConnect TCP Bridge on your local network:
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside mb-3">
                <li>Download the TCP Bridge from <code className="bg-background px-1 rounded">middleware/tcp-bridge/</code></li>
                <li>Install: <code className="bg-background px-1 rounded">npm install</code></li>
                <li>Configure <code className="bg-background px-1 rounded">.env</code> with settings below</li>
                <li>Start: <code className="bg-background px-1 rounded">npm start</code></li>
              </ol>
              <div className="bg-background p-3 rounded text-xs font-mono space-y-1">
                <p>TCP_PORT=5000</p>
                <p>PROTOCOL={formData.protocol}</p>
                <p>MACHINE_ID={machine.id}</p>
                <p>ENDPOINT_URL={import.meta.env.VITE_API_URL || 'http://localhost:3000'}/hl7/receive</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Direct HTTP Endpoint</h4>
              <p className="text-xs text-muted-foreground mb-2">
                For analyzers with HTTP support, configure to send messages to:
              </p>
              <code className="text-xs bg-background px-2 py-1 rounded block">
                POST {import.meta.env.VITE_API_URL || 'http://localhost:3000'}/hl7/receive
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Include header: <code className="bg-background px-1 rounded">x-machine-id: {machine.id}</code>
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tests" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="tests">Supported Test Codes</Label>
            <Input
              id="tests"
              placeholder="CBC, WBC, RBC, HGB, PLT"
              value={formData.tests_supported}
              onChange={(e) => setFormData(prev => ({ ...prev, tests_supported: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Enter test codes separated by commas. These should match your test catalog codes.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}
