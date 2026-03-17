import { useParams, useNavigate } from 'react-router-dom';
import { RoleLayout } from '../../components/layout/RoleLayout';
import { useAuth } from '../../context/AuthContext';
import { LabResultReport } from '../../components/reports/LabResultReport';
import { Button } from '../../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function LabReportPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { profile, primaryRole } = useAuth();

  // Determine the correct role for the layout
  const layoutRole = primaryRole || 'lab_tech';

  if (!orderId) {
    return (
      <RoleLayout
        title="Lab Report"
        subtitle="View and print laboratory test results"
        role={layoutRole}
        userName={profile?.full_name}
      >
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Order ID is required</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout
      title="Lab Report"
      subtitle="View and print laboratory test results"
      role={layoutRole}
      userName={profile?.full_name}
    >
      <div className="no-print mb-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      
      <LabResultReport orderId={orderId} />
    </RoleLayout>
  );
}
