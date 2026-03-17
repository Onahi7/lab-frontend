import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Printer, Loader2, FileText, Eye, PrinterIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getPatientName, getOrderId } from '@/utils/orderHelpers';
import { useNavigate } from 'react-router-dom';

export default function CompletedOrdersPage() {
  const { profile, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  
  // Fetch orders with status 'completed' or 'processing' (orders with results)
  const { data: completedOrders, isLoading: loadingCompleted } = useOrders('completed');
  const { data: processingOrders, isLoading: loadingProcessing } = useOrders('processing');
  
  const isLoading = loadingCompleted || loadingProcessing;
  
  // Combine both completed and processing orders
  const allOrders = [
    ...(Array.isArray(completedOrders) ? completedOrders : []),
    ...(Array.isArray(processingOrders) ? processingOrders : [])
  ];

  const filteredOrders = allOrders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const orderNum = (order.orderNumber || order.order_number || '').toLowerCase();
    const firstName = (order.patientId?.firstName || order.patients?.first_name || '').toLowerCase();
    const lastName = (order.patientId?.lastName || order.patients?.last_name || '').toLowerCase();
    const patientId = (order.patientId?.patientId || order.patients?.patient_id || '').toLowerCase();
    
    return (
      orderNum.includes(search) ||
      firstName.includes(search) ||
      lastName.includes(search) ||
      patientId.includes(search)
    );
  });

  const handlePrintReport = (orderId: string) => {
    // Navigate to the appropriate route based on user role
    const reportPath = primaryRole === 'receptionist' 
      ? `/reception/reports/${orderId}` 
      : `/lab/reports/${orderId}`;
    navigate(reportPath);
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allOrderIds = filteredOrders.map(order => getOrderId(order));
      setSelectedOrders(new Set(allOrderIds));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleBulkPrint = () => {
    if (selectedOrders.size === 0) return;
    
    // Open each selected report in a new tab for printing
    selectedOrders.forEach(orderId => {
      const reportPath = primaryRole === 'receptionist' 
        ? `/reception/reports/${orderId}` 
        : `/lab/reports/${orderId}`;
      window.open(reportPath, '_blank');
    });
    
    // Clear selection after printing
    setSelectedOrders(new Set());
  };

  const isAllSelected = filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length;
  const isIndeterminate = selectedOrders.size > 0 && selectedOrders.size < filteredOrders.length;

  return (
    <RoleLayout 
      title="Print Reports" 
      subtitle="View and print lab reports for orders with results (partial or complete)"
      role={primaryRole || 'lab_tech'}
      userName={profile?.full_name}
    >
      {/* Search Bar and Bulk Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by patient name, order number..." 
              className="pl-10 w-96"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedOrders.size > 0 && (
            <Button 
              onClick={handleBulkPrint}
              className="flex items-center gap-2"
            >
              <PrinterIcon className="w-4 h-4" />
              Print Selected ({selectedOrders.size})
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredOrders.length} order(s) with results
        </div>
      </div>

      {selectedOrders.size === 0 && filteredOrders.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          💡 Tip: Select orders using checkboxes to print multiple reports at once
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all orders"
                  />
                </th>
                <th>Order #</th>
                <th>Patient</th>
                <th>Tests</th>
                <th>Completed</th>
                <th>Results</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders?.map(order => {
                const orderId = getOrderId(order);
                const patientName = getPatientName(order);
                const patientId = order.patientId?.patientId || order.patients?.patient_id;
                const orderNumber = order.orderNumber || order.order_number;
                const completedAt = order.completedAt || order.completed_at || order.updatedAt || order.updated_at;
                const testCount = order.order_tests?.length || order.tests?.length || 0;
                
                return (
                  <tr key={orderId}>
                    <td>
                      <Checkbox
                        checked={selectedOrders.has(orderId)}
                        onCheckedChange={(checked) => handleSelectOrder(orderId, checked as boolean)}
                        aria-label={`Select order ${orderNumber}`}
                      />
                    </td>
                    <td className="font-mono text-sm font-medium">{orderNumber}</td>
                    <td>
                      <div>
                        <p className="font-medium">{patientName}</p>
                        <p className="text-xs text-muted-foreground">{patientId}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{testCount} test(s)</p>
                        <p className="text-xs text-muted-foreground">
                          {(order.order_tests || order.tests || []).slice(0, 2).map((t: any) => 
                            t.testCode || t.test_code
                          ).join(', ')}
                          {testCount > 2 && ` +${testCount - 2} more`}
                        </p>
                      </div>
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {completedAt ? format(new Date(completedAt), 'MMM dd, yyyy HH:mm') : '-'}
                    </td>
                    <td>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          order.status === 'completed' 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        )}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        {order.status === 'completed' ? 'Complete' : 'Partial'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePrintReport(orderId)}
                          className="flex items-center gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          Print Report
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/lab/reports/${orderId}`)}
                          title="View Report"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!filteredOrders || filteredOrders.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    {searchTerm ? 'No orders found matching your search' : 'No completed orders yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">How to Print Reports</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click "Print Report" to open the printable lab report</li>
              <li>• Click the eye icon to preview the report before printing</li>
              <li>• Use the search box to find specific patients or orders</li>
              <li>• Reports include all test results with age-specific reference ranges</li>
            </ul>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}
