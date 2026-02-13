import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useProcessingOrders } from '@/hooks/useOrders';
import { useCreateResult } from '@/hooks/useResults';
import { useTestCatalog } from '@/hooks/useTestCatalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/hooks/useOrders';

export default function EnterManualResults() {
  const { profile, user } = useAuth();
  const { data: processingOrders, isLoading } = useProcessingOrders();
  const createResult = useCreateResult();
  const { data: testCatalog } = useTestCatalog();

  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [results, setResults] = useState<Record<string, {
    value: string;
    unit: string;
    flag: 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high';
    comments: string;
  }>>({});

  const handleResultChange = (testId: string, field: string, value: string) => {
    setResults(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value
      }
    }));
  };

  const calculateFlag = (value: number, refRange: string): 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high' => {
    if (!refRange) return 'normal';
    
    const match = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (!match) return 'normal';
    
    const [, min, max] = match;
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    
    if (value < minVal * 0.5) return 'critical_low';
    if (value < minVal) return 'low';
    if (value > maxVal * 1.5) return 'critical_high';
    if (value > maxVal) return 'high';
    return 'normal';
  };

  const handleSaveResults = async () => {
    if (!selectedOrder) return;

    const resultsToSave = selectedOrder.order_tests
      .filter(test => results[test.id]?.value)
      .map(test => {
        const testInfo = testCatalog?.find(t => t.id === test.test_id);
        const value = parseFloat(results[test.id].value);
        const flag = !isNaN(value) && testInfo?.reference_range
          ? calculateFlag(value, testInfo.reference_range)
          : results[test.id].flag || 'normal';

        return {
          order_id: selectedOrder.id,
          order_test_id: test.id,
          test_code: test.test_code,
          test_name: test.test_name,
          value: results[test.id].value,
          unit: results[test.id].unit || testInfo?.unit || '',
          reference_range: testInfo?.reference_range || '',
          flag,
          status: 'preliminary' as const,
          comments: results[test.id].comments || null,
          resulted_by: user?.id || null,
          resulted_at: new Date().toISOString()
        };
      });

    if (resultsToSave.length === 0) {
      toast.error('Please enter at least one result');
      return;
    }

    try {
      for (const result of resultsToSave) {
        await createResult.mutateAsync(result);
      }
      
      toast.success(`${resultsToSave.length} result(s) saved successfully`);
      setResults({});
      setSelectedOrder(null);
    } catch (error) {
      toast.error('Failed to save results');
    }
  };

  const hasCriticalResults = selectedOrder?.order_tests.some(test => {
    const flag = results[test.id]?.flag;
    return flag === 'critical_low' || flag === 'critical_high';
  });

  return (
    <RoleLayout 
      title="Enter Manual Results" 
      subtitle="Manual result entry for tests"
      role="lab-tech"
      userName={profile?.full_name}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-lg">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold">Processing Orders</h3>
              <p className="text-sm text-muted-foreground">{processingOrders?.length || 0} orders</p>
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
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold">{order.patients.first_name} {order.patients.last_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {order.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.order_tests.length} test(s)
                    </p>
                  </button>
                ))}
                {(!processingOrders || processingOrders.length === 0) && (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <p>No orders in processing</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result Entry Form */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="bg-card border rounded-lg p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedOrder.patients.first_name} {selectedOrder.patients.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedOrder.order_number}</p>
                  </div>
                  {hasCriticalResults && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Critical Results
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {selectedOrder.order_tests.map(test => {
                  const testInfo = testCatalog?.find(t => t.id === test.test_id);
                  const resultData = results[test.id] || { value: '', unit: testInfo?.unit || '', flag: 'normal', comments: '' };
                  const isCritical = resultData.flag === 'critical_low' || resultData.flag === 'critical_high';

                  return (
                    <div 
                      key={test.id} 
                      className={cn(
                        'p-4 border rounded-lg',
                        isCritical && 'border-status-critical bg-status-critical/5'
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{test.test_code}</h4>
                          <p className="text-sm text-muted-foreground">{test.test_name}</p>
                        </div>
                        {testInfo?.reference_range && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Reference Range</p>
                            <p className="text-sm font-medium">{testInfo.reference_range} {testInfo.unit}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`value-${test.id}`}>Value *</Label>
                          <Input
                            id={`value-${test.id}`}
                            type="text"
                            placeholder="Enter value"
                            value={resultData.value}
                            onChange={(e) => {
                              handleResultChange(test.id, 'value', e.target.value);
                              // Auto-calculate flag if numeric
                              const numValue = parseFloat(e.target.value);
                              if (!isNaN(numValue) && testInfo?.reference_range) {
                                const flag = calculateFlag(numValue, testInfo.reference_range);
                                handleResultChange(test.id, 'flag', flag);
                              }
                            }}
                            className={cn(isCritical && 'border-status-critical')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`unit-${test.id}`}>Unit</Label>
                          <Input
                            id={`unit-${test.id}`}
                            placeholder="Unit"
                            value={resultData.unit}
                            onChange={(e) => handleResultChange(test.id, 'unit', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`flag-${test.id}`}>Flag</Label>
                          <Select 
                            value={resultData.flag}
                            onValueChange={(value) => handleResultChange(test.id, 'flag', value)}
                          >
                            <SelectTrigger id={`flag-${test.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical_low">Critical Low</SelectItem>
                              <SelectItem value="critical_high">Critical High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <Label htmlFor={`comments-${test.id}`}>Comments</Label>
                        <Textarea
                          id={`comments-${test.id}`}
                          placeholder="Add any comments or notes..."
                          value={resultData.comments}
                          onChange={(e) => handleResultChange(test.id, 'comments', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedOrder(null);
                    setResults({});
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveResults}
                  disabled={createResult.isPending}
                >
                  {createResult.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Save Results
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
              <p>Select an order to enter results</p>
            </div>
          )}
        </div>
      </div>
    </RoleLayout>
  );
}
