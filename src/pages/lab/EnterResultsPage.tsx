import { useEffect, useRef, useState, useMemo } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useProcessingOrders, useUpdateOrder } from '@/hooks/useOrders';
import { useCreateResult, useCreateBulkResults } from '@/hooks/useResults';
import { useAllTests } from '@/hooks/useTestCatalog';
import { useWebSocket } from '@/context/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Check, AlertTriangle, Loader2, Search, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/hooks/useOrders';
import { getPatientName, getOrderNumber } from '@/utils/orderHelpers';
import { SendToAnalyzerDialog } from '@/components/machines/SendToAnalyzerDialog';

type ResultFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high' | 'no_range';

const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

// Standard options for qualitative/semi-quantitative tests
const QUALITATIVE_OPTIONS: Record<string, string[]> = {
  // ── Urinalysis physical ─────────────────────────────────────────────────
  'URINE-COLOR': ['Yellow', 'Pale Yellow', 'Straw', 'Amber', 'Dark Yellow', 'Orange', 'Brown', 'Red', 'Colorless'],
  'URINE-CLARITY': ['Clear', 'Slightly Turbid', 'Turbid', 'Very Turbid', 'Hazy'],
  // ── Urinalysis chemical ─────────────────────────────────────────────────
  'URINE-PROTEIN': ['Negative', 'Trace', '+1', '+2', '+3', '+4'],
  'URINE-GLUCOSE': ['Negative', 'Trace', '+1', '+2', '+3', '+4'],
  'URINE-KETONES': ['Negative', 'Trace', '+1', '+2', '+3'],
  'URINE-BLOOD': ['Negative', 'Trace', '+1', '+2', '+3'],
  'URINE-BILI': ['Negative', '+1', '+2', '+3'],
  'URINE-URO': ['Normal (0.1–1.0 mg/dL)', '2 mg/dL', '4 mg/dL', '8 mg/dL'],
  'URINE-NITRITE': ['Negative', 'Positive'],
  'URINE-LE': ['Negative', 'Trace', '+1', '+2', '+3'],
  // ── Urinalysis microscopy ───────────────────────────────────────────────
  'URINE-BACTERIA': ['None', '+1 (Rare)', '+2 (Few)', '+3 (Moderate)', '+4 (Many)'],
  'URINE-EPI': ['None', 'Rare', 'Few', 'Moderate', 'Many'],
  'URINE-CASTS': ['None Seen', 'Rare', '0–1/LPF', '1–2/LPF', '2–5/LPF', '>5/LPF'],
  'URINE-CRYSTALS': ['None', 'Rare', 'Few', 'Moderate', 'Many'],
  // ── Rapid tests (Positive / Negative) ──────────────────────────────────
  'MALARIA': ['Negative', 'Positive (P. falciparum)', 'Positive (P. vivax)', 'Positive (Mixed)'],
  'HIV': ['Non-Reactive', 'Reactive'],
  'HBSAG': ['Non-Reactive', 'Reactive'],
  'HCV': ['Non-Reactive', 'Reactive'],
  'HIVP24': ['Non-Reactive', 'Reactive'],
  'HPYLORI': ['Negative', 'Positive'],
  'HPYLORI_IA': ['Negative', 'Positive'],
  'IFOB': ['Negative', 'Positive'],
  'GONORRHEA': ['Negative', 'Positive'],
  'CHLAMYDIA': ['Negative', 'Positive'],
  'HSV': ['Non-Reactive', 'Reactive (HSV-1)', 'Reactive (HSV-2)', 'Reactive (HSV-1 & 2)'],
  'PREGNANCY': ['Negative', 'Positive'],
  // ── Serology (titered) ──────────────────────────────────────────────────
  'VDRL': ['Non-Reactive', 'Weakly Reactive', 'Reactive (1:1)', 'Reactive (1:2)', 'Reactive (1:4)', 'Reactive (1:8)', 'Reactive (1:16)', 'Reactive (1:32)'],
  // ── Hematology special ──────────────────────────────────────────────────
  'BLOODGROUP': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'SICKLE': ['AA – Normal', 'AS – Sickle Cell Trait', 'SS – Sickle Cell Disease', 'SC – Sickle-Haemoglobin C'],
};

