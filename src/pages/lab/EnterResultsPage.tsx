import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useProcessingOrders, useUpdateOrder } from '@/hooks/useOrders';
import { useCreateResult } from '@/hooks/useResults';
import { useTestCatalog } from '@/hooks/useTestCatalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/hooks/useOrders';
import type { Database } from '@/integrations/supabase/types';

type ResultFlag = Database['public']['Enums']['result_flag'];

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
  const { data: testCatalog } = useTestCatalog();
  const updateOrder = useUpdateOrder();
  const createResult = useCreateResult();

  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [resultEntries, setResultEntries] = useState<Record<string, ResultEntry>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get reference info from test catalog
  const getTestInfo = (testCode: string) => {
    const test = testCatalog?.find(t => t.code === testCode);
    return {
      unit: test?.unit || '',
      referenceRange: test?.reference_range || '',
    };
  };

  const calculateFlag = (value: string, testCode: string): ResultFlag => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';

    const test = testCatalog?.find(t => t.code === testCode);
    if (!test?.reference_range) return 'normal';

    // Parse reference range like "70-100" or "4.5-11.0"
    const match = test.reference_range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
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

  const handleValueChange = (orderTest: OrderWithDetails['order_tests'][0], value: string) => {
    const testInfo = getTestInfo(orderTest.test_code);
    const flag = calculateFlag(value, orderTest.test_code);

    setResultEntries(prev => ({
      ...prev,
      [orderTest.id]: {
        testId: orderTest.test_id,
        orderTestId: orderTest.id,
        testCode: orderTest.test_code,
        testName: orderTest.test_name,
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
          order_id: selectedOrder.id,
          order_test_id: entry.orderTestId,
          test_code: entry.testCode,
          test_name: entry.testName,
          value: entry.value,
          unit: entry.unit || null,
          reference_range: entry.referenceRange || null,
          flag: entry.flag,
          resulted_by: user?.id || null,
          status: 'preliminary',
        });
      }

      // Update order status if all tests have results
      if (entries.length >= selectedOrder.order_tests.length) {
        await updateOrder.mutateAsync({
          id: selectedOrder.id,
          updates: {
            status: 'completed',
            completed_at: new Date().toISOString(),
          },
        });
      } else {
        await updateOrder.mutateAsync({
          id: selectedOrder.id,
          updates: {
            status: 'processing',
          },
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
      role="lab-tech"
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
                      <p className="font-medium">{order.patients.first_name} {order.patients.last_name}</p>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        order.priority === 'stat' ? 'bg-status-critical/10 text-status-critical' :
                        order.priority === 'urgent' ? 'bg-status-warning/10 text-status-warning' :
                        'bg-muted'
                      )}>
                        {order.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.order_number}</p>
                    <p className="text-xs mt-1">{order.order_tests.map(t => t.test_code).join(', ')}</p>
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
                        {selectedOrder.patients.first_name} {selectedOrder.patients.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedOrder.order_number}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      selectedOrder.priority === 'stat' ? 'bg-status-critical/10 text-status-critical' :
                      selectedOrder.priority === 'urgent' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {selectedOrder.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedOrder.order_tests.map(test => {
                    const entry = resultEntries[test.id];
                    const testInfo = getTestInfo(test.test_code);
                    
                    return (
                      <div key={test.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-muted/30 rounded-lg">
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground">Test</Label>
                          <p className="font-medium">{test.test_code}</p>
                          <p className="text-xs text-muted-foreground">{test.test_name}</p>
                        </div>
                        <div className="col-span-3">
                          <Label htmlFor={`value-${test.id}`}>Result</Label>
                          <Input
                            id={`value-${test.id}`}
                            type="number"
                            step="0.01"
                            placeholder="Enter value"
                            value={entry?.value || ''}
                            onChange={e => handleValueChange(test, e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">Unit</Label>
                          <p className="font-medium text-sm py-2">{testInfo.unit || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">Reference</Label>
                          <p className="font-medium text-sm py-2">{testInfo.referenceRange || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          {entry?.value && (
                            <Badge variant="outline" className={cn(flagStyles[entry.flag])}>
                              {entry.flag === 'normal' ? 'Normal' : entry.flag.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

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
