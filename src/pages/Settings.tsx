import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Globe, 
  Shield, 
  Database, 
  Bell,
  Plug
} from 'lucide-react';

export default function Settings() {
  const settingsSections = [
    {
      id: 'organization',
      title: 'Organization',
      description: 'Laboratory name, address, and contact information',
      icon: Building2,
    },
    {
      id: 'interfaces',
      title: 'Interface Settings',
      description: 'HL7, ASTM, and FHIR protocol configuration',
      icon: Plug,
    },
    {
      id: 'network',
      title: 'Network',
      description: 'IP ranges, ports, and firewall settings',
      icon: Globe,
    },
    {
      id: 'security',
      title: 'Security',
      description: 'User roles, permissions, and audit settings',
      icon: Shield,
    },
    {
      id: 'database',
      title: 'Database',
      description: 'Backup, retention, and storage configuration',
      icon: Database,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Critical alerts, email, and SMS settings',
      icon: Bell,
    },
  ];

  return (
    <MainLayout title="Settings" subtitle="Configure system preferences">
      <div className="max-w-4xl">
        {/* Quick Settings */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Laboratory Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Laboratory Name</label>
              <Input defaultValue="Central Diagnostics Lab" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">License Number</label>
              <Input defaultValue="LAB-2024-001234" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">HL7 Facility ID</label>
              <Input defaultValue="CDL001" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Default Protocol</label>
              <Input defaultValue="HL7 v2.5.1" className="mt-1" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-4">
          {settingsSections.map(section => (
            <div 
              key={section.id}
              className="bg-card border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <section.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Protocol Support Info */}
        <div className="mt-6 bg-muted/50 border rounded-lg p-6">
          <h3 className="font-semibold mb-3">Supported Protocols & Manufacturers</h3>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-medium text-muted-foreground mb-2">Protocols</p>
              <ul className="space-y-1">
                <li>• HL7 v2.3.1, v2.5, v2.5.1</li>
                <li>• ASTM E1381, E1394</li>
                <li>• LIS2-A2 (CLSI)</li>
                <li>• FHIR R4</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground mb-2">Supported Analyzers</p>
              <ul className="space-y-1">
                <li>• ZYBIO (WX200, Z5, Z3)</li>
                <li>• Finecare (FIA Meter, FS-113)</li>
                <li>• Mindray (BC-5000, BS-240)</li>
                <li>• Sysmex (XN Series)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground mb-2">Test Categories</p>
              <ul className="space-y-1">
                <li>• Hematology</li>
                <li>• Clinical Chemistry</li>
                <li>• Immunoassay</li>
                <li>• Coagulation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
