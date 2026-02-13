import { LaboratoryInfo } from '../../hooks/useLabReport';

interface ReportHeaderProps {
  laboratoryInfo: LaboratoryInfo;
}

export function ReportHeader({ laboratoryInfo }: ReportHeaderProps) {
  return (
    <div className="report-header border-b-4 border-blue-600 pb-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {laboratoryInfo.logo && (
            <img 
              src={laboratoryInfo.logo} 
              alt="Laboratory Logo" 
              className="h-16 mb-2"
            />
          )}
          <h1 className="text-2xl font-bold text-blue-900 mb-1">
            {laboratoryInfo.name}
          </h1>
          <div className="text-sm text-gray-700 space-y-0.5">
            <p>{laboratoryInfo.address}</p>
            <p>
              Phone: {laboratoryInfo.phone} | Email: {laboratoryInfo.email}
            </p>
            {laboratoryInfo.website && <p>Website: {laboratoryInfo.website}</p>}
          </div>
        </div>
      </div>
      <h2 className="text-xl font-bold text-center text-blue-900 mt-4 uppercase tracking-wide">
        Laboratory Results Report
      </h2>
    </div>
  );
}
