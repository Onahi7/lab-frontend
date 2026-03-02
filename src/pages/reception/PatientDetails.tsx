import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { usePatient, useUpdatePatient } from '@/hooks/usePatients';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Save, X, FileText, Loader2 } from 'lucide-react';
import { PatientNotesPanel } from '@/components/patients/PatientNotesPanel';
import { getPatientFullName } from '@/utils/orderHelpers';

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: patient, isLoading } = usePatient(id!);
  const { data: orders } = useOrders('all');
  const updatePatient = useUpdatePatient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: ''
  });

  const patientOrders = orders?.filter(o => o.patient_id === id);

  const handleEdit = () => {
    if (patient) {
      setFormData({
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || ''
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      await updatePatient.mutateAsync({
        id,
        updates: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender as 'M' | 'F' | 'O',
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null
        }
      });
      toast.success('Patient updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update patient');
    }
  };

  if (isLoading) {
    return (
      <RoleLayout title="Patient Details" subtitle="Loading..." role="receptionist" userName={profile?.full_name}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </RoleLayout>
    );
  }

  if (!patient) {
    return (
      <RoleLayout title="Patient Not Found" subtitle="Patient does not exist" role="receptionist" userName={profile?.full_name}>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Patient not found</p>
          <Button onClick={() => navigate('/reception/patients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout 
      title={getPatientFullName(patient)}
      subtitle={patient.patient_id}
      role="receptionist"
      userName={profile?.full_name}
    >
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/reception/patients')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="orders">Orders ({patientOrders?.length || 0})</TabsTrigger>
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Patient Information</h3>
              {!isEditing ? (
                <Button onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={updatePatient.isPending}>
                    {updatePatient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Patient ID</p>
                  <p className="font-mono font-semibold">{patient.patient_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MRN</p>
                  <p className="font-mono">{patient.mrn || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{getPatientFullName(patient)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p>{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p>{Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{patient.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{patient.email || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p>{patient.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registered</p>
                  <p>{new Date(patient.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Tests</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patientOrders?.map(order => (
                  <tr key={order.id}>
                    <td className="font-mono">{order.order_number}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>{order.order_tests.length} test(s)</td>
                    <td>
                      <Badge variant="outline">{order.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="font-semibold">Le {Number(order.total).toLocaleString()}</td>
                    <td>
                      <Button variant="ghost" size="sm">
                        <FileText className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!patientOrders || patientOrders.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <div className="bg-card border rounded-lg p-6">
            <PatientNotesPanel patientId={id!} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="bg-card border rounded-lg p-6">
            <p className="text-muted-foreground">Patient history coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </RoleLayout>
  );
}
