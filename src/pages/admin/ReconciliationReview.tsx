import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import {
  useReconciliations,
  useReviewReconciliation,
} from '@/hooks/useReconciliation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ReconciliationReview() {
  const { profile } = useAuth();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);

  const { data: reconciliations, isLoading } = useReconciliations(statusFilter);
  const reviewReconciliation = useReviewReconciliation();

  const statusStyles = {
    pending: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    approved: 'bg-status-normal/10 text-status-normal border-status-normal/20',
    rejected: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  };

  const handleReview = async () => {
    if (!selectedRec || !reviewAction) return;

    try {
      await reviewReconciliation.mutateAsync({
        id: selectedRec._id || selectedRec.id,
        approved: reviewAction === 'approve',
        notes: reviewNotes || undefined,
      });

      toast.success(
        `Reconciliation ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`
      );
      setShowReviewDialog(false);
      setSelectedRec(null);
      setReviewNotes('');
      setReviewAction(null);
    } catch (error) {
      toast.error('Failed to review reconciliation');
    }
  };

  const openReviewDialog = (rec: any, action: 'approve' | 'reject') => {
    setSelectedRec(rec);
    setReviewAction(action);
    setShowReviewDialog(true);
  };

  return (
    <RoleLayout
      title="Reconciliation Review"
      subtitle="Review and approve daily cash reconciliations"
      role="admin"
      userName={profile?.full_name}
    >
      {/* Filter */}
      <div className="flex items-center justify-between mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Badge variant="outline" className={statusStyles.pending}>
            <Clock className="w-3 h-3 mr-1" />
            {reconciliations?.filter((r: any) => r.status === 'pending').length || 0} Pending
          </Badge>
        </div>
      </div>

      {/* Reconciliations List */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Submitted By</th>
                <th>Expected</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Orders</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations?.map((rec: any) => {
                const hasVariance = Math.abs(rec.totalVariance) > 0.01;
                return (
                  <tr key={rec._id || rec.id}>
                    <td className="font-medium">
                      {format(new Date(rec.reconciliationDate), 'MMM dd, yyyy')}
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{rec.submittedBy?.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(rec.submittedAt), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        <p className="font-medium">Le {rec.expectedTotal.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Cash: {rec.expectedCash.toLocaleString()} | Card:{' '}
                          {rec.expectedCard.toLocaleString()} | Mobile:{' '}
                          {rec.expectedMobileMoney.toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        <p className="font-medium">Le {rec.actualTotal.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Cash: {rec.actualCash.toLocaleString()} | Card:{' '}
                          {rec.actualCard.toLocaleString()} | Mobile:{' '}
                          {rec.actualMobileMoney.toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {hasVariance && (
                          <AlertTriangle className="w-4 h-4 text-status-warning" />
                        )}
                        <span
                          className={cn(
                            'font-medium',
                            rec.totalVariance > 0
                              ? 'text-status-normal'
                              : rec.totalVariance < 0
                              ? 'text-status-critical'
                              : ''
                          )}
                        >
                          {rec.totalVariance > 0 ? '+' : ''}Le{' '}
                          {rec.totalVariance.toLocaleString()}
                        </span>
                      </div>
                      {rec.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {rec.notes}
                        </p>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">
                        <p>{rec.totalOrders} total</p>
                        <p className="text-xs text-muted-foreground">
                          {rec.paidOrders} paid
                        </p>
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant="outline"
                        className={cn('capitalize', statusStyles[rec.status as keyof typeof statusStyles])}
                      >
                        {rec.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {rec.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {rec.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {rec.status}
                      </Badge>
                      {rec.reviewedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {rec.reviewedBy.fullName}
                        </p>
                      )}
                    </td>
                    <td>
                      {rec.status === 'pending' ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openReviewDialog(rec, 'approve')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openReviewDialog(rec, 'reject')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!reconciliations || reconciliations.length === 0) && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No reconciliations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Reconciliation
            </DialogTitle>
          </DialogHeader>

          {selectedRec && (
            <div className="py-4">
              <div className="bg-muted rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {format(new Date(selectedRec.reconciliationDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted By:</span>
                    <span className="font-medium">{selectedRec.submittedBy?.fullName}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Expected Total:</span>
                    <span className="font-medium">
                      Le {selectedRec.expectedTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Total:</span>
                    <span className="font-medium">
                      Le {selectedRec.actualTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Variance:</span>
                    <span
                      className={cn(
                        selectedRec.totalVariance > 0
                          ? 'text-status-normal'
                          : selectedRec.totalVariance < 0
                          ? 'text-status-critical'
                          : ''
                      )}
                    >
                      {selectedRec.totalVariance > 0 ? '+' : ''}Le{' '}
                      {selectedRec.totalVariance.toLocaleString()}
                    </span>
                  </div>
                </div>
                {selectedRec.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Receptionist Notes:</p>
                    <p className="text-sm italic">{selectedRec.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Review Notes (Optional)</label>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewDialog(false);
                setReviewNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewReconciliation.isPending}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {reviewReconciliation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {reviewAction === 'approve' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
