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

export default function NewOrder() {
  const { profile } = useAuth();
  const { data: patients } = useSearchPatients('');
  const { data: testsFromDB, isLoading: testsLoading } = useActiveTests();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedPatientId = searchParams.get('patient');
  const preselectedPatient = preselectedPatientId && patients && Array.isArray(patients) ? 
    patients.find(p => p.id === preselectedPatientId) : null;

  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId || '');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedTests, setSelectedTests] = useState<TestCatalogItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'card' | 'mobile-money' | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

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
  const effectivePatientId = preselectedPatientId && preselectedPatient ? preselectedPatientId : selectedPatientId;
  const selectedPatient = patients && Array.isArray(patients) ? 
    patients.find(p => p.id === effectivePatientId) : null;

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

  const filteredTests = useMemo(() => {
    if (categoryFilter === 'all') return testCatalog;
    return testCatalog.filter(t => t.category === categoryFilter);
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
      return [...prev, test];
    });
  };

  const handleProceedToPayment = () => {
    console.log('Payment validation:', {
      effectivePatientId,
      selectedPatient: !!selectedPatient,
      selectedTests: selectedTests.length,
      preselectedPatientId
    });
    
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
      patients.find(p => p.id === effectivePatientId) : null;
    if (!patient) {
      toast.error('Patient not found');
      return;
    }
    
    const orderTests = selectedTests.map(test => ({
      testId: test._id || test.id,
      testCode: test.code,
      testName: test.name,
      price: test.price,
    }));

    try {
      const newOrder = await createOrder.mutateAsync({
        patientId: patient.id,
        priority,
        tests: orderTests,
        discount: discount > 0 ? discount : undefined,
        discountType: discount > 0 ? discountType : undefined,
        paymentMethod: selectedPayment,
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
    return (
      <RoleLayout 
        title="Order Created" 
        subtitle="Order has been submitted"
        role="receptionist"
        userName={profile?.full_name}
      >
        <div className="max-w-lg mx-auto">
          <div className="bg-card border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-status-normal/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-status-normal" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Payment received. Sample collection can proceed.
            </p>
            
            <div className="bg-muted rounded-lg p-4 mb-4 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Order #</span>
                <span className="font-mono font-bold">{createdOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{selectedPatient?.firstName} {selectedPatient?.lastName}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Tests</span>
                <span>{selectedTests.length} test(s)</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="font-semibold">Total Paid</span>
                <span className="font-bold text-lg">Le {total.toLocaleString()}</span>
              </div>
            </div>

            <Button variant="outline" className="w-full mb-3">
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
                  <p className="font-semibold text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</p>
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
                      {patients.slice(-6).reverse().map((patient: any) => (
                        <button
                          key={patient.id}
                          className="p-3 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedPatientId(patient.id);
                            setPatientSearch('');
                          }}
                        >
                          <p className="font-medium text-sm">{patient.firstName} {patient.lastName}</p>
                          <p className="text-xs text-muted-foreground">{patient.patientId}</p>
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
                        key={patient.id}
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedPatientId(patient.id);
                          setPatientSearch('');
                        }}
                      >
                        <p className="font-medium">{patient.firstName} {patient.lastName}</p>
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
                    <button
                      key={testId}
                      onClick={() => handleTestToggle(test)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <div>
                          <p className="font-medium text-sm">{test.code}</p>
                          <p className="text-xs text-muted-foreground">{test.name}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm">Le {test.price.toLocaleString()}</span>
                    </button>
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
                <span className="font-medium">{selectedPatient?.firstName} {selectedPatient?.lastName}</span>
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

            <Label className="mb-3 block">Payment Method</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'mobile-money', label: 'Mobile', icon: Smartphone },
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
