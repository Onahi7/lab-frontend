import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { ThermalPrinterSetupWizard } from '@/components/printer/ThermalPrinterSetupWizard';

export default function PrinterSetup() {
  const { profile } = useAuth();

  return (
    <RoleLayout
      title="Printer Setup"
      subtitle="Plug in the receipt printer and click Print Test Receipt to get started"
      role="receptionist"
      userName={profile?.full_name}
    >
      <div className="max-w-2xl mx-auto">
        <ThermalPrinterSetupWizard cashierName={profile?.full_name || 'Receptionist'} />
      </div>
    </RoleLayout>
  );
}
