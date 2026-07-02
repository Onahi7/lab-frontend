import { useMemo, useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import {
  ExternalApiClient,
  useCreateExternalApiClient,
  useExternalApiClients,
  useUpdateExternalApiClient,
} from '@/hooks/useExternalApiClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, KeyRound, Loader2, Plug, Save } from 'lucide-react';
import { toast } from 'sonner';

function getClientId(client: ExternalApiClient) {
  return client._id || client.id || '';
}

export default function IntegrationClientsPage() {
  const { profile } = useAuth();
  const [facilityName, setFacilityName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [priceMarkupPercentage, setPriceMarkupPercentage] = useState('0');
  const [pendingMarkup, setPendingMarkup] = useState<Record<string, string>>({});

  const { data: clients = [], isLoading } = useExternalApiClients();
  const createClient = useCreateExternalApiClient();
  const updateClient = useUpdateExternalApiClient();

  const clientCount = useMemo(() => (Array.isArray(clients) ? clients.length : 0), [clients]);

  const resetForm = () => {
    setFacilityName('');
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setPriceMarkupPercentage('0');
  };

  const parseMarkup = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const onCreateClient = async () => {
    if (!facilityName.trim()) {
      toast.error('Facility name is required');
      return;
    }

    try {
      const created = await createClient.mutateAsync({
        facilityName: facilityName.trim(),
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        priceMarkupPercentage: parseMarkup(priceMarkupPercentage),
      });
      resetForm();
      if (created.apiKey) {
        await navigator.clipboard?.writeText(created.apiKey).catch(() => undefined);
        toast.success('Integration created. API key copied to clipboard.');
      } else {
        toast.success('Integration created');
      }
    } catch {
      toast.error('Failed to create integration');
    }
  };

  const onSaveMarkup = async (client: ExternalApiClient) => {
    const id = getClientId(client);
    if (!id) return;

    try {
      await updateClient.mutateAsync({
        id,
        data: {
          priceMarkupPercentage: parseMarkup(
            pendingMarkup[id] ?? String(client.priceMarkupPercentage ?? 0),
          ),
        },
      });
      toast.success('Markup updated');
    } catch {
      toast.error('Failed to update markup');
    }
  };

  const copyKeyPrefix = async (prefix: string) => {
    await navigator.clipboard?.writeText(prefix).catch(() => undefined);
    toast.success('Key prefix copied');
  };

  return (
    <RoleLayout
      title="Integrations"
      subtitle="Manage external EMR clients and facility-specific price markups"
      role="admin"
      userName={profile?.full_name}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-card border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Plug className="w-4 h-4" /> Add Integration
          </h3>
          <div className="space-y-2">
            <Label>Facility name</Label>
            <Input
              value={facilityName}
              onChange={(event) => setFacilityName(event.target.value)}
              placeholder="Congo Cross EMR"
            />
          </div>
          <div className="space-y-2">
            <Label>Price increase (%)</Label>
            <Input
              type="number"
              min="0"
              max="1000"
              step="0.01"
              value={priceMarkupPercentage}
              onChange={(event) => setPriceMarkupPercentage(event.target.value)}
              placeholder="15"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact name</Label>
            <Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact phone</Label>
            <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact email</Label>
            <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
          </div>
          <Button className="w-full" onClick={onCreateClient} disabled={createClient.isPending}>
            {createClient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Integration
          </Button>
          <p className="text-xs text-muted-foreground">
            API keys are shown once after creation. Store the key before leaving this screen.
          </p>
        </div>

        <div className="xl:col-span-2 bg-card border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Integration Clients
            </h3>
            <Badge variant="secondary">{clientCount} clients</Badge>
          </div>

          {isLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : clientCount === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No integrations found.</div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Facility</th>
                    <th className="text-left px-3 py-2 font-medium">Key Prefix</th>
                    <th className="text-left px-3 py-2 font-medium">Markup</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Last Used</th>
                    <th className="text-right px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client: ExternalApiClient) => {
                    const id = getClientId(client);
                    const currentMarkup = String(client.priceMarkupPercentage ?? 0);
                    return (
                      <tr key={id || client.keyPrefix} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">{client.facilityName}</p>
                          {(client.contactName || client.contactPhone || client.contactEmail) && (
                            <p className="text-xs text-muted-foreground">
                              {[client.contactName, client.contactPhone, client.contactEmail]
                                .filter(Boolean)
                                .join(' | ')}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 gap-2"
                            onClick={() => copyKeyPrefix(client.keyPrefix)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {client.keyPrefix}
                          </Button>
                        </td>
                        <td className="px-3 py-2 min-w-[140px]">
                          <Input
                            type="number"
                            min="0"
                            max="1000"
                            step="0.01"
                            value={pendingMarkup[id] ?? currentMarkup}
                            onChange={(event) =>
                              setPendingMarkup((prev) => ({
                                ...prev,
                                [id]: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={client.isActive ? 'default' : 'secondary'}>
                            {client.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => onSaveMarkup(client)}
                            disabled={updateClient.isPending}
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleLayout>
  );
}
