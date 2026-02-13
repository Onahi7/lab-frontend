import { useRef } from 'react';
import { useLabReport } from '../../hooks/useLabReport';
import { ReportHeader } from './ReportHeader';
import { PatientInfoSection } from './PatientInfoSection';
import { ResultsSection } from './ResultsSection';
import { VerificationSection } from './VerificationSection';
import { ReportFooter } from './ReportFooter';
import { Button } from '../ui/button';
import { Printer, Download, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface LabResultReportProps {
  /** MongoDB ObjectId of the order to generate report for */
  orderId: string;
  /** Optional callback invoked after successful print */
  onPrintComplete?: () => void;
}

/**
 * LabResultReport Component
 * 
 * Displays a professional, printable laboratory results report with the following sections:
 * - Laboratory header with branding
 * - Patient demographics and order information
 * - Test results grouped by category with visual flags
 * - Verification signatures
 * - Legal disclaimers and laboratory credentials
 * 
 * Features:
 * - Print functionality with optimized layout
 * - PDF export via browser print-to-PDF
 * - Color-coded result flags (normal, high, low, critical)
 * - Arrow indicators for abnormal results
 * - Responsive design for screen viewing
 * - Print-specific CSS for paper output
 * 
 * @example
 * ```tsx
 * <LabResultReport 
 *   orderId="507f1f77bcf86cd799439011" 
 *   onPrintComplete={() => console.log('Printed')}
 * />
 * ```
 */
export function LabResultReport({ orderId, onPrintComplete }: LabResultReportProps) {
  const { reportData, loading, error, refetch } = useLabReport(orderId);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
    onPrintComplete?.();
  };

  const handleExportPDF = async () => {
    try {
      // Use browser's print to PDF functionality
      window.print();
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF. Please try using your browser\'s print function.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={refetch}>Retry</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No report data available.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-result-report-container">
      {/* Action buttons - hidden when printing */}
      <div className="no-print sticky top-0 z-10 bg-white border-b shadow-sm p-4 mb-6">
        <div className="max-w-4xl mx-auto flex gap-2 justify-end">
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
          <Button 
            onClick={handleExportPDF} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report content */}
      <div 
        ref={printRef} 
        className="report-container max-w-4xl mx-auto bg-white p-8 print:p-0"
      >
        <ReportHeader laboratoryInfo={reportData.laboratoryInfo} />
        <PatientInfoSection 
          patientInfo={reportData.patientInfo} 
          orderInfo={reportData.orderInfo} 
        />
        <ResultsSection resultsByCategory={reportData.resultsByCategory} />
        <VerificationSection verificationInfo={reportData.verificationInfo} />
        <ReportFooter 
          laboratoryInfo={reportData.laboratoryInfo} 
          reportMetadata={reportData.reportMetadata} 
        />
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .report-container {
            max-width: 100%;
            margin: 0;
            padding: 20mm;
            box-shadow: none;
          }
          
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
          
          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
