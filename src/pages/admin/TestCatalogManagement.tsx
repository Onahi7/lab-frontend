import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { RoleLayout } from '@/components/layout/RoleLayout';
import api from '@/services/api';

interface ReferenceRange {
  ageGroup?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: 'M' | 'F' | 'all';
  pregnancy?: boolean;
  condition?: string;
  range: string;
  unit?: string;
  criticalLow?: string;
  criticalHigh?: string;
}

interface Test {
  _id: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  price: number;
  unit?: string;
  referenceRange?: string;
  referenceRanges?: ReferenceRange[];
  panelCode?: string;
  panelName?: string;
  linkedTests?: string[];
  turnaroundTime?: number;
  machineId?: string;
  isActive: boolean;
  description?: string;
}

const CATEGORIES = [
  { value: 'hematology', label: 'Hematology' },
  { value: 'chemistry', label: 'Clinical Chemistry' },
  { value: 'immunoassay', label: 'Immunoassay' },
  { value: 'serology', label: 'Serology' },
  { value: 'urinalysis', label: 'Urinalysis' },
  { value: 'microbiology', label: 'Microbiology' },
  { value: 'other', label: 'Other' },
];

const SAMPLE_TYPES = [
  { value: 'serum', label: 'Serum' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'whole blood', label: 'Whole Blood' },
  { value: 'urine', label: 'Urine' },
  { value: 'csf', label: 'CSF' },
  { value: 'other', label: 'Other' },
];

