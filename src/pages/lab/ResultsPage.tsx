import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useResults, useVerifyResult } from '@/hooks/useResults';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, CheckCircle, Download, Loader2, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getPatientName, getPatientId } from '@/utils/orderHelpers';
import type { Database } from '@/integrations/supabase/types';

type ResultFlag = Database['public']['Enums']['result_flag'];

export default function ResultsPage() {
  const { profile, user, primaryRole } = useAuth();
  const currentRole = primaryRole === 'admin' ? 'admin' : primaryRole === 'receptionist' ? 'receptionist' : 'lab_tech';
  const navigate = useNavigate();
  const { data: results, isLoading } = useResults();
  const verifyResult = useVerifyResult();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [flagFilter, setFlagFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredResults = results?.filter(result => {
    // Filter by status
    if (statusFilter !== 'all' && result.status !== statusFilter) return false;
    
    // Filter by flag
    if (flagFilter !== 'all' && result.flag !== flagFilter) return false;
    
    // Filter by search
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const order = (result.orders || result.orderId) as any;
    const testCode = result.testCode || result.test_code || '';
    const testName = result.testName || result.test_name || '';
    const orderNumber = order?.orderNumber || order?.order_number || '';
    const firstName = order?.patient?.firstName || order?.patients?.first_name || '';
    const lastName = order?.patient?.lastName || order?.patients?.last_name || '';
    return (
      testCode.toLowerCase().includes(search) ||
      testName.toLowerCase().includes(search) ||
      orderNumber.toLowerCase().includes(search) ||
      firstName.toLowerCase().includes(search) ||
      lastName.toLowerCase().includes(search)
    );
  });

  const handleVerify = async (id: string) => {
    if (!user?.id) return;

    try {
      await verifyResult.mutateAsync({ id });
      toast.success('Result verified');
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      toast.error('Failed to verify result');
    }
  };

  const handleVerifySelected = async () => {
    if (!user?.id) return;

    for (const id of selectedIds) {
      try {
        await verifyResult.mutateAsync({ id });
      } catch (error) {
        console.error('Failed to verify:', id);
      }
    }
    toast.success(`Verified ${selectedIds.size} results`);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResults?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults?.map(r => r.id) || []));
    }
  };

  const flagStyles: Record<ResultFlag, string> = {
    normal: 'bg-status-normal/10 text-status-normal border-status-normal/20',
    low: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    high: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    critical_low: 'bg-status-critical/10 text-status-critical border-status-critical/20',
    critical_high: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  };

  return (
    <RoleLayout 
      title="Results" 
      subtitle="View and verify test results"
      role={currentRole}
      userName={profile?.full_name}
    >
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search results..." 
              className="pl-10 w-80"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="preliminary">Preliminary</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={flagFilter} onValueChange={setFlagFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Flag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Flags</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical_low">Critical Low</SelectItem>
              <SelectItem value="critical_high">Critical High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={handleVerifySelected}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify Selected ({selectedIds.size})
            </Button>
          )}
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
                <th className="w-8">
                  <input 
                    type="checkbox" 
                    className="rounded"
                    checked={selectedIds.size === filteredResults?.length && (filteredResults?.length || 0) > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
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
              {filteredResults?.map(result => {
                const order = (result.orders || result.orderId) as any;
                const resultId = result.id || result._id;
                const testCode = result.testCode || result.test_code;
                const testName = result.testName || result.test_name;
                const referenceRange = result.referenceRange || result.reference_range;
                const resultedAt = result.resulted_at || result.createdAt;
                const orderNumber = order?.orderNumber || order?.order_number;
                return (
                  <tr key={resultId}>
                    <td>
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={selectedIds.has(resultId)}
                        onChange={() => toggleSelect(resultId)}
                      />
                    </td>
                    <td className="font-mono text-sm">{orderNumber || '-'}</td>
                    <td>
                      {(order?.patient || order?.patients || order?.patientId) && (
                        <div>
                          <p className="font-medium">
                            {getPatientName(order)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getPatientId(order)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{testCode}</p>
                        <p className="text-xs text-muted-foreground">{testName}</p>
                      </div>
                    </td>
                    <td className="font-mono font-bold">
                      {result.value} <span className="font-normal text-muted-foreground">{result.unit}</span>
                    </td>
                    <td className="text-muted-foreground">{referenceRange || '-'}</td>
                    <td>
                      <Badge variant="outline" className={cn(flagStyles[result.flag])}>
                        {result.flag === 'normal' ? 'Normal' : result.flag.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={result.status === 'verified' ? 'default' : 'secondary'}>
                        {result.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {resultedAt ? format(new Date(resultedAt), 'MMM dd, HH:mm') : '-'}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/lab/reports/${order?.id || order?._id}`)}
                          title="View Report"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {result.status !== 'verified' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVerify(resultId)}
                            disabled={verifyResult.isPending}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!filteredResults || filteredResults.length === 0) && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-foreground">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </RoleLayout>
  );
}
