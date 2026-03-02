import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useTestCatalog, useCreateTest, useUpdateTest, useDeleteTest } from '@/hooks/useTestCatalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type TestCategory = Database['public']['Enums']['test_category'];
type SampleType = Database['public']['Enums']['sample_type'];

export default function TestCatalogManagement() {
  const { profile } = useAuth();
  const { data: tests, isLoading } = useTestCatalog();
  const createTest = useCreateTest();
  const updateTest = useUpdateTest();
  const deleteTest = useDeleteTest();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'other' as TestCategory,
    price: '',
    turnaround_time: '60',
    sample_type: 'blood' as SampleType,
    reference_range: '',
    unit: '',
    is_active: true
  });

  const filteredTests = tests?.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = () => {
    setEditingTest(null);
    setFormData({
      code: '',
      name: '',
      category: 'other',
      price: '',
      turnaround_time: '60',
      sample_type: 'blood',
      reference_range: '',
      unit: '',
      is_active: true
    });
    setShowDialog(true);
  };

  const handleEdit = (test: any) => {
    setEditingTest(test);
    setFormData({
      code: test.code,
      name: test.name,
      category: test.category,
      price: test.price.toString(),
      turnaround_time: test.turnaroundTime?.toString() || '60',
      sample_type: test.sampleType,
      reference_range: test.referenceRange || '',
      unit: test.unit || '',
      is_active: test.isActive
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const testData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        turnaroundTime: parseInt(formData.turnaround_time),
        sampleType: formData.sample_type,
        referenceRange: formData.reference_range || null,
        unit: formData.unit || null,
        isActive: formData.is_active
      };

      if (editingTest) {
        await updateTest.mutateAsync({ id: editingTest.id, updates: testData });
        toast.success('Test updated successfully');
      } else {
        await createTest.mutateAsync(testData);
        toast.success('Test created successfully');
      }
      setShowDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save test');
    }
  };

  const handleDelete = async (test: any) => {
    if (!confirm(`Are you sure you want to delete ${test.name}?`)) return;

    try {
      await deleteTest.mutateAsync(test.id);
      toast.success('Test deleted successfully');
    } catch (error) {
      toast.error('Failed to delete test');
    }
  };

  const handleToggleActive = async (test: any) => {
    try {
      await updateTest.mutateAsync({
        id: test.id,
        updates: { isActive: !test.isActive }
      });
      toast.success(`Test ${test.isActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update test status');
    }
  };

  return (
    <RoleLayout 
      title="Test Catalog Management" 
      subtitle="Manage laboratory tests and pricing"
      role="admin"
      userName={profile?.full_name}
    >
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              className="pl-10 w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="hematology">Hematology</SelectItem>
              <SelectItem value="chemistry">Chemistry</SelectItem>
              <SelectItem value="immunoassay">Immunoassay</SelectItem>
              <SelectItem value="urinalysis">Urinalysis</SelectItem>
              <SelectItem value="microbiology">Microbiology</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Test
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Tests</p>
          <p className="text-2xl font-bold">{tests?.length || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Tests</p>
          <p className="text-2xl font-bold text-status-normal">
            {tests?.filter(t => t.isActive).length || 0}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Inactive Tests</p>
          <p className="text-2xl font-bold text-muted-foreground">
            {tests?.filter(t => !t.isActive).length || 0}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Avg Price</p>
          <p className="text-2xl font-bold">
            Le {tests?.length ? Math.round(tests.reduce((sum, t) => sum + Number(t.price), 0) / tests.length).toLocaleString() : 0}
          </p>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Sample Type</th>
                <th>Price</th>
                <th>TAT</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests?.map(test => (
                <tr key={test.id}>
                  <td className="font-mono font-semibold">{test.code}</td>
                  <td>
                    <div>
                      <p className="font-medium">{test.name}</p>
                      {test.referenceRange && (
                        <p className="text-xs text-muted-foreground">
                          Range: {test.referenceRange} {test.unit}
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge variant="outline" className="capitalize">
                      {test.category}
                    </Badge>
                  </td>
                  <td className="capitalize">{test.sampleType}</td>
                  <td className="font-semibold">Le {Number(test.price).toLocaleString()}</td>
                  <td>{test.turnaroundTime} min</td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(test)}
                      className="flex items-center gap-1"
                    >
                      {test.isActive ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-status-normal" />
                          <span className="text-sm text-status-normal">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(test)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(test)}
                        className="text-status-critical hover:text-status-critical"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!filteredTests || filteredTests.length === 0) && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No tests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTest ? 'Edit Test' : 'Add New Test'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Test Code *</Label>
              <Input
                id="code"
                placeholder="CBC"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                disabled={!!editingTest}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Test Name *</Label>
              <Input
                id="name"
                placeholder="Complete Blood Count"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as TestCategory }))}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hematology">Hematology</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="immunoassay">Immunoassay</SelectItem>
                  <SelectItem value="urinalysis">Urinalysis</SelectItem>
                  <SelectItem value="microbiology">Microbiology</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample_type">Sample Type *</Label>
              <Select
                value={formData.sample_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sample_type: value as SampleType }))}
              >
                <SelectTrigger id="sample_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood">Blood</SelectItem>
                  <SelectItem value="urine">Urine</SelectItem>
                  <SelectItem value="stool">Stool</SelectItem>
                  <SelectItem value="swab">Swab</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (Le) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="2500"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tat">Turnaround Time (minutes) *</Label>
              <Input
                id="tat"
                type="number"
                placeholder="60"
                value={formData.turnaround_time}
                onChange={(e) => setFormData(prev => ({ ...prev, turnaround_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="g/dL"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_range">Reference Range</Label>
              <Input
                id="reference_range"
                placeholder="12.0-17.5"
                value={formData.reference_range}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_range: e.target.value }))}
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createTest.isPending || updateTest.isPending}
            >
              {(createTest.isPending || updateTest.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingTest ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
