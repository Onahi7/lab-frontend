import { useRef, useEffect } from 'react';
import { useLabReport } from '../../hooks/useLabReport';
import { useDefaultTemplate } from '../../hooks/useReportTemplates';
import { usePrinterContext } from '@/context/PrinterContext';
import { usePaginatedReport } from './SmartPaginatedReport';
import { ReportHeader } from './ReportHeader';
import { PatientInfoSection } from './PatientInfoSection';
import { PaginatedCategorySection } from './PaginatedCategorySection';
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
  const { data: template, isLoading: templateLoading } = useDefaultTemplate();
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

  // Use smart pagination to split results across pages intelligently
  // Heights calibrated to print layout (mm)
  const paginatedPages = usePaginatedReport(
    reportData?.resultsByCategory || [],
    {
      headerHeight: 26,        // header with logo + lab name
      patientInfoHeight: 22,   // patient info grid
      footerHeight: 16,        // footer with wave + disclaimer
      categoryTitleHeight: 8,  // category heading
      panelHeaderHeight: 6,    // panel header row
      tableHeaderHeight: 6,    // table column headers
      testRowHeight: 5.8,      // row height for 13px font
      totalPageHeight: 297,
      margins: marginTop + marginBottom,
      maxTestsBeforeSplit: 20, // allow FBC-sized panels to split across pages
    }
  );

  // Debug: Log pagination results and report data
  useEffect(() => {
    console.log('🔍 Report Data:', {
      hasData: !!reportData,
      orderId,
      paginatedPages: paginatedPages.length,
    });

    if (paginatedPages.length > 0) {
      console.log('📄 Paginated Report:', {
        totalPages: paginatedPages.length,
        pages: paginatedPages.map(p => ({
          pageNumber: p.pageNumber,
          categories: p.categories.map(c => ({
            name: c.categoryDisplayName,
            panels: c.panels.length,
            totalTests: c.panels.reduce((sum, panel) => sum + panel.results.length, 0),
          })),
        })),
      });
    }

    if (reportData) {
      console.log('📊 Report Content:', {
        patient: reportData.patientInfo.fullName,
        orderNumber: reportData.orderInfo.orderNumber,
        categories: reportData.resultsByCategory.length,
        totalResults: reportData.resultsByCategory.reduce((sum, cat) => sum + cat.results.length, 0),
      });
    }
  }, [paginatedPages, reportData, orderId]);

  // Inject @page rule matching admin settings before printing
  // We use @page { margin: 0 } and apply margins as padding on .report-page
  // so that flexbox footer-at-bottom works correctly.
  const applyPrintPageRule = () => {
    const styleId = '__lab_report_page_style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@media print {
      @page { size: ${pageSize}; margin: 0; }
      .report-page { padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm !important; }
    }`;
  };

  const handlePrint = async () => {
    console.log('🖨️ Print button clicked');
    console.log('Report ref:', printRef.current ? 'Found' : 'Not found');
    console.log('Report data:', reportData ? 'Loaded' : 'Not loaded');
    console.log('Paginated pages:', paginatedPages.length);

    // Apply print styles first
    applyPrintPageRule();

    // Small delay to ensure styles are applied
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('🖨️ Triggering window.print()');

    // Electron: silent native print with configured settings
    if (window.electronAPI?.printSilent) {
      await window.electronAPI.printSilent({
        copies: printerSettings.a4.copies || 1,
        pageSize: printerSettings.a4.paperSize || 'A4',
        landscape: printerSettings.a4.orientation === 'landscape',
        silent: true,
      });
    } else {
      // Use window.print() for browser print
      window.print();
    }
    onPrintComplete?.();
  };

  const handleExportPDF = async () => {
    try {
      applyPrintPageRule();
      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 200));

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
      alert('Failed to export PDF. Please try using your browser\'s print function and select "Save as PDF".');
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
      <div className="no-print flex gap-2 justify-end mb-6">
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

      {/* Report content — intelligently paginated */}
      <div ref={printRef} className="report-pages">
        {paginatedPages.map((page) => {
          return (
            <div
              key={page.pageNumber}
              className={`report-page w-full mx-auto bg-white p-8 print:p-0 ${!page.isLastPage ? 'report-page-break' : ''
                }`}
            >
              <div className="report-content flex-grow">
                {/* Header on every page */}
                <ReportHeader
                  laboratoryInfo={reportData.laboratoryInfo}
                  template={template}
                />

                {/* Patient info on every page */}
                <PatientInfoSection
                  patientInfo={reportData.patientInfo}
                  orderInfo={reportData.orderInfo}
                  template={template}
                />

                {/* Render categories for this page */}
                {page.categories.map((pageCategory, idx) => (
                  <PaginatedCategorySection
                    key={`${pageCategory.category}-${idx}`}
                    pageCategory={pageCategory}
                    template={template}
                  />
                ))}

              </div>

              {/* Verification + Footer pinned to bottom of page */}
              <div className="report-footer-container mt-auto">
                {/* Verification section only on last page */}
                {page.isLastPage && (
                  <VerificationSection verificationInfo={reportData.verificationInfo} />
                )}
                <ReportFooter
                  laboratoryInfo={reportData.laboratoryInfo}
                  reportMetadata={reportData.reportMetadata}
                  template={template}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide ALL UI chrome: sidebar, nav, buttons, fixed overlays, etc. */
          .no-print,
          aside,
          nav,
          header:not(.report-header),
          button,
          .fixed,
          .sticky,
          .z-50,
          [role="navigation"] {
            display: none !important;
          }

          /* Reset the entire document */
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* ===== CRITICAL: Remove RoleLayout sidebar offset ===== */
          /* The RoleLayout wraps content in div.ml-64 — this pushes
             everything 256px to the right. We MUST reset ALL margin-left
             and padding on every ancestor of the report. */
          #root > div,
          #root > div > div,
          .ml-64,
          [class*="ml-"] {
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          main, main.p-6 {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Report container — full width, no constraints */
          .lab-result-report-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          /* Report pages container — full width */
          .report-pages {
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }

          /* ===== Each report page ===== */
          .report-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            /* Flex column fills the page so footer sticks to bottom */
            display: flex !important;
            flex-direction: column !important;
            min-height: 100vh !important;
            box-sizing: border-box !important;
          }

          /* Page break between pages (except the last one) */
          .report-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }

          .report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* Report content area — grows to push footer to bottom */
          .report-content {
            overflow: visible !important;
            flex: 1 1 auto !important;
          }

          /* Footer pinned to bottom of each page */
          .report-footer-container {
            margin-top: auto !important;
            flex-shrink: 0 !important;
          }

          /* @page margins set to 0 — the .report-page padding handles edge spacing.
             The dynamically injected @page rule from admin settings overrides this. */
          @page {
            size: A4 portrait;
            margin: 0;
          }

          /* Preserve all colors and backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Prevent individual rows from breaking mid-element */
          .page-break-inside-avoid,
          .results-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Ensure tables span full width */
          .results-table {
            width: 100% !important;
          }

          /* ===== PRINT LAYOUT — sized to fit A4 ===== */

          /* Header */
          .report-header {
            padding-bottom: 2mm !important;
            margin-bottom: 3mm !important;
          }
          .report-header h1 {
            font-size: 22px !important;
            line-height: 1.2 !important;
          }
          .report-header img {
            height: 48px !important;
          }
          .report-header .flex {
            gap: 8px !important;
          }
          .report-header .text-right {
            font-size: 12px !important;
          }

          /* Patient info section */
          .patient-info-section {
            margin-bottom: 3mm !important;
          }
          .patient-info-section .grid {
            gap: 12px !important;
          }
          .patient-info-section p {
            font-size: 12.5px !important;
            line-height: 1.4 !important;
            margin: 0 !important;
          }
          .patient-info-section h3 {
            font-size: 12px !important;
            margin: 0 !important;
            padding-bottom: 2px !important;
          }
          .patient-info-section .space-y-1 > * + * {
            margin-top: 2px !important;
          }

          /* Category headings */
          .category-section {
            margin-bottom: 2mm !important;
          }
          .category-section > h3 {
            font-size: 16px !important;
            font-weight: 800 !important;
            margin-bottom: 2mm !important;
            line-height: 1.2 !important;
          }
            line-height: 1.2 !important;
          }

          /* Results table */
          .results-table {
            margin-bottom: 2mm !important;
            font-size: 13px !important;
          }
          .results-table th {
            padding: 3px 8px !important;
            font-size: 11px !important;
          }
          .results-table td {
            padding: 2px 8px !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
          }

          /* Verification section */
          .verification-section {
            margin-top: 5mm !important;
            margin-bottom: 2mm !important;
          }
          .verification-section .grid {
            gap: 20px !important;
          }
          .verification-section p,
          .verification-section .text-sm {
            font-size: 13px !important;
          }

          /* Footer */
          .report-footer {
            margin-top: 2mm !important;
            padding-top: 1mm !important;
          }
          .report-footer .decorative-wave svg {
            height: 28px !important;
          }
          .report-footer .decorative-wave {
            margin-bottom: 1mm !important;
          }
          .report-footer .grid {
            gap: 12px !important;
          }
          .report-footer-container {
            margin-top: 3mm !important;
          }
        }

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
