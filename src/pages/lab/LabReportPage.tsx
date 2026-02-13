import { useParams, useNavigate } from 'react-router-dom';
import { LabResultReport } from '../../components/reports/LabResultReport';
import { Button } from '../../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function LabReportPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  if (!orderId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">Order ID is required</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b p-4 mb-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
      
      <LabResultReport orderId={orderId} />
    </div>
  );
}
