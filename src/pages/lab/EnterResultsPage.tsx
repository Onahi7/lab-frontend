import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useProcessingOrders, useUpdateOrder } from '@/hooks/useOrders';
import { useCreateResult } from '@/hooks/useResults';
import { useActiveTests } from '@/hooks/useTestCatalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/hooks/useOrders';
import { getPatientName, getOrderNumber } from '@/utils/orderHelpers';
import { SendToAnalyzerDialog } from '@/components/machines/SendToAnalyzerDialog';

type ResultFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high';

interface ResultEntry {
  testId: string;
  orderTestId: string;
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: ResultFlag;
}

export default function EnterResultsPage() {
  const { profile, user } = useAuth();
  const { data: processingOrders, isLoading } = useProcessingOrders();
  const { data: testCatalog } = useActiveTests();
  const updateOrder = useUpdateOrder();
  const createResult = useCreateResult();

  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [resultEntries, setResultEntries] = useState<Record<string, ResultEntry>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSendToAnalyzer, setShowSendToAnalyzer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get reference info from test catalog
  const getTestInfo = (testCode: string, patientAge?: number, patientGender?: string) => {
    const test = testCatalog?.find((t: any) => t.code === testCode);
    if (!test) {
      return { unit: '', referenceRange: '' };
    }

    let referenceRange = test.referenceRange || '';
    
    // If we have age/gender-specific ranges, find the best match
    if (test.referenceRanges && test.referenceRanges.length > 0 && patientAge !== undefined) {
      const matchedRange = test.referenceRanges.find((r: any) => {
        // Check age range
        const ageMatch = 
          (r.ageMin === undefined || patientAge >= r.ageMin) &&
          (r.ageMax === undefined || patientAge <= r.ageMax);
        
        // Check gender
        const genderMatch = !r.gender || r.gender === 'all' || r.gender === patientGender;
        
        return ageMatch && genderMatch;
      });

      if (matchedRange) {
        referenceRange = `${matchedRange.range} ${matchedRange.unit || test.unit || ''}`.trim();
      }
    }

    return {
      unit: test.unit || '',
      referenceRange,
    };
  };

  const calculateFlag = (value: string, testCode: string): ResultFlag => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    const test = testCatalog?.find((t: any) => t.code === testCode);
    const rangeStr = test?.referenceRange || test?.reference_range;
    if (!rangeStr) return 'normal';

    // Parse reference range like "70-100" or "4.5-11.0"
    const match = rangeStr.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (!match) return 'normal';

    const low = parseFloat(match[1]);
    const high = parseFloat(match[2]);

    // Define critical thresholds (20% beyond normal)
    const criticalLow = low * 0.5;
    const criticalHigh = high * 1.5;

    if (numValue < criticalLow) return 'critical_low';
    if (numValue > criticalHigh) return 'critical_high';
    if (numValue < low) return 'low';
    if (numValue > high) return 'high';
    return 'normal';
  };

  const handleValueChange = (orderTest: any, value: string) => {
    const testCode = orderTest.testCode || orderTest.test_code || '';
    const patient = typeof selectedOrder?.patient === 'object' ? selectedOrder.patient : null;
    const patientAge = patient?.age;
    const patientGender = patient?.gender;
    const testInfo = getTestInfo(testCode, patientAge, patientGender);
    const flag = calculateFlag(value, testCode);
    const entryKey = orderTest.id || orderTest._id || testCode;

    setResultEntries(prev => ({
      ...prev,
      [entryKey]: {
        testId: orderTest.testId || orderTest.test_id || entryKey,
        orderTestId: entryKey,
        testCode,
        testName: orderTest.testName || orderTest.test_name || testCode,
        value,
        unit: testInfo.unit,
        referenceRange: testInfo.referenceRange,
        flag,
      }
    }));
  };

  const handleSubmitResults = () => {
    if (!selectedOrder) return;

    const entries = Object.values(resultEntries);
    if (entries.length === 0) {
      toast.error('Please enter at least one result');
      return;
    }

    // Check for critical values
    const criticalEntries = entries.filter(e => e.flag === 'critical_high' || e.flag === 'critical_low');
    if (criticalEntries.length > 0) {
      setShowConfirmModal(true);
      return;
    }

    submitResults();
  };

  const submitResults = async () => {
    if (!selectedOrder) return;
    setIsSubmitting(true);

    try {
      const entries = Object.values(resultEntries);
      
      // Create results
      for (const entry of entries) {
        await createResult.mutateAsync({
          orderId: selectedOrder.id || (selectedOrder as any)._id,
          orderTestId: entry.orderTestId,
          testCode: entry.testCode,
          testName: entry.testName,
          value: entry.value,
          unit: entry.unit || undefined,
          referenceRange: entry.referenceRange || undefined,
          flag: entry.flag,
        } as any);
      }

      // Update order status if all tests have results
      const orderTests = (selectedOrder as any).tests || (selectedOrder as any).order_tests || [];
      if (entries.length >= orderTests.length) {
        await updateOrder.mutateAsync({
          id: selectedOrder.id || (selectedOrder as any)._id,
          updates: { status: 'completed' },
        });
      } else {
        await updateOrder.mutateAsync({
          id: selectedOrder.id || (selectedOrder as any)._id,
          updates: { status: 'processing' },
        });
      }

      toast.success('Results submitted successfully');
      setShowConfirmModal(false);
      setResultEntries({});
      setSelectedOrder(null);
    } catch (error) {
      toast.error('Failed to submit results');
    } finally {
      setIsSubmitting(false);
    }
  };

  const flagStyles: Record<ResultFlag, string> = {
    normal: 'bg-status-normal/10 text-status-normal',
    low: 'bg-status-warning/10 text-status-warning',
    high: 'bg-status-warning/10 text-status-warning',
    critical_low: 'bg-status-critical/10 text-status-critical',
    critical_high: 'bg-status-critical/10 text-status-critical',
  };

  return (
    <RoleLayout 
      title="Enter Results" 
      subtitle="Input test results from analyzers"
      role="lab_tech"
      userName={profile?.full_name}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Processing Orders List */}
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-lg">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold">Processing Orders</h3>
              <p className="text-sm text-muted-foreground">{processingOrders?.length || 0} awaiting results</p>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {processingOrders?.map(order => (
                  <button
                    key={order.id}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                      selectedOrder?.id === order.id && 'bg-primary/5 border-l-4 border-primary'
                    )}
                    onClick={() => {
                      setSelectedOrder(order);
                      setResultEntries({});
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">
                        {getPatientName(order)}
                      </p>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        order.priority === 'stat' ? 'bg-status-critical/10 text-status-critical' :
                        order.priority === 'urgent' ? 'bg-status-warning/10 text-status-warning' :
                        'bg-muted'
                      )}>
                        {order.priority?.toUpperCase() || 'ROUTINE'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{getOrderNumber(order)}</p>
                    <p className="text-xs mt-1">
                      {((order as any).tests || (order as any).order_tests || []).map((t: any) => t.testCode || t.test_code || '').filter(Boolean).join(', ')}
                    </p>
                  </button>
                ))}
                {(!processingOrders || processingOrders.length === 0) && (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No orders processing</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result Entry Panel */}
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-lg p-4">
            {selectedOrder ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {getPatientName(selectedOrder)}
                      </h3>
                      <p className="text-sm text-muted-foreground">{getOrderNumber(selectedOrder)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSendToAnalyzer(true)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Send to Analyzer
                      </Button>
                      <Badge variant="outline" className={cn(
                        selectedOrder.priority === 'stat' ? 'bg-status-critical/10 text-status-critical' :
                        selectedOrder.priority === 'urgent' ? 'bg-status-warning/10 text-status-warning' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {selectedOrder.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Send to Analyzer Dialog */}
                <SendToAnalyzerDialog
                  open={showSendToAnalyzer}
                  onOpenChange={setShowSendToAnalyzer}
                  orderId={selectedOrder.id || (selectedOrder as any)._id}
                  orderNumber={getOrderNumber(selectedOrder)}
                  testCodes={((selectedOrder as any).tests || (selectedOrder as any).order_tests || []).map((t: any) => t.testCode || t.test_code || '').filter(Boolean)}
                />

                {(() => {
                  const allTests: any[] = (selectedOrder as any).tests || (selectedOrder as any).order_tests || [];
                  const patient = typeof selectedOrder.patient === 'object' ? selectedOrder.patient : null;
                  const patientAge = patient?.age;
                  const patientGender = patient?.gender;

                  // Group tests: panels first (keyed by panelCode), then standalone
                  const panelMap = new Map<string, { panelName: string; tests: any[] }>();
                  const standaloneTests: any[] = [];

                  for (const test of allTests) {
                    const pc = test.panelCode || test.panel_code;
                    const pn = test.panelName || test.panel_name;
                    if (pc) {
                      if (!panelMap.has(pc)) panelMap.set(pc, { panelName: pn || pc, tests: [] });
                      panelMap.get(pc)!.tests.push(test);
                    } else {
                      standaloneTests.push(test);
                    }
                  }

                  const renderTestRow = (test: any) => {
                    const testCode = test.testCode || test.test_code || '';
                    const testName = test.testName || test.test_name || testCode;
                    const testKey = test.id || test._id || testCode;
                    const entry = resultEntries[testKey];
                    const testInfo = getTestInfo(testCode, patientAge, patientGender);

                    return (
                      <div key={testKey} className="grid grid-cols-12 gap-3 items-center py-3 px-3 border-b last:border-b-0">
                        <div className="col-span-4">
                          <p className="font-medium text-sm">{testCode}</p>
                          <p className="text-xs text-muted-foreground">{testName}</p>
                        </div>
                        <div className="col-span-3">
                          <Input
                            id={`value-${testKey}`}
                            placeholder="Value"
                            value={entry?.value || ''}
                            onChange={e => handleValueChange(test, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">{testInfo.unit || '-'}</div>
                        <div className="col-span-2 text-xs text-muted-foreground">{testInfo.referenceRange || '-'}</div>
                        <div className="col-span-1 flex justify-end">
                          {entry?.value && (
                            <Badge variant="outline" className={cn('text-xs', flagStyles[entry.flag])}>
                              {entry.flag === 'normal' ? '✓' : entry.flag === 'critical_high' || entry.flag === 'critical_low' ? '!!' : entry.flag === 'high' ? '↑' : '↓'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      {/* Column header */}
                      <div className="grid grid-cols-12 gap-3 px-3 pb-1 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-4">Test</div>
                        <div className="col-span-3">Result</div>
                        <div className="col-span-2">Unit</div>
                        <div className="col-span-2">Reference</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Panel groups */}
                      {Array.from(panelMap.entries()).map(([pc, group]) => (
                        <div key={pc} className="rounded-lg border overflow-hidden">
                          <div className="bg-primary/8 px-3 py-2 border-b">
                            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{group.panelName}</p>
                          </div>
                          {group.tests.map(renderTestRow)}
                        </div>
                      ))}

                      {/* Standalone tests */}
                      {standaloneTests.length > 0 && (
                        <div className="rounded-lg border overflow-hidden">
                          {panelMap.size > 0 && (
                            <div className="bg-muted/50 px-3 py-2 border-b">
                              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Individual Tests</p>
                            </div>
                          )}
                          {standaloneTests.map(renderTestRow)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitResults} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Check className="w-4 h-4 mr-2" />
                    Submit Results
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-lg">Select an order</p>
                <p className="text-sm">Choose an order from the list to enter results</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Value Warning Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-status-critical">
              <AlertTriangle className="w-5 h-5" />
              Critical Values Detected
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-4">The following results are outside critical limits:</p>
            <div className="space-y-2">
              {Object.values(resultEntries)
                .filter(e => e.flag === 'critical_high' || e.flag === 'critical_low')
                .map(entry => (
                  <div key={entry.orderTestId} className="flex items-center justify-between p-3 bg-status-critical/10 rounded-lg">
                    <span className="font-medium">{entry.testCode}</span>
                    <span className="font-bold">{entry.value} {entry.unit}</span>
                    <Badge variant="outline" className="bg-status-critical/10 text-status-critical">
                      {entry.flag.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Please ensure the physician is notified immediately about these critical values.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Review Results
            </Button>
            <Button variant="destructive" onClick={submitResults} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
