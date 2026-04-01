import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { RoleLayout } from '../../components/layout/RoleLayout';
import { useAuth } from '../../context/AuthContext';
import { LabResultReport } from '../../components/reports/LabResultReport';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Loader2, Clock } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { useResults, useAmendResult } from '../../hooks/useResults';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export default function LabReportPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { profile, primaryRole } = useAuth();

  const canEditResults = primaryRole === 'lab_tech' || primaryRole === 'receptionist' || primaryRole === 'admin';
  const isAdmin = primaryRole === 'admin';

  // Edit result dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [newValue, setNewValue] = useState('');
  const [amendReason, setAmendReason] = useState('');

  // Fetch completed orders for pagination
  const { data: completedOrders } = useOrders('completed');
  const { data: processingOrders } = useOrders('processing');
  
  // Fetch results for this order (for edit + admin amendment view)
  const { data: orderResults } = useResults(orderId);
  const amendResult = useAmendResult();

  // Combine orders and find current index
  const allOrders = useMemo(() => {
    return [
      ...(Array.isArray(completedOrders) ? completedOrders : []),
      ...(Array.isArray(processingOrders) ? processingOrders : [])
    ];
  }, [completedOrders, processingOrders]);

  const currentIndex = useMemo(() => {
    return allOrders.findIndex(order => {
      const id = order._id || order.id;
      return id === orderId;
    });
  }, [allOrders, orderId]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allOrders.length - 1;

  // All results for this order (excludes amended duplicates for edit list)
  const currentResults = useMemo(() => {
    if (!Array.isArray(orderResults)) return [];
    // Show the latest result per test (prefer 'amended' > 'verified' > 'preliminary')
    const byCode: Record<string, any> = {};
    for (const r of orderResults) {
      const code = r.testCode || r.test_code;
      if (!byCode[code]) {
        byCode[code] = r;
      } else {
        const rank = (s: string) => s === 'amended' ? 2 : s === 'verified' ? 1 : 0;
        if (rank(r.status) >= rank(byCode[code].status)) byCode[code] = r;
      }
    }
    return Object.values(byCode);
  }, [orderResults]);

  const amendedResults = useMemo(() => {
    if (!Array.isArray(orderResults)) return [];
    return orderResults.filter((r: any) => r.status === 'amended');
  }, [orderResults]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevOrder = allOrders[currentIndex - 1];
      const prevId = prevOrder._id || prevOrder.id;
      const basePath = primaryRole === 'receptionist' ? '/reception/reports' : '/lab/reports';
      navigate(`${basePath}/${prevId}`);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextOrder = allOrders[currentIndex + 1];
      const nextId = nextOrder._id || nextOrder.id;
      const basePath = primaryRole === 'receptionist' ? '/reception/reports' : '/lab/reports';
      navigate(`${basePath}/${nextId}`);
    }
  };

  const openEditDialog = (result: any) => {
    setSelectedResult(result);
    setNewValue(result.value || '');
    setAmendReason('');
    setShowEditDialog(true);
  };

  const handleAmend = async () => {
    if (!selectedResult || !newValue.trim() || !amendReason.trim()) {
      toast.error('Please enter a new value and reason');
      return;
    }
    try {
      await amendResult.mutateAsync({
        id: selectedResult._id || selectedResult.id,
        newValue: newValue.trim(),
        reason: amendReason.trim(),
      });
      toast.success('Result amended successfully');
      setShowEditDialog(false);
    } catch {
      toast.error('Failed to amend result');
    }
  };

  // Determine the correct role for the layout
  const layoutRole = primaryRole || 'lab_tech';

  if (!orderId) {
    return (
      <RoleLayout
        title="Lab Report"
        subtitle="View and print laboratory test results"
        role={layoutRole}
        userName={profile?.full_name}
      >
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Order ID is required</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout
      title="Lab Report"
      subtitle="View and print laboratory test results"
      role={layoutRole}
      userName={profile?.full_name}
    >
      <div className="no-print mb-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {/* Edit Results Button - lab tech, receptionist, and admin */}
          {canEditResults && currentResults.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 no-print"
              onClick={() => setShowEditDialog(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit Results
            </Button>
          )}

          {/* Pagination Controls */}
          {allOrders.length > 1 && currentIndex >= 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Report
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                {currentIndex + 1} of {allOrders.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!hasNext}
                className="flex items-center gap-1"
              >
                Next Report
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <LabResultReport orderId={orderId} />

      {/* Amendment history - admin only */}
      {isAdmin && amendedResults.length > 0 && (
        <div className="no-print mt-6 border rounded-lg p-4 bg-status-warning/5 border-status-warning/30">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-status-warning">
            <Clock className="w-4 h-4" /> Amendment History
          </h3>
          <div className="space-y-2">
            {amendedResults.map((r: any) => (
              <div key={r._id || r.id} className="text-sm border rounded p-3 bg-background">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{r.testName || r.test_name} ({r.testCode || r.test_code})</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      New value: <span className="font-semibold text-foreground">{r.value}</span>
                    </p>
                    {r.amendmentReason && (
                      <p className="text-muted-foreground text-xs mt-0.5">Reason: {r.amendmentReason}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{r.resultedAt ? format(new Date(r.resultedAt), 'MMM dd, yyyy HH:mm') : format(new Date(r.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                    {r.resultedBy?.fullName && <p className="mt-0.5">by {r.resultedBy.fullName}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Result dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setSelectedResult(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Result</DialogTitle>
            <DialogDescription>
              Select a result to amend. The original value is preserved and an amendment record is created.
            </DialogDescription>
          </DialogHeader>

          {!selectedResult ? (
            // Show list of results to pick from
            <div className="space-y-2 py-2">
              {currentResults.map((r: any) => (
                <button
                  key={r._id || r.id}
                  className={cn(
                    'w-full text-left border rounded-lg p-3 hover:bg-muted transition-colors text-sm',
                    r.status === 'amended' ? 'border-status-warning/50 bg-status-warning/5' : ''
                  )}
                  onClick={() => openEditDialog(r)}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{r.testName || r.test_name}</span>
                    <span className="text-muted-foreground">{r.testCode || r.test_code}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Current: <strong className="text-foreground">{r.value}</strong> {r.unit}</span>
                    {r.status === 'amended' && <span className="text-status-warning font-medium">• Amended</span>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Show amendment form for selected result
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedResult.testName || selectedResult.test_name} ({selectedResult.testCode || selectedResult.test_code})</p>
                <p className="text-muted-foreground mt-1">Current value: <strong>{selectedResult.value}</strong> {selectedResult.unit}</p>
              </div>
              <div className="space-y-2">
                <Label>New Value *</Label>
                <Input
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Enter corrected value"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason for Amendment *</Label>
                <Textarea
                  value={amendReason}
                  onChange={e => setAmendReason(e.target.value)}
                  placeholder="Explain why the result is being amended..."
                  rows={3}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedResult(null)}>
                ← Back to result list
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedResult(null); }}>
              Cancel
            </Button>
            {selectedResult && (
              <Button onClick={handleAmend} disabled={amendResult.isPending}>
                {amendResult.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Amendment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
