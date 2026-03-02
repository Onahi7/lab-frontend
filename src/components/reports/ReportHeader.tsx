import { LaboratoryInfo } from '../../hooks/useLabReport';
import { ReportTemplate } from '../../hooks/useReportTemplates';

interface ReportHeaderProps {
  laboratoryInfo: LaboratoryInfo;
  template?: ReportTemplate;
}

export function ReportHeader({ laboratoryInfo, template }: ReportHeaderProps) {
  const headerSettings = template?.headerSettings;
  const header = template?.header;
  const colors = template?.colors;
  const styling = template?.styling;

  const primaryColor = colors?.primary || styling?.primaryColor || '#1e3a8a';
  const secondaryColor = colors?.secondary || styling?.secondaryColor || '#6b7280';
  const showLogo = headerSettings?.showLogo ?? header?.showLogo ?? true;
  const resolvedLogo = template?.logo || header?.logoUrl || laboratoryInfo.logo;
  const logoSrc = resolvedLogo?.startsWith('/')
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${resolvedLogo}`
    : resolvedLogo;

  const labName = headerSettings?.labName || header?.labName || laboratoryInfo.name;
  const motto = header?.motto || header?.tagline;
  const address = headerSettings?.address || header?.address || laboratoryInfo.address;
  const phone = headerSettings?.phone || header?.phone || laboratoryInfo.phone;
  const email = headerSettings?.email || header?.email || laboratoryInfo.email;
  
  return (
    <div 
      className="report-header pb-3 mb-4"
      style={{
        borderBottom: `2px solid ${header?.headerBorderColor || primaryColor}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {showLogo && logoSrc && (
            <img 
              src={logoSrc}
              alt="Laboratory Logo" 
              className="h-14 w-auto"
            />
          )}
          <div>
            {headerSettings?.showLabName !== false && (
              <h1 className="text-3xl font-bold leading-tight" style={{ color: primaryColor }}>
                {labName}
              </h1>
            )}
            {motto && (
              <p className="text-xs italic mt-1" style={{ color: secondaryColor }}>
                {motto}
              </p>
            )}
          </div>
        </div>

        <div className="text-right text-xs leading-snug text-gray-700 mt-1">
          {phone && <p>{phone}</p>}
          {email && <p>{email}</p>}
          {headerSettings?.showAddress !== false && address && <p>{address}</p>}
        </div>
      </div>
    </div>
  );
}
