import { useParams, useNavigate } from 'react-router-dom';
import { RoleLayout } from '../../components/layout/RoleLayout';
import { useAuth } from '../../context/AuthContext';
import { LabResultReport } from '../../components/reports/LabResultReport';
import { Button } from '../../components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { useMemo } from 'react';

export default function LabReportPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { profile, primaryRole } = useAuth();

  // Fetch completed orders for pagination
  const { data: completedOrders } = useOrders('completed');
  const { data: processingOrders } = useOrders('processing');

  // Combine orders and find current index
  const allOrders = useMemo(() => {
    return [
      ...(Array.isArray(completedOrders) ? completedOrders : []),
      ...(Array.isArray(processingOrders) ? processingOrders : [])
    ];
  }, [completedOrders, processingOrders]);

  const currentIndex = useMemo(() => {
    return allOrders.findIndex(order => {
      const id = order._id || order.id;
      return id === orderId;
    });
  }, [allOrders, orderId]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allOrders.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevOrder = allOrders[currentIndex - 1];
      const prevId = prevOrder._id || prevOrder.id;
      const basePath = primaryRole === 'receptionist' ? '/reception/reports' : '/lab/reports';
      navigate(`${basePath}/${prevId}`);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextOrder = allOrders[currentIndex + 1];
      const nextId = nextOrder._id || nextOrder.id;
      const basePath = primaryRole === 'receptionist' ? '/reception/reports' : '/lab/reports';
      navigate(`${basePath}/${nextId}`);
    }
  };

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
      <div className="no-print mb-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Pagination Controls */}
        {allOrders.length > 1 && currentIndex >= 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Report
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              {currentIndex + 1} of {allOrders.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!hasNext}
              className="flex items-center gap-1"
            >
              Next Report
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <LabResultReport orderId={orderId} />
    </RoleLayout>
  );
}
