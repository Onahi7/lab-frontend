import { PatientInfo, OrderInfo } from '../../hooks/useLabReport';

interface PatientInfoSectionProps {
  patientInfo: PatientInfo;
  orderInfo: OrderInfo;
}

interface InfoFieldProps {
  label: string;
  value: string | number | undefined;
}

function InfoField({ label, value }: InfoFieldProps) {
  if (!value) return null;
  
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-gray-600 uppercase">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function PatientInfoSection({ patientInfo, orderInfo }: PatientInfoSectionProps) {
  return (
    <div className="patient-info-section bg-gray-50 p-4 rounded-lg mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoField label="Patient Name" value={patientInfo.fullName} />
        <InfoField label="Patient ID" value={patientInfo.patientId} />
        <InfoField label="Age" value={`${patientInfo.age} years`} />
        <InfoField label="Gender" value={patientInfo.gender} />
        
        <InfoField label="Date of Birth" value={formatDate(patientInfo.dateOfBirth)} />
        {patientInfo.mrn && <InfoField label="MRN" value={patientInfo.mrn} />}
        {patientInfo.phone && <InfoField label="Phone" value={patientInfo.phone} />}
        
        <InfoField label="Order Number" value={orderInfo.orderNumber} />
        <InfoField label="Order Date" value={formatDate(orderInfo.orderDate)} />
        <InfoField label="Priority" value={orderInfo.priority.toUpperCase()} />
        
        {orderInfo.collectedAt && (
          <InfoField label="Collected" value={formatDateTime(orderInfo.collectedAt)} />
        )}
        {orderInfo.reportedAt && (
          <InfoField label="Reported" value={formatDateTime(orderInfo.reportedAt)} />
        )}
        {orderInfo.orderingPhysician && (
          <InfoField label="Ordering Physician" value={orderInfo.orderingPhysician} />
        )}
      </div>
    </div>
  );
}
