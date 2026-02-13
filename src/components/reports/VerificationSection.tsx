import { VerificationInfo } from '../../hooks/useLabReport';

interface VerificationSectionProps {
  verificationInfo: VerificationInfo;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function VerificationSection({ verificationInfo }: VerificationSectionProps) {
  return (
    <div className="verification-section mt-8 mb-6 page-break-inside-avoid">
      <div className="grid grid-cols-2 gap-8 mb-4">
        <div className="signature-block">
          <div className="signature-line border-b-2 border-gray-400 h-16 mb-2"></div>
          <p className="signature-label text-xs font-semibold text-gray-600 uppercase">
            Performed By
          </p>
          <p className="signature-name text-sm text-gray-900">
            {verificationInfo.performedBy || 'Lab Technician'}
          </p>
        </div>
        <div className="signature-block">
          <div className="signature-line border-b-2 border-gray-400 h-16 mb-2"></div>
          <p className="signature-label text-xs font-semibold text-gray-600 uppercase">
            Verified By
          </p>
          <p className="signature-name text-sm text-gray-900">
            {verificationInfo.verifiedBy || 'Medical Director'}
          </p>
          {verificationInfo.verifiedAt && (
            <p className="signature-date text-xs text-gray-600 mt-1">
              Date: {formatDate(verificationInfo.verifiedAt)}
            </p>
          )}
        </div>
      </div>
      <div className="stamp-area border-2 border-dashed border-gray-300 p-4 text-center">
        <p className="text-sm text-gray-500">Laboratory Stamp/Seal</p>
      </div>
    </div>
  );
}
