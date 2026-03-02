import { PatientInfo, OrderInfo } from '../../hooks/useLabReport';
import { ReportTemplate } from '../../hooks/useReportTemplates';

interface PatientInfoSectionProps {
  patientInfo: PatientInfo;
  orderInfo: OrderInfo;
  template?: ReportTemplate;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function PatientInfoSection({ patientInfo, orderInfo, template }: PatientInfoSectionProps) {
  const patientSettings = template?.patientSettings;
  const patientSection = template?.patientSection;
  const showDoctor = patientSection?.showDoctor ?? template?.patientInfo?.showDoctor ?? true;
  const showCopiesTo = patientSection?.showCopiesTo ?? true;
  const showCollected = patientSection?.showCollectionDate ?? true;
  const showReceived = patientSection?.showReceivedDate ?? true;
  const showReported = patientSection?.showReportedDate ?? true;
  const showPrinted = patientSection?.showPrintedDate ?? true;

  const patientAge = Number.isFinite(patientInfo.age)
    ? `${patientInfo.age} Year${patientInfo.age === 1 ? '' : 's'}`
    : '-';

  const orderingPhysician = orderInfo.orderingPhysician || '-';
  const copiesTo = orderInfo.orderingPhysician || '-';
  
  return (
    <div className="patient-info-section mb-5">
      <div className="grid grid-cols-3 gap-6 border-b border-gray-300 pb-2 mb-2">
        <h3 className="text-sm font-bold uppercase text-gray-700">Patient</h3>
        <h3 className="text-sm font-bold uppercase text-gray-700">Doctor</h3>
        <h3 className="text-sm font-bold uppercase text-gray-700">Copies To</h3>
      </div>

      <div className="grid grid-cols-3 gap-6 text-sm">
        <div className="space-y-1">
          {patientSettings?.showName !== false && (
            <p><span className="font-semibold uppercase text-xs">Name:</span> {patientInfo.fullName || '-'}</p>
          )}
          {patientSettings?.showAge !== false && (
            <p><span className="font-semibold uppercase text-xs">Age:</span> {patientAge}</p>
          )}
          {patientSettings?.showGender !== false && (
            <p><span className="font-semibold uppercase text-xs">Gender:</span> {patientInfo.gender || '-'}</p>
          )}
          {patientSettings?.showPatientId !== false && (
            <p><span className="font-semibold uppercase text-xs">ID Number:</span> {patientInfo.patientId || '-'}</p>
          )}
        </div>

        <div className="space-y-1">
          {showDoctor && (
            <p><span className="font-semibold uppercase text-xs">Name Of Doctor:</span> {orderingPhysician}</p>
          )}
          {showCollected && (
            <p><span className="font-semibold uppercase text-xs">Collected:</span> {formatDate(orderInfo.collectedAt || orderInfo.orderDate)}</p>
          )}
          {showReceived && (
            <p><span className="font-semibold uppercase text-xs">Received:</span> {formatDate(orderInfo.receivedAt || orderInfo.orderDate)}</p>
          )}
        </div>

        <div className="space-y-1">
          {showCopiesTo && (
            <p><span className="font-semibold uppercase text-xs">Name Of Doctor:</span> {copiesTo}</p>
          )}
          {showReported && (
            <p><span className="font-semibold uppercase text-xs">Reported:</span> {formatDate(orderInfo.reportedAt || orderInfo.orderDate)}</p>
          )}
          {showPrinted && (
            <p><span className="font-semibold uppercase text-xs">Printed:</span> {formatDate(orderInfo.reportedAt || orderInfo.orderDate)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
