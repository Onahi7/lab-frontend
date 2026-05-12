import { useState, useMemo } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useResults, useUpdateResult, useDeleteResult } from '@/hooks/useResults';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Loader2, Pencil, Trash2, Check, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ResultFlag = 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';

function formatFlag(flag?: string): string {
  if (!flag) return 'Unknown';
  return flag.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function safeFormat(dateStr?: string, fmt = 'MMM dd, HH:mm'): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return format(d, fmt);
  } catch {
    return '-';
  }
}

export default function ResultsManagementPage() {
  const { profile, primaryRole } = useAuth();
  const { data: allResults, isLoading } = useResults();
  const { data: allOrders } = useOrders();
  const updateResult = useUpdateResult();
  const deleteResult = useDeleteResult();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const ordersMap = useMemo(() => {
    const map: Record<string, any> = {};
    (allOrders || []).forEach(order => {
      const id = order.id || order._id;
      if (id) map[id] = order;
    });
    return map;
  }, [allOrders]);

  const filteredResults = (allResults || []).filter(result => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const order = (result.orders || result.orderId) as any;
    const testCode = (result.testCode || result.test_code || '').toLowerCase();
    const testName = (result.testName || result.test_name || '').toLowerCase();
    const orderNumber = (order?.orderNumber || order?.order_number || '').toLowerCase();
    const firstName = (order?.patient?.firstName || order?.patients?.first_name || '').toLowerCase();
    const lastName = (order?.patient?.lastName || order?.patients?.last_name || '').toLowerCase();
    return (
      testCode.includes(search) ||
      testName.includes(search) ||
      orderNumber.includes(search) ||
      firstName.includes(search) ||
      lastName.includes(search)
    );
  });

  const handleEdit = (resultId: string, currentValue: string) => {
    setEditingId(resultId);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateResult.mutateAsync({
        id: editingId,
        updates: { value: editValue },
      });
      toast.success('Result updated');
      setEditingId(null);
      setEditValue('');
    } catch {
      toast.error('Failed to update result');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteResult.mutateAsync(deleteConfirmId);
      toast.success('Result deleted');
    } catch {
      toast.error('Failed to delete result');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const flagStyles: Record<string, string> = {
    normal: 'bg-status-normal/10 text-status-normal border-status-normal/20',
    low: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    high: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    critical_low: 'bg-status-critical/10 text-status-critical border-status-critical/20',
    critical_high: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  };

  return (
    <RoleLayout
      title="Results Management"
      subtitle="Search, view, edit and delete test results"
      role="admin"
      userName={profile?.full_name}
    >
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by test code, test name, order number, or patient name..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Patient</th>
                <th>Test</th>
                <th>Value</th>
                <th>Reference</th>
                <th>Flag</th>
                <th>Status</th>
                <th>Resulted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map(result => {
                const order = (result.orders || result.orderId) as any;
                const resultId = result.id || result._id;
                const testCode = result.testCode || result.test_code || '';
                const testName = result.testName || result.test_name || '';
                const referenceRange = result.referenceRange || result.reference_range;
                const resultedAt = result.resulted_at || result.createdAt;
                const orderNumber = order?.orderNumber || order?.order_number;
                const patientName = order?.patient
                  ? `${order.patient.firstName} ${order.patient.lastName}`
                  : order?.patients
                  ? `${order.patients.first_name} ${order.patients.last_name}`
                  : '-';
                const patientId = order?.patient?.patientId || order?.patients?.patient_id || '-';
                const orderId = order?.id || order?._id;

                return (
                  <tr key={resultId}>
                    <td className="font-mono text-sm">{orderNumber || '-'}</td>
                    <td>
                      <div>
                        <p className="font-medium">{patientName}</p>
                        <p className="text-xs text-muted-foreground">{patientId}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{testCode}</p>
                        <p className="text-xs text-muted-foreground">{testName}</p>
                      </div>
                    </td>
                    <td>
                      {editingId === resultId ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="h-7 w-32 text-sm"
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit}>
                            <Check className="w-3.5 h-3.5 text-status-normal" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                            <X className="w-3.5 h-3.5 text-status-critical" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold">{result.value}</span>
                          <span className="text-muted-foreground text-sm">{result.unit}</span>
                        </div>
                      )}
                    </td>
                    <td className="text-muted-foreground text-sm max-w-32 truncate" title={referenceRange || ''}>
                      {referenceRange || '-'}
                    </td>
                    <td>
                      <Badge variant="outline" className={cn(flagStyles[result.flag ?? ''] ?? '')}>
                        {formatFlag(result.flag)}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        variant={
                          result.status === 'verified'
                            ? 'default'
                            : result.status === 'amended'
                            ? 'outline'
                            : 'secondary'
                        }
                        className={result.status === 'amended' ? 'border-status-warning/40 text-status-warning' : undefined}
                      >
                        {result.status ? result.status.charAt(0).toUpperCase() + result.status.slice(1) : '-'}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {safeFormat(resultedAt)}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {orderId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/lab/reports/${orderId}`, '_blank')}
                            title="View Report"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        {result.status !== 'verified' && result.status !== 'amended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(resultId, result.value || '')}
                            title="Edit result"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmId(resultId)}
                          title="Delete result"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No results match your search' : 'No results found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Showing {filteredResults.length} of {(allResults || []).length} results
      </p>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Result</DialogTitle>
            <DialogDescription>
              Permanently delete this result? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteResult.isPending}
            >
              {deleteResult.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}