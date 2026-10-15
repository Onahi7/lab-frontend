import { useRef, useState } from 'react';
import { usePrinterContext } from '@/context/PrinterContext';
import { usbPrinterService } from '@/services/usbPrinterService';
import { buildReceiptESCPOS, type ReceiptData } from '@/utils/escpos';
import { ThermalReceipt, thermalPrintStyles } from '@/components/receipts/ThermalReceipt';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Printer,
  Usb,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TestTube2,
  MousePointerClick,
  ShieldCheck,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

const ZADIG_URL = 'https://zadig.akeo.ie/';

interface ThermalPrinterSetupWizardProps {
  /** Name shown on the test receipt (e.g. logged-in staff name) */
  cashierName?: string;
}

// ── Shared test receipt data ────────────────────────────────────────────────

function buildTestReceiptData(cashier: string): ReceiptData {
  return {
    receiptNumber: 'RCP-TEST-001',
    orderNumber: 'ORD-TEST-001',
    patientName: 'Test Patient',
    patientId: 'LAB-TEST-001',
    patientPhone: '+232 75 000000',
    tests: [
      { code: 'CBC', name: 'Complete Blood Count', price: 50000 },
      { code: 'LFT', name: 'Liver Function Test', price: 75000 },
    ],
    subtotal: 125000,
    discount: 10,
    discountType: 'percentage' as const,
    total: 112500,
    amountPaid: 120000,
    paymentMethod: 'cash' as const,
    paymentDate: new Date().toISOString(),
    cashier,
  };
}

/** Opens a print popup from a hidden DOM element (same approach as useThermalPrint) */
async function printElementAsBrowserReceipt(element: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const html = `<html><head><title>Test Receipt</title><style>${thermalPrintStyles}</style></head><body>${element.innerHTML}</body></html>`;

    // Electron: silent print via IPC
    if ((window as unknown as { electronAPI?: { isElectron?: boolean; printHTML?: (html: string, opts: object) => Promise<{ success: boolean; error?: string }> } }).electronAPI?.isElectron) {
      const printFn = (window as unknown as { electronAPI: { printHTML: (html: string, opts: object) => Promise<{ success: boolean; error?: string }> } }).electronAPI.printHTML;
      printFn(html, { copies: 1, silent: true })
        .then(result => result.success ? resolve() : reject(new Error(result.error ?? 'Silent print failed')))
        .catch(reject);
      return;
    }

    // Browser: popup window
    const win = window.open('', '', 'width=302,height=600');
    if (!win) { reject(new Error('Pop-up blocked — allow pop-ups for this site')); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => { win.close(); resolve(); }, 500);
    }, 250);
  });
}

// ── Standard Printer section ───────────────────────────────────────────────