// Tests that need a free-text area (complex/descriptive results)
const TEXTAREA_TESTS = new Set(['STOOLMICRO']);

interface ResultEntry {
  testId: string;
  orderTestId: string;
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: ResultFlag;
  panelCode?: string;
  panelName?: string;
  category?: string;
}

export default function EnterResultsPage() {
  const { profile, user, primaryRole } = useAuth();
  const { data: processingOrders, isLoading } = useProcessingOrders();
  const { data: testCatalog } = useAllTests(); // Use ALL tests, not just active ones
  const { socket } = useWebSocket();
  const updateOrder = useUpdateOrder();
  const createResult = useCreateResult();
  const createBulkResults = useCreateBulkResults();

  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [resultEntries, setResultEntries] = useState<Record<string, ResultEntry>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSendToAnalyzer, setShowSendToAnalyzer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  // Track which entries were synced live from another user (testKey → time string)
  const [liveUpdates, setLiveUpdates] = useState<Record<string, string>>({});

  const getDraftStorageKey = (orderId?: string) => `result-draft:${orderId || 'unknown'}`;

  // Memoize the selected order ID to prevent infinite loops
  const selectedOrderId = useMemo(() => {
    if (!selectedOrder) return null;
    return selectedOrder.id || (selectedOrder as any)._id;
  }, [selectedOrder?.id, (selectedOrder as any)?._id]);

  // Memoize the order tests to prevent infinite loops
  const selectedOrderTests = useMemo(() => {
    if (!selectedOrder) return [];
    return (selectedOrder as any).tests || (selectedOrder as any).order_tests || [];
  }, [selectedOrder?.id, (selectedOrder as any)?._id]);

  const totalTests = selectedOrderTests.length;
  const completedTests = selectedOrderTests.filter((test: any) => {
    const testKey = test.id || test._id || test.testCode || test.test_code;
    return Boolean(resultEntries[testKey]?.value?.toString().trim());
  }).length;
  const progressPercent = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

  useEffect(() => {
    if (!selectedOrder) {
      setResultEntries({});
      return;
    }

    const orderId = selectedOrder.id || (selectedOrder as any)._id;
    if (!orderId) {
      setResultEntries({});
      return;
    }

    try {
      const savedDraft = localStorage.getItem(getDraftStorageKey(orderId));
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        setResultEntries(parsedDraft || {});
      } else {
        setResultEntries({});
      }
    } catch {
      setResultEntries({});
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) return;

    const orderId = selectedOrder.id || (selectedOrder as any)._id;
    if (!orderId) return;

    const timeout = setTimeout(() => {
      try {
        const hasValues = Object.values(resultEntries).some((entry) => entry?.value?.toString().trim());
        const storageKey = getDraftStorageKey(orderId);
        if (hasValues) {
          localStorage.setItem(storageKey, JSON.stringify(resultEntries));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        // Ignore storage errors
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [selectedOrder, resultEntries]);

  // Clear live-update indicators when the selected order changes
  useEffect(() => {
    setLiveUpdates({});
  }, [selectedOrderId]);

  // Real-time collaboration: listen for results saved by other users
  useEffect(() => {
    if (!socket || !selectedOrderId) return;

    const handleResultCreated = (result: any) => {
      // Only react if it belongs to the currently selected order
      if (result.orderId !== selectedOrderId) return;

      // Find the matching orderTest entry
      const matchingTest = selectedOrderTests.find(
        (t: any) => (t.testCode || t.test_code) === result.testCode,
      );
      if (!matchingTest) return;

      const testKey = matchingTest.id || matchingTest._id || result.testCode;
      const enteredBy: string = result.enteredBy || 'another user';

      setResultEntries(prev => ({
        ...prev,
        [testKey]: {
          testId: testKey,
          orderTestId: testKey,
          testCode: result.testCode,
          testName: result.testName || result.test_name || result.testCode,
          value: result.value,
          unit: result.unit || prev[testKey]?.unit || '',
          referenceRange:
            result.referenceRange || result.reference_range || prev[testKey]?.referenceRange || '',
          flag: result.flag || 'normal',
        },
      }));

      setLiveUpdates(prev => ({
        ...prev,
        [testKey]: new Date().toLocaleTimeString(),
      }));

      toast.info(`${result.testCode} updated${enteredBy !== 'another user' ? ` by ${enteredBy}` : ''}: ${result.value}`);
    };

    socket.on('result:created', handleResultCreated);
    return () => {
      socket.off('result:created', handleResultCreated);
    };
  }, [socket, selectedOrderId, selectedOrderTests]);

  // Get reference info from test catalog
  const getTestInfo = (testCode: string, patientAge?: number, patientGender?: string) => {
    const test = testCatalog?.find((t: any) => t.code === testCode);
    if (!test) {
      return { unit: '', referenceRange: '', criticalLow: '', criticalHigh: '' };
    }

    let referenceRange = test.referenceRange || '';
    let matchedAgeGroup = '';
    let criticalLow = '';
    let criticalHigh = '';

    if (test.referenceRanges && test.referenceRanges.length > 0) {
      let matchedRange: any;

      if (patientAge !== undefined) {
        matchedRange = test.referenceRanges.find((r: any) => {
          const ageMatch =
            (r.ageMin === undefined || patientAge >= r.ageMin) &&
            (r.ageMax === undefined || patientAge <= r.ageMax);
          const genderMatch = !r.gender || r.gender === 'all' || r.gender === patientGender;
          return ageMatch && genderMatch;
        });

        if (!matchedRange) {
          matchedRange = test.referenceRanges.find((r: any) => {
            return (
              (r.ageMin === undefined || patientAge >= r.ageMin) &&
              (r.ageMax === undefined || patientAge <= r.ageMax)
            );
          });
        }
      }

      if (!matchedRange && !referenceRange) {
        matchedRange = test.referenceRanges[0];
      }

      if (matchedRange) {
        referenceRange = `${matchedRange.range} ${matchedRange.unit || test.unit || ''}`.trim();
        matchedAgeGroup = matchedRange.ageGroup || '';
        criticalLow = matchedRange.criticalLow || '';
        criticalHigh = matchedRange.criticalHigh || '';
      }
    }

    return {
      unit: test.unit || '',
      referenceRange,
      ageGroup: matchedAgeGroup,
      criticalLow,
      criticalHigh,
    };
  };

  const calculateFlag = (value: string, rangeStr: string, critLow?: string, critHigh?: string): ResultFlag => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'normal';
    if (!rangeStr) return 'no_range';

    const match = rangeStr.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (!match) return 'no_range';

    const low = parseFloat(match[1]);
    const high = parseFloat(match[2]);

    const cLow = critLow ? parseFloat(critLow) : low * 0.5;
    const cHigh = critHigh ? parseFloat(critHigh) : high * 1.5;

    if (!isNaN(cLow) && numValue < cLow) return 'critical_low';
    if (!isNaN(cHigh) && numValue > cHigh) return 'critical_high';
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
    const flag = calculateFlag(value, testInfo.referenceRange, testInfo.criticalLow, testInfo.criticalHigh);
    const entryKey = orderTest.id || orderTest._id || testCode;

    setResultEntries(prev => ({
      ...prev,
      [entryKey]: {
        testId: orderTest.testId || orderTest.test_id || entryKey,
        orderTestId: entryKey,
        testCode,
        testName: orderTest.testName || orderTest.test_name || testCode,
        panelCode: orderTest.panelCode || orderTest.panel_code,
        panelName: orderTest.panelName || orderTest.panel_name,
        category: orderTest.category,
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

      // Get valid MongoDB ObjectId for orderId
      const orderId = (selectedOrder as any)._id || selectedOrder.id;

      // Validate orderId is a valid MongoDB ObjectId
      if (!orderId || !MONGO_OBJECT_ID_REGEX.test(orderId)) {
        toast.error('Invalid order ID format');
        setIsSubmitting(false);
        return;
      }

      // Prepare all results for bulk insert
      const resultsToCreate = entries.map(entry => {
        const payload: any = {
          orderId: orderId,
          testCode: entry.testCode,
          testName: entry.testName,
          value: entry.value,
          unit: entry.unit || undefined,
          referenceRange: entry.referenceRange || undefined,
          flag: entry.flag,
          panelCode: entry.panelCode || undefined,
          panelName: entry.panelName || undefined,
          category: entry.category || undefined,
        };

        if (entry.orderTestId && MONGO_OBJECT_ID_REGEX.test(entry.orderTestId)) {
          payload.orderTestId = entry.orderTestId;
        }

        return payload;
      });

      // Create all results in one bulk operation (much faster!)
      await createBulkResults.mutateAsync(resultsToCreate);

      // Update order status if all tests have results
      const orderTests = (selectedOrder as any).tests || (selectedOrder as any).order_tests || [];
      if (entries.length >= orderTests.length) {
        await updateOrder.mutateAsync({
          id: orderId,
          updates: { status: 'completed' },
        });
      } else {
        await updateOrder.mutateAsync({
          id: orderId,
          updates: { status: 'processing' },
        });
      }

      toast.success('Results submitted successfully');
      localStorage.removeItem(getDraftStorageKey(orderId));
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
    no_range: 'bg-muted text-muted-foreground',
  };

  // Filter the order list by the search term
  const filteredOrders = (processingOrders || []).filter(order => {
    if (!orderSearch.trim()) return true;
    const term = orderSearch.trim().toLowerCase();
    const name = getPatientName(order).toLowerCase();
    const num = getOrderNumber(order).toLowerCase();
    return name.includes(term) || num.includes(term);
  });

  return (
    <RoleLayout
      title="Enter Results"
      subtitle="Input test results — changes are synced to all users in real time"
      role={primaryRole === 'receptionist' ? 'receptionist' : primaryRole === 'admin' ? 'admin' : 'lab_tech'}
      userName={profile?.full_name}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-lg">
            <div className="px-4 py-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Active Orders</h3>
                <div className="flex items-center gap-1.5 text-xs text-status-normal">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Live</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{filteredOrders.length} awaiting results</p>
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Search by name or order #…"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredOrders.map(order => (
                  <button
                    key={order.id}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                      selectedOrder?.id === order.id && 'bg-primary/5 border-l-4 border-primary'
                    )}
                    onClick={() => {
                      setSelectedOrder(order);
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
                    {(() => {
                      const codes = ((order as any).tests || (order as any).order_tests || [])
                        .map((t: any) => t.testCode || t.test_code || '')
                        .filter(Boolean);
                      const previewCodes = codes.slice(0, 5);
                      const extraCount = Math.max(codes.length - previewCodes.length, 0);

                      return (
                        <p className="text-xs mt-1 text-muted-foreground">
                          {previewCodes.join(', ')}
                          {extraCount > 0 ? ` +${extraCount} more` : ''}
                        </p>
                      );
                    })()}
                  </button>
                ))}
                {(!filteredOrders || filteredOrders.length === 0) && (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">{orderSearch ? 'No orders match' : 'No orders processing'}</p>
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

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{completedTests}/{totalTests} entered ({progressPercent}%) • Autosaved</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
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

                  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, testKey: string) => {
                    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                    e.preventDefault();
                    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[id^="value-"]'));
                    const idx = inputs.findIndex(el => el.id === `value-${testKey}`);
                    if (idx === -1) return;
                    const target = inputs[e.key === 'ArrowDown' ? idx + 1 : idx - 1];
                    if (target) { target.focus(); target.select(); }
                  };

                  const renderTestRow = (test: any) => {
                    const testCode = test.testCode || test.test_code || '';
                    const testName = test.testName || test.test_name || testCode;
                    const testKey = test.id || test._id || testCode;
                    const entry = resultEntries[testKey];
                    const testInfo = getTestInfo(testCode, patientAge, patientGender);

                    const qualitativeOptions = QUALITATIVE_OPTIONS[testCode];
                    const isTextarea = TEXTAREA_TESTS.has(testCode);

                    return (
                      <div key={testKey} className={cn('grid gap-3 items-start py-3 px-3 border-b last:border-b-0', isTextarea ? 'grid-cols-1' : 'grid-cols-12')}>
                        {isTextarea ? (
                          // Full-width layout for descriptive/textarea tests
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <p className="font-medium text-sm">{testCode}</p>
                              <p className="text-xs text-muted-foreground">{testName}</p>
                            </div>
                            <textarea
                              placeholder="Enter findings..."
                              value={entry?.value || ''}
                              onChange={e => handleValueChange(test, e.target.value)}
                              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="col-span-4">
                              <p className="font-medium text-sm">{testCode}</p>
                              <p className="text-xs text-muted-foreground">{testName}</p>
                            </div>
                            <div className="col-span-3">
                              {qualitativeOptions && qualitativeOptions.length > 0 ? (
                                <Select
                                  value={entry?.value || ''}
                                  onValueChange={val => handleValueChange(test, val)}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {qualitativeOptions.map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  id={`value-${testKey}`}
                                  placeholder="Value"
                                  value={entry?.value || ''}
                                  onChange={e => handleValueChange(test, e.target.value)}
                                  onKeyDown={e => handleKeyDown(e, testKey)}
                                  className="h-8 text-sm"
                                />
                              )}
                            </div>
                            <div className="col-span-2 text-xs text-muted-foreground">{testInfo.unit || '-'}</div>
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">{testInfo.referenceRange || '-'}</p>
                              {testInfo.ageGroup && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{testInfo.ageGroup}</p>}
                            </div>
                            <div className="col-span-1 flex flex-col items-end gap-1">
                              {entry?.value && (
                                <Badge variant="outline" className={cn('text-xs', flagStyles[entry.flag])}>
                                  {entry.flag === 'normal' ? '✓' : entry.flag === 'critical_high' || entry.flag === 'critical_low' ? '!!' : entry.flag === 'high' ? '↑' : entry.flag === 'low' ? '↓' : '—'}
                                </Badge>
                              )}
                              {liveUpdates[testKey] && (
                                <span className="text-[9px] text-primary/70 flex items-center gap-0.5" title={`Synced at ${liveUpdates[testKey]}`}>
                                  <Radio className="w-2.5 h-2.5" />
                                  live
                                </span>
                              )}
                            </div>
                          </>
                        )}
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

                      <Accordion type="multiple" className="w-full space-y-3">
                        {/* Panel groups */}
                        {Array.from(panelMap.entries()).map(([pc, group]) => (
                          <AccordionItem key={pc} value={`panel-${pc}`} className="rounded-lg border overflow-hidden">
                            <AccordionTrigger className="px-3 py-2 hover:no-underline">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold uppercase tracking-wide text-primary text-left">{group.panelName}</p>
                                <Badge variant="outline" className="text-[10px]">{group.tests.length}</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0">
                              <div className="border-t">
                                {group.tests.map(renderTestRow)}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}

                        {/* Standalone tests */}
                        {standaloneTests.length > 0 && (
                          <AccordionItem value="standalone-tests" className="rounded-lg border overflow-hidden">
                            <AccordionTrigger className="px-3 py-2 hover:no-underline">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Individual Tests</p>
                                <Badge variant="outline" className="text-[10px]">{standaloneTests.length}</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0">
                              <div className="border-t">
                                {standaloneTests.map(renderTestRow)}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
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
            <DialogDescription>
              Review critical results and confirm submission.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-4">The following results are outside critical limits:</p>
            <div className="space-y-2">
              {Object.values(resultEntries)
                .filter(e => e.flag === 'critical_high' || e.flag === 'critical_low')
                .map(entry => (
                  <div key={entry.orderTestId} className="flex items-center justify-between p-3 bg-status-critical/10 rounded-lg">
                    <span className="font-medium">{entry.testCode}</span>
                    <div className="text-center">
                      <span className="font-bold">{entry.value} {entry.unit}</span>
                      <p className="text-xs text-muted-foreground">{entry.referenceRange || 'No range'}</p>
                    </div>
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
