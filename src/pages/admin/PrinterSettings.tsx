import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { usePrinterContext } from '@/context/PrinterContext';
import { ThermalPrinterSetupWizard } from '@/components/printer/ThermalPrinterSetupWizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  RefreshCw,
  TestTube2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Component ──────────────────────────────────────────────────────────────

export default function PrinterSettings() {
  const { profile } = useAuth();
  const { settings, updateA4Settings } = usePrinterContext();

  const [testPrintingA4, setTestPrintingA4] = useState(false);

  // ── A4 printer actions ───────────────────────────────────────────────────

  const handleA4TestPrint = () => {
    setTestPrintingA4(true);
    // Inject dynamic @page rule based on current settings and open print dialog
    const styleId = '__a4_test_print_style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      @media print {
        @page {
          size: ${settings.a4.paperSize} ${settings.a4.orientation};
          margin: 10mm;
        }
        body * { visibility: hidden; }
        #a4-test-content, #a4-test-content * { visibility: visible; }
        #a4-test-content { position: fixed; top: 0; left: 0; width: 100%; }
      }
    `;

    // Show a simple test print page in a popup
    const win = window.open('', '_blank', 'width=794,height=1123');
    if (!win) {
      toast.error('Popup blocked. Please allow popups for this site.');
      setTestPrintingA4(false);
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>A4 Test Print – ${format(new Date(), 'dd/MM/yyyy HH:mm')}</title>
          <style>
            @page { size: ${settings.a4.paperSize} ${settings.a4.orientation}; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; }
            h1 { font-size: 20pt; border-bottom: 2px solid #000; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; }
            .footer { margin-top: 40px; font-size: 9pt; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <h1>HARBOUR LABORATORY</h1>
          <p><strong>A4 Printer Test Page</strong></p>
          <p>Paper: ${settings.a4.paperSize} &nbsp;|&nbsp; Orientation: ${settings.a4.orientation}</p>
          <p>Printed: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          <table>
            <thead>
              <tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Flag</th></tr>
            </thead>
            <tbody>
              <tr><td>Haemoglobin</td><td>13.5 g/dL</td><td>12.0 – 17.5</td><td>Normal</td></tr>
              <tr><td>WBC Count</td><td>9.2 × 10³/µL</td><td>4.0 – 11.0</td><td>Normal</td></tr>
              <tr><td>ALT</td><td>45 U/L</td><td>7 – 40</td><td style="color:red">High</td></tr>
            </tbody>
          </table>
          <p class="footer">This is a test print — HARBOUR Diagnostics, Freetown Sierra Leone</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => {
        win.close();
        setTestPrintingA4(false);
        toast.success('A4 test print dialog opened');
      }, 500);
    }, 300);
  };

  return (
    <RoleLayout
      title="Printer Configuration"
      subtitle="Configure receipt and report printers for this computer"
      role="admin"
      userName={profile?.full_name}
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Thermal Receipt Printer: guided setup ────────────────────── */}
        <ThermalPrinterSetupWizard cashierName={profile?.full_name || 'Admin'} />

        {/* ── A4 Result Report Printer ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>A4 Result Report Printer</CardTitle>
                <CardDescription>Lab result reports · uses browser print dialog</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="space-y-4">
              {/* Enable */}
              <div className="flex items-center justify-between">
                <Label htmlFor="a4-enabled" className="flex flex-col gap-1">
                  <span>Enable A4 printing</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Shows print button on result report pages
                  </span>
                </Label>
                <Switch
                  id="a4-enabled"
                  checked={settings.a4.enabled}
                  onCheckedChange={v => updateA4Settings({ enabled: v })}
                />
              </div>

              {/* Paper size */}
              <div className="flex items-center justify-between">
                <Label htmlFor="a4-paper">Paper size</Label>
                <Select
                  value={settings.a4.paperSize}
                  onValueChange={v => updateA4Settings({ paperSize: v as 'A4' | 'Letter' })}
                >
                  <SelectTrigger id="a4-paper" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210×297 mm)</SelectItem>
                    <SelectItem value="Letter">Letter (8.5×11 in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Orientation */}
              <div className="flex items-center justify-between">
                <Label htmlFor="a4-orientation">Orientation</Label>
                <Select
                  value={settings.a4.orientation}
                  onValueChange={v =>
                    updateA4Settings({ orientation: v as 'portrait' | 'landscape' })
                  }
                >
                  <SelectTrigger id="a4-orientation" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Copies (informational) */}
              <div className="flex items-center justify-between">
                <Label htmlFor="a4-copies" className="flex flex-col gap-1">
                  <span>Default copies</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Reference only — set final count in the browser print dialog
                  </span>
                </Label>
                <Select
                  value={String(settings.a4.copies)}
                  onValueChange={v => updateA4Settings({ copies: Number(v) })}
                >
                  <SelectTrigger id="a4-copies" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? 'copy' : 'copies'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-print */}
              <div className="flex items-center justify-between">
                <Label htmlFor="a4-auto" className="flex flex-col gap-1">
                  <span>Auto-print on result verification</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Opens print dialog automatically when a result is verified
                  </span>
                </Label>
                <Switch
                  id="a4-auto"
                  checked={settings.a4.autoPrintOnResult}
                  onCheckedChange={v => updateA4Settings({ autoPrintOnResult: v })}
                />
              </div>
            </div>

            {/* Test print */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                onClick={handleA4TestPrint}
                disabled={testPrintingA4}
              >
                {testPrintingA4 ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Opening…</>
                ) : (
                  <><TestTube2 className="w-4 h-4 mr-2" />Test Print (A4)</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Opens a sample result report in a new window with the configured
                paper size and orientation. Select your A4 printer in the browser
                print dialog.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </RoleLayout>
  );
}
