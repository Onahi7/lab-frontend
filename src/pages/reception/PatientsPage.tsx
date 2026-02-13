import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useSearchPatients, useCreatePatient } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Plus, Eye, ClipboardList, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const { data: patients, isLoading } = useSearchPatients(searchTerm);
  const createPatient = useCreatePatient();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '' as 'M' | 'F' | 'O' | '',
    phone: '',
    email: '',
    address: '',
  });

  const handleCreatePatient = async () => {
    if (!formData.firstName || !formData.lastName || !formData.age || !formData.gender) {
      toast.error('Please fill in required fields');
      return;
    }

    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      toast.error('Please enter a valid age (0-150)');
      return;
    }

    try {
      const result = await createPatient.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        age: ageNum,
        gender: formData.gender,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
      });

      toast.success(`Patient registered: ${result.patientId}`);
      setShowAddDialog(false);
      setFormData({
        firstName: '',
        lastName: '',
        age: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
      });
    } catch (error) {
      toast.error('Failed to register patient');
    }
  };

  return (
    <RoleLayout 
      title="Patients" 
      subtitle="Search and manage patient records"
      role="receptionist"
      userName={profile?.full_name}
    >
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, ID, or phone..." 
            className="pl-10 w-96"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </div>

      {/* Patients Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients?.map(patient => (
                <tr key={patient.id}>
                  <td className="font-mono text-sm">{patient.patientId}</td>
                  <td className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </td>
                  <td>{patient.age} years</td>
                  <td>
                    <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                      {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{patient.phone || '-'}</td>
                  <td className="text-muted-foreground text-sm">
                    {format(new Date(patient.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/reception/new-order?patient=${patient.id}`)}
                      >
                        <ClipboardList className="w-4 h-4 mr-1" />
                        Order
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!patients || patients.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No patients found matching your search' : 'No patients registered yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Patient Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input 
                value={formData.firstName}
                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input 
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Enter last name"
              />
            </div>
            <div className="space-y-2">
              <Label>Age *</Label>
              <Input 
                type="number"
                min="0"
                max="150"
                value={formData.age}
                onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="Enter age"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={formData.gender} onValueChange={v => setFormData(prev => ({ ...prev, gender: v as 'M' | 'F' | 'O' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="O">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+234 XXX XXX XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="patient@email.com"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address</Label>
              <Input 
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePatient} disabled={createPatient.isPending}>
              {createPatient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Register Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleLayout>
  );
}
