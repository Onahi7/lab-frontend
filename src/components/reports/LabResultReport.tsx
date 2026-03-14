import { useRef, useEffect } from 'react';
import { useLabReport } from '../../hooks/useLabReport';
import { useReportTemplates } from '../../hooks/useReportTemplates';
import { usePrinterContext } from '@/context/PrinterContext';
import { ReportHeader } from './ReportHeader';
import { PatientInfoSection } from './PatientInfoSection';
import { CategorySection } from './CategorySection';
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
  const { template, loading: templateLoading } = useReportTemplates();
  const { settings: printerSettings } = usePrinterContext();
  const printRef = useRef<HTMLDivElement>(null);
  const margins = template?.margins;
  const paperSettings = template?.paperSettings;

  const marginTop = margins?.top ?? paperSettings?.marginTop ?? 10;
  const marginRight = margins?.right ?? paperSettings?.marginRight ?? 10;
  const marginBottom = margins?.bottom ?? paperSettings?.marginBottom ?? 12;
  const marginLeft = margins?.left ?? paperSettings?.marginLeft ?? 10;

  // Use admin-configured paper size and orientation
  const pageSize = `${printerSettings.a4.paperSize} ${printerSettings.a4.orientation}`;

  // Inject @page rule matching admin settings before printing
  const applyPrintPageRule = () => {
    const styleId = '__lab_report_page_style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@media print { @page { size: ${pageSize}; margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; } }`;
  };

  const handlePrint = async () => {
    applyPrintPageRule();
    // Electron: silent native print with configured settings
    if (window.electronAPI?.printSilent) {
      await window.electronAPI.printSilent({
        copies: printerSettings.a4.copies || 1,
        pageSize: printerSettings.a4.paperSize || 'A4',
        landscape: printerSettings.a4.orientation === 'landscape',
        silent: true,
      });
    } else {
      window.print();
    }
    onPrintComplete?.();
  };

  const handleExportPDF = async () => {
    try {
      applyPrintPageRule();
      // Electron: native PDF export with save dialog
      if (window.electronAPI?.printToPDF) {
        await window.electronAPI.printToPDF({
          pageSize: printerSettings.a4.paperSize || 'A4',
          landscape: printerSettings.a4.orientation === 'landscape',
        });
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF. Please try using your browser\'s print function.');
    }
  };

  if (loading || templateLoading) {
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

      {/* Report content — one page per category */}
      <div ref={printRef} className="report-pages">
        {reportData.resultsByCategory.map((category, index) => {
          const isLast = index === reportData.resultsByCategory.length - 1;
          return (
            <div
              key={category.category}
              className={`report-page w-full max-w-[210mm] mx-auto bg-white p-8 print:p-0 ${
                index < reportData.resultsByCategory.length - 1 ? 'report-page-break' : ''
              }`}
              style={{ minHeight: '297mm' }}
            >
              <ReportHeader
                laboratoryInfo={reportData.laboratoryInfo}
                template={template}
              />
              <PatientInfoSection
                patientInfo={reportData.patientInfo}
                orderInfo={reportData.orderInfo}
                template={template}
              />
              <CategorySection
                category={category}
                template={template}
                pageBreakBefore={false}
              />
              {isLast && (
                <>
                  <VerificationSection verificationInfo={reportData.verificationInfo} />
                  <ReportFooter
                    laboratoryInfo={reportData.laboratoryInfo}
                    reportMetadata={reportData.reportMetadata}
                    template={template}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-size: 10.5pt;
            line-height: 1.25;
          }
          
          .no-print {
            display: none !important;
          }

          .report-page {
            max-width: 100%;
            margin: 0;
            padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
            box-shadow: none;
            min-height: auto !important;
          }

          .report-page-break {
            page-break-after: always;
            break-after: page;
          }

          .report-header {
            margin-bottom: 3.5mm;
            padding-bottom: 2mm;
          }

          .report-header h1 {
            font-size: 18pt;
            line-height: 1.05;
          }

          .patient-info-section {
            margin-bottom: 3.5mm;
          }

          .category-section h3 {
            font-size: 16pt;
            margin-bottom: 1.5mm;
          }

          .results-table {
            font-size: 10pt;
          }

          .results-table th,
          .results-table td {
            padding-top: 1.2mm;
            padding-bottom: 1.2mm;
          }
          
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          @page {
            size: ${pageSize} portrait;
            margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
          }
          
          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        /* Screen preview: visual page separation */
        @media screen {
          .report-page + .report-page {
            margin-top: 2rem;
            border-top: 2px dashed #d1d5db;
            padding-top: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
