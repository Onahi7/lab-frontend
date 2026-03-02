import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useSearchPatients } from '@/hooks/usePatients';
import { useCreateOrder } from '@/hooks/useOrders';
import { useActiveTests } from '@/hooks/useTestCatalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, X, CreditCard, Banknote, Smartphone, Check, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestCatalogItem } from '@/types/lis';
import { getPatientFullName } from '@/utils/orderHelpers';

export default function NewOrder() {
  const { profile } = useAuth();
  const { data: patients } = useSearchPatients('');
  const { data: testsFromDB, isLoading: testsLoading } = useActiveTests();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedPatientId = searchParams.get('patient') || '';

  const [selectedPatientId, setSelectedPatientId] = useState<string>(preselectedPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedTests, setSelectedTests] = useState<TestCatalogItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'orange_money' | 'afrimoney' | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [orderComplete, setOrderComplete] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  const normalizeId = (value: unknown): string => {
    if (!value) return '';
    return String(value);
  };

  const getTestId = (test: any): string => normalizeId(test?._id || test?.id);

  const getPanelComponentTestIds = (panel: any): Set<string> => {
    if (!panel?.tests || !Array.isArray(panel.tests)) return new Set<string>();

    return new Set(
      panel.tests
        .map((componentTest: any) =>
          normalizeId(componentTest?.testId || componentTest?._id || componentTest?.id)
        )
        .filter(Boolean)
    );
  };

  const getSelectedPanelComponentIds = (tests: TestCatalogItem[]): Set<string> => {
    const ids = new Set<string>();

    tests
      .filter((test: any) => test?.isPanel)
      .forEach((panel: any) => {
        getPanelComponentTestIds(panel).forEach((id) => ids.add(id));
      });

    return ids;
  };

  // Use database tests or empty array while loading
  const testCatalog = testsFromDB || [];
  
  // Extract unique categories from database tests
  const testCategories = useMemo(() => {
    if (!testsFromDB) return [];
    const categories = new Set(testsFromDB.map((t: any) => t.category));
    return Array.from(categories).map(cat => ({
      id: String(cat),
      name: String(cat).charAt(0).toUpperCase() + String(cat).slice(1),
    }));
  }, [testsFromDB]);

  // Use the preselected patient ID if available and patient data is loaded
  const effectivePatientId = normalizeId(selectedPatientId || preselectedPatientId);
  const selectedPatient = patients && Array.isArray(patients) ? 
    patients.find(p => normalizeId(p._id || p.id) === effectivePatientId) : null;

  const filteredPatients = patients && Array.isArray(patients) ? 
    patients.filter(p => {
      const search = patientSearch.toLowerCase();
      return (
        p.firstName.toLowerCase().includes(search) ||
        p.lastName.toLowerCase().includes(search) ||
        p.patientId.toLowerCase().includes(search) ||
        p.phone?.includes(search)
      );
    }) : [];

  const recentPatients = useMemo(() => {
    if (!Array.isArray(patients)) return [];

    const getPatientTimestamp = (patient: any) => {
      const timestampValue = patient?.createdAt || patient?.registeredAt || patient?.updatedAt;
      if (!timestampValue) return 0;
      const parsed = new Date(timestampValue).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return [...patients]
      .sort((a: any, b: any) => getPatientTimestamp(b) - getPatientTimestamp(a))
      .slice(0, 6);
  }, [patients]);

  const formatPatientTimestamp = (patient: any) => {
    const timestampValue = patient?.createdAt || patient?.registeredAt || patient?.updatedAt;
    if (!timestampValue) return 'Time unavailable';

    const date = new Date(timestampValue);
    if (Number.isNaN(date.getTime())) return 'Time unavailable';

    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTests = useMemo(() => {
    const visibleTests = categoryFilter === 'all'
      ? [...testCatalog]
      : testCatalog.filter(t => t.category === categoryFilter);

    return visibleTests.sort((a, b) => {
      const categoryCompare = String(a.category).localeCompare(String(b.category));
      if (categoryCompare !== 0) return categoryCompare;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [categoryFilter, testCatalog]);

  const subtotal = selectedTests.reduce((sum, t) => sum + t.price, 0);
  const discount = discountType === 'percentage' 
    ? (subtotal * (parseFloat(discountValue) || 0) / 100)
    : (parseFloat(discountValue) || 0);
  const total = Math.max(0, subtotal - discount);

  const handleTestToggle = (test: any) => {
    const testId = test._id || test.id;
    setSelectedTests(prev => {
      const exists = prev.find(t => {
        const existingId = t._id || t.id;
        return existingId === testId;
      });

      if (exists) {
        return prev.filter(t => {
          const existingId = t._id || t.id;
          return existingId !== testId;
        });
      }

      if (test.isPanel) {
        const panelComponentIds = getPanelComponentTestIds(test);
        const withoutConflictingIndividualTests = prev.filter((selected) => {
          if ((selected as any).isPanel) return true;
          const selectedId = getTestId(selected);
          return !panelComponentIds.has(selectedId);
        });

        return [...withoutConflictingIndividualTests, test];
      }

      const selectedPanelComponentIds = getSelectedPanelComponentIds(prev);
      const normalizedTestId = normalizeId(testId);
      if (selectedPanelComponentIds.has(normalizedTestId)) {
        toast.error('This test is already included in a selected panel');
        return prev;
      }

      return [...prev, test];
    });
  };

  const handleProceedToPayment = () => {
    if (!effectivePatientId || !selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }
    
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) {
      toast.error('Please select a payment method');
      return;
    }

    const patient = patients && Array.isArray(patients) ? 
      patients.find(p => (p._id || p.id) === effectivePatientId) : null;
    if (!patient) {
      toast.error('Patient not found');
      return;
    }
    
    // Expand panels into their component tests
    const orderTests: any[] = [];
    for (const test of selectedTests) {
      if (test.isPanel && test.tests && Array.isArray(test.tests)) {
        // This is a panel - add all component tests
        for (let index = 0; index < test.tests.length; index++) {
          const componentTest = test.tests[index];
          orderTests.push({
            testId: componentTest.testId || componentTest._id,
            testCode: componentTest.testCode,
            testName: componentTest.testName,
            panelCode: test.code,
            panelName: test.name,
            price: index === 0 ? test.price : 0,
          });
        }
      } else {
        // Regular test
        orderTests.push({
          testId: test._id || test.id,
          testCode: test.code,
          testName: test.name,
          price: test.price,
        });
      }
    }

    const deduplicatedOrderTests = new Map<string, any>();
    for (const orderTest of orderTests) {
      const key = normalizeId(orderTest.testCode || orderTest.testId);
      const existing = deduplicatedOrderTests.get(key);

      if (!existing || Number(orderTest.price || 0) > Number(existing.price || 0)) {
        deduplicatedOrderTests.set(key, orderTest);
      }
    }

    const normalizedOrderTests = Array.from(deduplicatedOrderTests.values());

    try {
      const paymentAmount = parseFloat(paymentAmountInput);
      const initialPaymentAmount = (paymentAmount > 0 && paymentAmount <= total) ? paymentAmount : total;
      const newOrder = await createOrder.mutateAsync({
        patientId: patient._id || patient.id,
        priority,
        tests: normalizedOrderTests,
        discount: discount > 0 ? discount : undefined,
        discountType: discount > 0 ? discountType : undefined,
        paymentMethod: selectedPayment,
        initialPaymentAmount,
        notes: undefined,
      });

      setCreatedOrder(newOrder);
      setShowPaymentModal(false);
      setOrderComplete(true);
      toast.success(`Order created successfully`);
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error('Failed to create order. Please try again.');
    }
  };

  if (orderComplete && createdOrder) {
    const handlePrint = () => {
      window.print();
    };

    return (
      <RoleLayout 
        title="Order Created" 
        subtitle="Order has been submitted"
        role="receptionist"
        userName={profile?.full_name}
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border rounded-xl p-8" id="receipt-content">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-status-normal/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-status-normal" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Order Complete!</h2>
              <p className="text-muted-foreground">
                Payment received. Sample collection can proceed.
              </p>
            </div>
            
            {/* Receipt Details */}
            <div className="bg-muted rounded-lg p-6 mb-6">
              <div className="text-center mb-4 pb-4 border-b">
                <h3 className="font-bold text-lg">LabConnect LIS</h3>
                <p className="text-sm text-muted-foreground">Laboratory Information System</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date().toLocaleString()}
                </p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number:</span>
                  <span className="font-mono font-bold">{createdOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sample ID:</span>
                  <span className="font-mono font-bold">{createdOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-medium">{getPatientFullName(selectedPatient)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient ID:</span>
                  <span className="font-mono">{selectedPatient?.patientId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age/Gender:</span>
                  <span>{selectedPatient?.age} years / {selectedPatient?.gender === 'M' ? 'Male' : 'Female'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="capitalize">{priority}</span>
                </div>
              </div>

              {/* Tests List */}
              <div className="border-t pt-4 mb-4">
                <h4 className="font-semibold mb-3">Tests Ordered:</h4>
                <div className="space-y-2">
                  {selectedTests.map((test, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{test.code}</span>
                        <span className="text-muted-foreground ml-2">- {test.name}</span>
                      </div>
                      <span className="font-medium">Le {test.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>Le {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-status-normal">
                    <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Fixed'}):</span>
                    <span>-Le {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>Le {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Amount Paid:</span>
                  <span>Le {Number(createdOrder.amountPaid ?? total).toLocaleString()}</span>
                </div>
                {Number(createdOrder.balance ?? 0) > 0 && (
                  <div className="flex justify-between text-sm font-medium text-amber-600">
                    <span>Balance (Credit):</span>
                    <span>Le {Number(createdOrder.balance).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Payment Method:</span>
                  <span className="capitalize">{selectedPayment?.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
                <p>Please bring this receipt when collecting your results.</p>
                <p className="mt-1">Write Sample ID on sample tube: <span className="font-mono font-bold">{createdOrder.orderNumber}</span></p>
              </div>
            </div>

            <div className="print:hidden">
              <Button onClick={handlePrint} variant="outline" className="w-full mb-3">
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setOrderComplete(false);
                    setCreatedOrder(null);
                    setSelectedTests([]);
                    setSelectedPatientId('');
                    setDiscountValue('');
                    setSelectedPayment(null);
                  }} 
                  className="flex-1"
                >
                  New Order
                </Button>
                <Button onClick={() => navigate('/reception')} className="flex-1">
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout 
      title="New Test Order" 
      subtitle="Create a new laboratory test order"
      role="receptionist"
      userName={profile?.full_name}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Patient Information</h3>
            
            {selectedPatient ? (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold text-lg">{getPatientFullName(selectedPatient)}</p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.patientId}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'} • 
                    Age: {selectedPatient.age} years
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedPatientId('');
                    if (preselectedPatientId) {
                      navigate('/reception/new-order');
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recent Patients */}
                {!patientSearch && patients && patients.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Recent Patients</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {recentPatients.map((patient: any) => (
                        <button
                          key={patient._id || patient.id}
                          className="p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const patientId = patient._id || patient.id;
                            setSelectedPatientId(patientId);
                            setPatientSearch('');
                          }}
                        >
                          <p className="font-medium text-sm">{getPatientFullName(patient)}</p>
                          <p className="text-xs text-muted-foreground">{patient.patientId}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatPatientTimestamp(patient)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, or phone..."
                    className="pl-10"
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                  />
                </div>
                
                {/* Search Results */}
                {patientSearch && (
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {filteredPatients.slice(0, 10).map(patient => (
                      <button
                        key={patient._id || patient.id}
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          const patientId = patient._id || patient.id;
                          setSelectedPatientId(patientId);
                          setPatientSearch('');
                        }}
                      >
                        <p className="font-medium">{getPatientFullName(patient)}</p>
                        <p className="text-sm text-muted-foreground">{patient.patientId} • {patient.phone || 'No phone'}</p>
                      </button>
                    ))}
                    {filteredPatients.length === 0 && (
                      <div className="px-4 py-6 text-center text-muted-foreground">
                        <p>No patients found</p>
                        <Button variant="link" onClick={() => navigate('/reception/register')}>
                          Register New Patient
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Selection */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Select Tests</h3>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {testCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {testsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading tests...</p>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tests available</p>
                <p className="text-sm">Please contact administrator to add tests</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {filteredTests.map(test => {
                  const testId = test._id || test.id;
                  const isSelected = selectedTests.some(t => (t._id || t.id) === testId);
                  return (
                    <div
                      key={testId}
                      onClick={() => handleTestToggle(test)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} onCheckedChange={() => {}} />
                        <div>
                          <p className="font-medium text-sm">{test.code}</p>
                          <p className="text-xs text-muted-foreground">{test.name}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm">Le {test.price.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Priority</h3>
            <div className="flex gap-3">
              {(['routine', 'urgent', 'stat'] as const).map(p => (
                <Button
                  key={p}
                  variant={priority === p ? 'default' : 'outline'}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'capitalize',
                    priority === p && p === 'urgent' && 'bg-status-warning hover:bg-status-warning/90',
                    priority === p && p === 'stat' && 'bg-status-critical hover:bg-status-critical/90'
                  )}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-lg p-4 sticky top-6">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            
            {selectedTests.length > 0 ? (
              <>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {selectedTests.map(test => {
                    const testId = test._id || test.id;
                    return (
                      <div key={testId} className="flex items-center justify-between text-sm">
                        <span>{test.code}</span>
                        <div className="flex items-center gap-2">
                          <span>Le {test.price.toLocaleString()}</span>
                          <button 
                            onClick={() => handleTestToggle(test)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>Le {subtotal.toLocaleString()}</span>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <Label className="text-sm">Discount</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={discountType} onValueChange={(v: 'fixed' | 'percentage') => setDiscountType(v)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Le</SelectItem>
                          <SelectItem value="percentage">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-status-normal">
                      <span>Discount</span>
                      <span>-Le {discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>Le {total.toLocaleString()}</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  size="lg"
                  onClick={handleProceedToPayment}
                  disabled={!effectivePatientId || !selectedPatient || selectedTests.length === 0}
                >
                  Proceed to Payment
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tests selected</p>
                <p className="text-sm">Select tests from the list</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{getPatientFullName(selectedPatient)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Tests</span>
                <span>{selectedTests.length} test(s)</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                <span>Amount Due</span>
                <span>Le {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Amount Paying Now</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={total}
                  placeholder={`Leave blank for full amount: Le ${total.toLocaleString()}`}
                  value={paymentAmountInput}
                  onChange={e => setPaymentAmountInput(e.target.value)}
                />
                {parseFloat(paymentAmountInput) > 0 && parseFloat(paymentAmountInput) < total && (
                  <p className="text-xs text-amber-600 font-medium">
                    Balance remaining: Le {(total - parseFloat(paymentAmountInput)).toLocaleString()} (recorded as credit)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Payment Method</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'orange_money', label: 'Orange Money', icon: Smartphone },
                    { id: 'afrimoney', label: 'Afrimoney', icon: CreditCard },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id as any)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                        selectedPayment === method.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <method.icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={!selectedPayment}>
              <Check className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
