import { useState, useEffect } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import {
  useExpectedAmounts,
  useCreateReconciliation,
  useReconciliations,
} from '@/hooks/useReconciliation';
import { useDailyIncome, useOutstandingBalances } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Calculator,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Banknote,
  Smartphone,
  CreditCard,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DailyReconciliation() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [actualCash, setActualCash] = useState('');
  const [actualCard, setActualCard] = useState('');
  const [actualMobileMoney, setActualMobileMoney] = useState('');
  const [notes, setNotes] = useState('');

  const { data: expected, isLoading: loadingExpected } =
    useExpectedAmounts(selectedDate);
  const { data: reconciliations } = useReconciliations('all');
  const createReconciliation = useCreateReconciliation();

  // Actual collected from Payment records for the selected date
  const todayStart = new Date(selectedDate);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(selectedDate);
  todayEnd.setHours(23, 59, 59, 999);
  const { data: dailyIncome } = useDailyIncome(todayStart.toISOString(), todayEnd.toISOString());
  const todayData = Array.isArray(dailyIncome) && dailyIncome.length > 0 ? dailyIncome[0] : null;

  const { data: outstandingData } = useOutstandingBalances();

  const actualCashNum = parseFloat(actualCash) || 0;
  const actualCardNum = parseFloat(actualCard) || 0;
  const actualMobileMoneyNum = parseFloat(actualMobileMoney) || 0;
  const actualTotal = actualCashNum + actualCardNum + actualMobileMoneyNum;

  const cashVariance = actualCashNum - (expected?.expectedCash || 0);
  const cardVariance = actualCardNum - (expected?.expectedCard || 0);
  const mobileMoneyVariance =
    actualMobileMoneyNum - (expected?.expectedMobileMoney || 0);
  const totalVariance = actualTotal - (expected?.expectedTotal || 0);

  const hasVariance = Math.abs(totalVariance) > 0.01;

  const handleSubmit = async () => {
    if (!actualCash || !actualCard || !actualMobileMoney) {
      toast.error('Please enter all actual amounts');
      return;
    }

    if (hasVariance && !notes) {
      toast.error('Please provide notes explaining the variance');
      return;
    }

    try {
      await createReconciliation.mutateAsync({
        reconciliationDate: new Date(selectedDate),
        actualCash: actualCashNum,
        actualCard: actualCardNum,
        actualMobileMoney: actualMobileMoneyNum,
        notes: notes || undefined,
      });

      toast.success('Reconciliation submitted successfully');
      setActualCash('');
      setActualCard('');
      setActualMobileMoney('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit reconciliation');
    }
  };

  const todayReconciliation = reconciliations?.find((r: any) => {
    const recDate = new Date(r.reconciliationDate).toISOString().split('T')[0];
    return recDate === selectedDate;
  });

  const statusStyles = {
    pending: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    approved: 'bg-status-normal/10 text-status-normal border-status-normal/20',
    rejected: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  };

  return (
    <RoleLayout
      title="Daily Reconciliation"
      subtitle="Submit end-of-day cash reconciliation"
      role="receptionist"
      userName={profile?.full_name}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reconciliation Form */}
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Submit Reconciliation</h3>

            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {todayReconciliation ? (
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-status-normal" />
                    <p className="font-medium">Reconciliation Already Submitted</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Submitted on {format(new Date(todayReconciliation.submittedAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn('capitalize', statusStyles[todayReconciliation.status as keyof typeof statusStyles])}
                  >
                    {todayReconciliation.status}
                  </Badge>
                </div>
              ) : loadingExpected ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Expected Amounts */}
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-3">Expected Amounts (System)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cash:</span>
                        <span className="font-medium">
                          Le {(expected?.expectedCash || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Card:</span>
                        <span className="font-medium">
                          Le {(expected?.expectedCard || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mobile Money:</span>
                        <span className="font-medium">
                          Le {(expected?.expectedMobileMoney || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Total:</span>
                        <span>Le {(expected?.expectedTotal || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Total Orders:</span>
                        <span>{expected?.totalOrders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid Orders:</span>
                        <span>{expected?.paidOrders || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actual Amounts */}
                  <div>
                    <h4 className="font-medium mb-3">Actual Amounts (Counted)</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Cash</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Card</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={actualCard}
                          onChange={(e) => setActualCard(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Mobile Money</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={actualMobileMoney}
                          onChange={(e) => setActualMobileMoney(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Variance Display */}
                  {(actualCash || actualCard || actualMobileMoney) && (
                    <div
                      className={cn(
                        'rounded-lg p-4',
                        hasVariance
                          ? 'bg-status-warning/10 border border-status-warning/20'
                          : 'bg-status-normal/10 border border-status-normal/20'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {hasVariance ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-status-warning" />
                            <h4 className="font-medium">Variance Detected</h4>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-status-normal" />
                            <h4 className="font-medium">Balanced</h4>
                          </>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Cash Variance:</span>
                          <span
                            className={cn(
                              'font-medium',
                              cashVariance > 0
                                ? 'text-status-normal'
                                : cashVariance < 0
                                ? 'text-status-critical'
                                : ''
                            )}
                          >
                            {cashVariance > 0 ? '+' : ''}Le {cashVariance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Card Variance:</span>
                          <span
                            className={cn(
                              'font-medium',
                              cardVariance > 0
                                ? 'text-status-normal'
                                : cardVariance < 0
                                ? 'text-status-critical'
                                : ''
                            )}
                          >
                            {cardVariance > 0 ? '+' : ''}Le {cardVariance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mobile Money Variance:</span>
                          <span
                            className={cn(
                              'font-medium',
                              mobileMoneyVariance > 0
                                ? 'text-status-normal'
                                : mobileMoneyVariance < 0
                                ? 'text-status-critical'
                                : ''
                            )}
                          >
                            {mobileMoneyVariance > 0 ? '+' : ''}Le{' '}
                            {mobileMoneyVariance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold">
                          <span>Total Variance:</span>
                          <span
                            className={cn(
                              totalVariance > 0
                                ? 'text-status-normal'
                                : totalVariance < 0
                                ? 'text-status-critical'
                                : ''
                            )}
                          >
                            {totalVariance > 0 ? '+' : ''}Le {totalVariance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {hasVariance && (
                    <div>
                      <Label>
                        Notes <span className="text-status-critical">*</span>
                      </Label>
                      <Textarea
                        placeholder="Explain the variance (required when there's a difference)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={createReconciliation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {createReconciliation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    <Calculator className="w-4 h-4 mr-2" />
                    Submit Reconciliation
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Reconciliations */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Recent Reconciliations</h3>
          <div className="space-y-3">
            {reconciliations?.slice(0, 10).map((rec: any) => (
              <div
                key={rec._id || rec.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">
                    {format(new Date(rec.reconciliationDate), 'MMM dd, yyyy')}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn('capitalize', statusStyles[rec.status as keyof typeof statusStyles])}
                  >
                    {rec.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {rec.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {rec.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                    {rec.status}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Expected:</span>
                    <span>Le {rec.expectedTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Actual:</span>
                    <span>Le {rec.actualTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Variance:</span>
                    <span
                      className={cn(
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
                </div>
                {rec.reviewNotes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Admin: {rec.reviewNotes}
                  </p>
                )}
              </div>
            ))}
            {(!reconciliations || reconciliations.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No reconciliations yet
              </p>
            )}
          </div>
        </div>

        {/* Collected Today Panel */}
        <div className="space-y-4">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Collected Today (System)</h3>
            {!todayData ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payments recorded for this date</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Banknote className="w-4 h-4 text-muted-foreground" /> Cash
                  </span>
                  <span className="font-semibold">Le {(todayData.cashPayments || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Smartphone className="w-4 h-4 text-muted-foreground" /> Orange Money
                  </span>
                  <span className="font-semibold">Le {(todayData.orangeMoneyPayments || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" /> Afrimoney
                  </span>
                  <span className="font-semibold">Le {(todayData.afrimoneyPayments || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t font-bold">
                  <span>Total collected</span>
                  <span className="text-status-normal">Le {(todayData.totalIncome || 0).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{todayData.paymentCount || 0} payment transaction(s)</p>
              </div>
            )}
          </div>

          {/* Outstanding Balances Panel */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-lg">Outstanding Balances</h3>
            </div>
            {!outstandingData ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : outstandingData.summary.totalOutstanding === 0 ? (
              <p className="text-sm text-status-normal text-center py-4">All orders fully paid ✓</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Partial ({outstandingData.summary.partialCount})</p>
                    <p className="font-bold text-amber-600">Le {(outstandingData.summary.partialBalance || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">remaining</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Unpaid ({outstandingData.summary.pendingCount})</p>
                    <p className="font-bold text-destructive">Le {(outstandingData.summary.pendingBalance || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">owed</p>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t">
                  <span>Total outstanding</span>
                  <span className="text-amber-600">Le {(outstandingData.summary.totalOutstanding || 0).toLocaleString()}</span>
                </div>
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {outstandingData.orders.slice(0, 20).map((o: any) => (
                    <div key={o._id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <p className="font-mono text-xs">{o.orderNumber}</p>
                        <p className="text-muted-foreground">
                          {o.patientId?.firstName} {o.patientId?.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn('text-xs', o.paymentStatus === 'partial' ? 'text-amber-600' : 'text-destructive')}>
                          {o.paymentStatus}
                        </Badge>
                        <p className="font-semibold text-amber-600">Le {Number(o.balance || o.total).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}
