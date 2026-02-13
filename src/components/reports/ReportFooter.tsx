import { LaboratoryInfo, ReportMetadata } from '../../hooks/useLabReport';

interface ReportFooterProps {
  laboratoryInfo: LaboratoryInfo;
  reportMetadata: ReportMetadata;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function ReportFooter({ laboratoryInfo, reportMetadata }: ReportFooterProps) {
  return (
    <div className="report-footer mt-8 pt-6 border-t-2 border-gray-300">
      {/* Decorative wave */}
      <div className="decorative-wave mb-4">
        <svg 
          viewBox="0 0 1200 100" 
          className="w-full h-8 text-blue-600"
          preserveAspectRatio="none"
        >
          <path 
            d="M0,50 Q300,0 600,50 T1200,50 L1200,100 L0,100 Z" 
            fill="currentColor"
            opacity="0.2"
          />
        </svg>
      </div>

      {/* Disclaimers */}
      <div className="disclaimer text-xs text-gray-700 space-y-2 mb-4">
        <p>
          <strong>CONFIDENTIALITY NOTICE:</strong> This report contains confidential patient 
          health information and is intended solely for the use of the requesting physician 
          and patient. Unauthorized disclosure or distribution is prohibited.
        </p>
        <p>
          <strong>CRITICAL RESULTS:</strong> Results marked as CRITICAL require immediate 
          clinical attention and have been communicated to the ordering physician.
        </p>
      </div>

      {/* Laboratory credentials */}
      <div className="text-xs text-gray-600 space-y-1 mb-4">
        {laboratoryInfo.accreditation && (
          <p className="accreditation">
            <strong>Accreditation:</strong> {laboratoryInfo.accreditation}
          </p>
        )}
        {laboratoryInfo.licenseNumber && (
          <p className="license">
            <strong>License No:</strong> {laboratoryInfo.licenseNumber}
          </p>
        )}
      </div>

      {/* Generation info */}
      <p className="generation-info text-xs text-gray-600 mb-2">
        Report generated on: {formatDateTime(reportMetadata.generatedAt)}
      </p>

      {/* End marker */}
      <p className="end-marker text-center text-sm font-bold text-gray-700 mt-4">
        *** END OF REPORT ***
      </p>
    </div>
  );
}