export default function TestCatalogManagement() {
  const queryClient = useQueryClient();
  const { hasRole, profile, primaryRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [formData, setFormData] = useState<Partial<Test>>({});
  const [referenceRanges, setReferenceRanges] = useState<ReferenceRange[]>([]);

  // Fetch all tests
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      const response = await api.get('/test-catalog');
      return response.data;
    },
  });

  // Create test mutation
  const createTest = useMutation({
    mutationFn: async (data: Partial<Test>) => {
      const response = await api.post('/test-catalog', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast.success('Test created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create test');
    },
  });

  // Update test mutation
  const updateTest = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Test> }) => {
      const response = await api.patch(`/test-catalog/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast.success('Test updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update test');
    },
  });

  // Delete test mutation
  const deleteTest = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/test-catalog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast.success('Test deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete test');
    },
  });

  const handleOpenDialog = (test?: Test) => {
    if (test) {
      setEditingTest(test);
      setFormData(test);
      setReferenceRanges(test.referenceRanges || []);
    } else {
      setEditingTest(null);
      setFormData({ isActive: true });
      setReferenceRanges([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTest(null);
    setFormData({});
    setReferenceRanges([]);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      referenceRanges: referenceRanges.length > 0 ? referenceRanges : undefined,
    };

    if (editingTest) {
      updateTest.mutate({ id: editingTest._id, data });
    } else {
      createTest.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this test?')) {
      deleteTest.mutate(id);
    }
  };

  const handleDuplicate = (test: Test) => {
    const duplicated = {
      ...test,
      code: `${test.code}_COPY`,
      name: `${test.name} (Copy)`,
    };
    delete (duplicated as any)._id;
    handleOpenDialog(duplicated as Test);
  };

  const addReferenceRange = () => {
    setReferenceRanges([
      ...referenceRanges,
      { range: '', gender: 'all', ageGroup: 'Adults' },
    ]);
  };

  const updateReferenceRange = (index: number, field: keyof ReferenceRange, value: any) => {
    const updated = [...referenceRanges];
    updated[index] = { ...updated[index], [field]: value };
    setReferenceRanges(updated);
  };

  const removeReferenceRange = (index: number) => {
    setReferenceRanges(referenceRanges.filter((_, i) => i !== index));
  };

  // Filter tests
  const filteredTests = tests.filter((test: Test) => {
    const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <RoleLayout 
      title="Test Catalog Management" 
      subtitle="Manage tests, reference ranges, and categories"
      role={primaryRole || 'admin'} 
      userName={profile?.full_name}
    >
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          {!isAdmin && <p className="text-sm text-amber-600">(Lab Technician View - Delete restricted to Admins)</p>}
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Test
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search by test name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-8">Loading tests...</div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tests found</div>
        ) : (
          filteredTests.map((test: Test) => (
            <Card key={test._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{test.name}</CardTitle>
                      <Badge variant={test.isActive ? 'default' : 'secondary'}>
                        {test.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {test.linkedTests && test.linkedTests.length > 0 && (
                        <Badge variant="outline">Linked</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Code: {test.code} | Category: {test.category} | Price: ${test.price}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(test)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog(test)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(test._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Sample:</span> {test.sampleType}
                  </div>
                  <div>
                    <span className="font-semibold">Unit:</span> {test.unit || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">TAT:</span> {test.turnaroundTime || 'N/A'} min
                  </div>
                  <div>
                    <span className="font-semibold">Panel:</span> {test.panelName || 'N/A'}
                  </div>
                </div>
                {test.referenceRange && (
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">Reference Range:</span> {test.referenceRange}
                  </div>
                )}
                {test.referenceRanges && test.referenceRanges.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-sm">Dynamic Ranges:</span>
                    <div className="mt-1 space-y-1">
                      {test.referenceRanges.map((range, idx) => (
                        <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                          {range.ageGroup} {range.gender !== 'all' && `(${range.gender})`}: {range.range} {range.unit}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {test.linkedTests && test.linkedTests.length > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">Linked Tests:</span> {test.linkedTests.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? 'Edit Test' : 'Create New Test'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="ranges">Reference Ranges</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Test Code *</Label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., PSA, CA125"
                  />
                </div>
                <div>
                  <Label>Test Name *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Prostate Specific Antigen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sample Type *</Label>
                  <Select
                    value={formData.sampleType}
                    onValueChange={(value) => setFormData({ ...formData, sampleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sample type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAMPLE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., mg/dL, ng/mL"
                  />
                </div>
                <div>
                  <Label>Turnaround Time (min)</Label>
                  <Input
                    type="number"
                    value={formData.turnaroundTime || ''}
                    onChange={(e) => setFormData({ ...formData, turnaroundTime: parseInt(e.target.value) })}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Panel Code</Label>
                  <Input
                    value={formData.panelCode || ''}
                    onChange={(e) => setFormData({ ...formData, panelCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., TUMOR, CARDIAC"
                  />
                </div>
                <div>
                  <Label>Panel Name</Label>
                  <Input
                    value={formData.panelName || ''}
                    onChange={(e) => setFormData({ ...formData, panelName: e.target.value })}
                    placeholder="e.g., Tumor Markers, Cardiac Markers"
                  />
                </div>
              </div>

              <div>
                <Label>Simple Reference Range</Label>
                <Input
                  value={formData.referenceRange || ''}
                  onChange={(e) => setFormData({ ...formData, referenceRange: e.target.value })}
                  placeholder="e.g., 0-4.0 ng/mL or < 35 U/mL"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use this for tests with a single reference range. For age/gender-specific ranges, use the Reference Ranges tab.
                </p>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active (available for ordering)</Label>
              </div>
            </TabsContent>

            {/* Reference Ranges Tab */}
            <TabsContent value="ranges" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Add multiple reference ranges for different age groups, genders, or conditions
                </p>
                <Button size="sm" onClick={addReferenceRange}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Range
                </Button>
              </div>

              {referenceRanges.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No dynamic ranges defined. Click "Add Range" to create age/gender-specific ranges.
                </div>
              ) : (
                <div className="space-y-4">
                  {referenceRanges.map((range, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-semibold">Range #{index + 1}</h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeReferenceRange(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Age Group Label</Label>
                            <Input
                              value={range.ageGroup || ''}
                              onChange={(e) => updateReferenceRange(index, 'ageGroup', e.target.value)}
                              placeholder="e.g., Adults, 40-49 years"
                            />
                          </div>
                          <div>
                            <Label>Gender</Label>
                            <Select
                              value={range.gender || 'all'}
                              onValueChange={(value) => updateReferenceRange(index, 'gender', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="M">Male</SelectItem>
                                <SelectItem value="F">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label>Min Age (years)</Label>
                            <Input
                              type="number"
                              value={range.ageMin || ''}
                              onChange={(e) => updateReferenceRange(index, 'ageMin', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <Label>Max Age (years)</Label>
                            <Input
                              type="number"
                              value={range.ageMax || ''}
                              onChange={(e) => updateReferenceRange(index, 'ageMax', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="Optional"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label>Range Value *</Label>
                            <Input
                              value={range.range}
                              onChange={(e) => updateReferenceRange(index, 'range', e.target.value)}
                              placeholder="e.g., 0-4.5, < 35, > 100"
                            />
                          </div>
                          <div>
                            <Label>Unit</Label>
                            <Input
                              value={range.unit || ''}
                              onChange={(e) => updateReferenceRange(index, 'unit', e.target.value)}
                              placeholder="e.g., ng/mL, U/mL"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label>Condition (Optional)</Label>
                          <Input
                            value={range.condition || ''}
                            onChange={(e) => updateReferenceRange(index, 'condition', e.target.value)}
                            placeholder="e.g., pre-menopausal, follicular, pregnancy"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Use for special conditions like menstrual cycle phases, pregnancy, etc.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 mt-4">
                          <input
                            type="checkbox"
                            id={`pregnancy-${index}`}
                            checked={range.pregnancy || false}
                            onChange={(e) => updateReferenceRange(index, 'pregnancy', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`pregnancy-${index}`}>Pregnancy-specific range</Label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div>
                <Label>Linked Tests</Label>
                <Input
                  value={formData.linkedTests?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    linkedTests: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  placeholder="e.g., HSCRP (comma-separated test codes)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tests that should be automatically included when this test is ordered (e.g., CRP includes HSCRP)
                </p>
              </div>

              <div>
                <Label>Machine ID</Label>
                <Input
                  value={formData.machineId || ''}
                  onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                  placeholder="Optional machine/analyzer ID"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.code || !formData.name || !formData.category}>
              <Save className="h-4 w-4 mr-2" />
              {editingTest ? 'Update Test' : 'Create Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RoleLayout>
  );
}