function StandardPrinterSection({
  settings,
  updateThermalSettings,
  cashierName,
}: {
  settings: ReturnType<typeof usePrinterContext>['settings'];
  updateThermalSettings: ReturnType<typeof usePrinterContext>['updateThermalSettings'];
  cashierName: string;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [testPrinting, setTestPrinting] = useState(false);
  const receiptData = buildTestReceiptData(cashierName);

  const handleTestPrint = async () => {
    if (!receiptRef.current) { toast.error('Receipt element not ready'); return; }
    setTestPrinting(true);
    try {
      await printElementAsBrowserReceipt(receiptRef.current);
      toast.success('Print dialog opened — choose your receipt printer and click Print.');
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) ?? 'Failed to open print dialog');
    } finally {
      setTestPrinting(false);
    }
  };

  return (
    <Card className="border-green-200">
      {/* Hidden receipt DOM node used for printing */}
      <div className="hidden">
        <div ref={receiptRef}>
          <ThermalReceipt data={receiptData} copyType="patient" />
        </div>
      </div>

      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Printer className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">Standard Printer</CardTitle>
              <Badge className="bg-green-600 text-xs">Recommended</Badge>
            </div>
            <CardDescription>
              Works with any receipt printer already installed on this computer — no extra software needed
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* How to start */}
        <Alert>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription>
            <strong>How to start:</strong> Plug the receipt printer into this computer with the USB cable
            and switch it on. Windows will detect it automatically. Then click{' '}
            <strong>Print Test Receipt</strong> below and select the printer from the list.
          </AlertDescription>
        </Alert>

        {/* 80 mm paper tip */}
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>First time using this printer?</strong> When the print dialog opens, set{' '}
            <strong>Paper size</strong> to <strong>80 mm roll</strong> (sometimes listed as "Receipt",
            "POS-80", or "Roll Paper 80×297 mm"). You only need to do this once — the browser
            will remember it.
          </AlertDescription>
        </Alert>

        {/* Test button — always enabled */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={handleTestPrint} disabled={testPrinting}>
            {testPrinting ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Opening…</>
            ) : (
              <><TestTube2 className="w-4 h-4 mr-2" />Print Test Receipt</>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">Always available — no connection step needed</span>
        </div>

        {/* Everyday settings */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-sm font-medium">Printing options</p>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
            <div className="space-y-0.5">
              <Label htmlFor="thermal-auto" className="text-sm font-medium">
                Open print dialog after payment
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically opens the print dialog when payment is confirmed
              </p>
            </div>
            <Switch
              id="thermal-auto"
              checked={settings.thermal.autoPrintOnPayment}
              onCheckedChange={(checked) => updateThermalSettings({ autoPrintOnPayment: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Number of copies</Label>
              <p className="text-xs text-muted-foreground">
                1 = patient copy only · 2 = patient + lab copy
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={settings.thermal.copies === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateThermalSettings({ copies: 1 })}
              >
                1
              </Button>
              <Button
                variant={settings.thermal.copies === 2 ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateThermalSettings({ copies: 2 })}
              >
                2
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Advanced / Silent USB section ──────────────────────────────────────────

function AdvancedSilentSection({
  settings,
  updateThermalSettings,
  cashierName,
}: {
  settings: ReturnType<typeof usePrinterContext>['settings'];
  updateThermalSettings: ReturnType<typeof usePrinterContext>['updateThermalSettings'];
  cashierName: string;
}) {
  const {
    thermalDevice,
    thermalConnected,
    webUsbSupported,
    connectThermalPrinter,
    disconnectThermalPrinter,
  } = usePrinterContext();

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [driverBlocked, setDriverBlocked] = useState(false);

  const deviceLabel = thermalDevice
    ? thermalDevice.productName
      ? `${thermalDevice.productName} (${thermalDevice.manufacturerName ?? ''})`.trim()
      : `VID:${thermalDevice.vendorId.toString(16).toUpperCase().padStart(4, '0')}`
    : null;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectThermalPrinter();
      setDriverBlocked(false);
      toast.success('Printer connected! Print a test receipt to confirm.');
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : null) ?? 'Failed to connect printer';
      if (msg.includes('No device selected') || msg.includes('No device chosen')) {
        toast.info('No printer was picked. Click "Connect Printer" again and choose your Xprinter.');
      } else if (msg.startsWith('ACCESS_DENIED')) {
        setDriverBlocked(true);
        toast.error(
          'Windows is blocking the printer — the Zadig driver setup (below) has not been done yet.',
          { duration: 8000 },
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectThermalPrinter();
      setDriverBlocked(false);
      toast.success('Printer disconnected.');
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) ?? 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    try {
      if (!usbPrinterService.isConnected) {
        const ok = await usbPrinterService.autoConnect();
        if (!ok) throw new Error('Printer is not connected — use the Connect button first.');
      }
      const bytes = buildReceiptESCPOS(buildTestReceiptData(cashierName), 'patient');
      await usbPrinterService.print(bytes);
      toast.success('Test receipt printed silently — setup is complete!');
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : null) ?? 'Test print failed';
      if (msg.startsWith('ACCESS_DENIED')) {
        setDriverBlocked(true);
        toast.error('Windows blocked the printer — complete the Zadig setup below first.', {
          duration: 8000,
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setTestPrinting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Settings2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">Silent Direct USB Mode</CardTitle>
              <Badge variant="secondary" className="text-xs">IT / Admin only</Badge>
              {thermalConnected && (
                <Badge className="bg-green-600 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Prints receipts automatically without any dialog — requires a one-time IT setup per computer
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!webUsbSupported && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Silent mode requires <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
              Switch to one of these browsers to use this mode.
            </AlertDescription>
          </Alert>
        )}

        {deviceLabel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
            <Printer className="w-4 h-4 shrink-0" />
            <span>{deviceLabel}</span>
          </div>
        )}

        {/* Connect / Disconnect */}
        <div className="flex flex-wrap gap-2">
          {!thermalConnected ? (
            <Button onClick={handleConnect} disabled={!webUsbSupported || connecting}>
              {connecting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Waiting for you to pick…</>
              ) : (
                <><MousePointerClick className="w-4 h-4 mr-2" />Connect Printer</>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Disconnecting…</>
              ) : (
                <><XCircle className="w-4 h-4 mr-2" />Disconnect</>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleTestPrint}
            disabled={testPrinting || !thermalConnected}
            title={!thermalConnected ? 'Connect the printer first' : 'Send a silent test receipt'}
          >
            {testPrinting ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Printing…</>
            ) : (
              <><TestTube2 className="w-4 h-4 mr-2" />Silent Test Print</>
            )}
          </Button>
        </div>

        {/* Enable / disable silent mode */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
          <div className="space-y-0.5">
            <Label htmlFor="silent-enabled" className="text-sm font-medium">
              Use silent mode for receipts
            </Label>
            <p className="text-xs text-muted-foreground">
              When on, receipts skip the print dialog entirely. When off, falls back to standard mode.
            </p>
          </div>
          <Switch
            id="silent-enabled"
            checked={settings.thermal.enabled}
            onCheckedChange={(checked) => updateThermalSettings({ enabled: checked })}
          />
        </div>

        {/* Zadig accordion */}
        <Accordion type="single" collapsible>
          <AccordionItem value="zadig">
            <AccordionTrigger
              className={`text-sm ${driverBlocked ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              <span className="flex items-center gap-2">
                {driverBlocked ? (
                  <ShieldCheck className="w-4 h-4 text-destructive" />
                ) : (
                  <Usb className="w-4 h-4" />
                )}
                {driverBlocked
                  ? 'Action needed — run Zadig driver setup first'
                  : 'One-time setup: Zadig USB driver (IT admin, once per computer)'}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                <p>
                  Windows reserves the USB printer for itself, which blocks silent printing. The free{' '}
                  <strong>Zadig</strong> tool swaps the driver for a web-compatible one.{' '}
                  <strong>This only needs to be done once per computer</strong> by an IT admin.
                </p>

                {driverBlocked && (
                  <Alert variant="destructive">
                    <ShieldCheck className="w-4 h-4" />
                    <AlertDescription>
                      Windows is still blocking the printer — this step hasn't been completed yet.
                      Work through the steps below, then click <strong>Connect Printer</strong> again.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(ZADIG_URL, '_blank', 'noopener,noreferrer');
                    toast.info('Zadig download page opened — follow the steps below.');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Zadig (free)
                </Button>

                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>Plug the Xprinter into this computer via USB and power it on.</li>
                  <li>Open the Zadig file you just downloaded.</li>
                  <li>In Zadig, click <strong>Options → List All Devices</strong>.</li>
                  <li>Choose your <strong>Xprinter</strong> from the big dropdown.</li>
                  <li>In the box on the right, make sure it says <strong>WinUSB</strong>.</li>
                  <li>Click <strong>Replace Driver</strong> and wait (~30 seconds).</li>
                  <li>Unplug and re-plug the USB cable, then click <strong>Connect Printer</strong> above.</li>
                </ol>

                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    After this step, the Xprinter will no longer appear in Windows Printers & Scanners —
                    that is expected. Only this app uses it, which is what makes printing fully automatic.
                  </AlertDescription>
                </Alert>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ── Main exported component ─────────────────────────────────────────────────

/**
 * Thermal printer setup with two modes:
 * - Standard (default): works with any installed Windows printer via the browser print dialog — no Zadig required.
 * - Silent Direct USB (advanced): bypasses all dialogs via WebUSB + Zadig — one-time IT setup per computer.
 */
export function ThermalPrinterSetupWizard({ cashierName = 'Staff' }: ThermalPrinterSetupWizardProps) {
  const { settings, updateThermalSettings } = usePrinterContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Receipt Printer Setup</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Most staff should use <strong>Standard Printer</strong> — just plug in and print.{' '}
          Silent mode is for IT staff who want receipts to print with zero pop-ups.
        </p>
      </div>

      {/* Mode 1: Standard — plug & play */}
      <StandardPrinterSection
        settings={settings}
        updateThermalSettings={updateThermalSettings}
        cashierName={cashierName}
      />

      {/* Mode 2: Silent USB — IT only */}
      <AdvancedSilentSection
        settings={settings}
        updateThermalSettings={updateThermalSettings}
        cashierName={cashierName}
      />
    </div>
  );
}
