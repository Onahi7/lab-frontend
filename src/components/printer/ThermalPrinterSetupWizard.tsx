import { useRef, useState } from 'react';
import { usePrinterContext } from '@/context/PrinterContext';
import { usbPrinterService } from '@/services/usbPrinterService';
import { buildReceiptESCPOS, type ReceiptData } from '@/utils/escpos';
import { ThermalReceipt } from '@/components/receipts/ThermalReceipt';
import { printThermalReceipt } from '@/services/browserThermalPrint';
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
      await printThermalReceipt(receiptRef.current.innerHTML);
      toast.success('Print dialog opened. Choose your receipt printer and click Print.');
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) ?? 'Failed to open print dialog');
    } finally {
      setTestPrinting(false);
    }
  };

  return (
    <Card>
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
              <CardTitle className="text-base">Browser print dialog</CardTitle>
              <Badge variant="secondary" className="text-xs">Fallback</Badge>
            </div>
            <CardDescription>
              Uses a receipt printer installed in Windows
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* How to start */}
        <Alert>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription>
            <strong>How to start:</strong> Plug in the receipt printer and switch it on. Then click{' '}
            <strong>Print Test Receipt</strong> and choose it from the printer list. If it is missing,
            follow the setup steps below.
          </AlertDescription>
        </Alert>

        {/* 80 mm paper tip */}
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>First time using this printer?</strong> When the print dialog opens, set{' '}
            <strong>Paper size</strong> to <strong>80 mm roll</strong> (sometimes listed as "Receipt",
            "POS-80", or "Roll Paper 80×297 mm"). Check this setting again if you change printers.
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
          <span className="text-sm text-muted-foreground">No connection step inside the app</span>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="windows-driver">
            <AccordionTrigger>Printer missing from the list?</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Open Windows Settings, then Printers &amp; scanners.</li>
                <li>Choose Add device and select the receipt printer if it appears.</li>
                <li>If it does not appear, install the Windows driver for the exact printer model from its manufacturer or supplier, then try Add device again.</li>
                <li>Print a Windows test page first. Then return here and print a test receipt.</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-3">
                Zadig is only for advanced direct USB mode. It does not install a Windows printer driver.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Everyday settings */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-sm font-medium">Printing options</p>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
            <div className="space-y-0.5">
              <Label htmlFor="thermal-auto" className="text-sm font-medium">
                Print receipt after payment
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically sends the receipt to the saved USB printer when payment is confirmed
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
              <CardTitle className="text-base">USB receipt printer</CardTitle>
              <Badge className="bg-green-600 text-xs">Automatic printing</Badge>
              {thermalConnected && (
                <Badge className="bg-green-600 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Set up once on this computer, then receipts print without a dialog
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
            <span>Saved printer: {deviceLabel}{!thermalConnected && ' (waiting to reconnect)'}</span>
          </div>
        )}

        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Plug in the thermal printer, turn it on, and load the paper.</li>
          <li>On this Windows computer, use Zadig below to set its USB driver to WinUSB.</li>
          <li>Open this site in Chrome or Edge, then click Connect Printer and choose the thermal printer.</li>
          <li>Click Silent Test Print. The printer choice is saved for this browser on this computer.</li>
        </ol>

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
              Print receipts through this USB printer
            </Label>
            <p className="text-xs text-muted-foreground">
              When on, receipts use the saved printer. If it is unavailable, the browser print dialog opens.
            </p>
          </div>
          <Switch
            id="silent-enabled"
            checked={settings.thermal.mode === 'direct-usb'}
            onCheckedChange={(checked) => updateThermalSettings({ mode: checked ? 'direct-usb' : 'standard' })}
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
                  : 'One-time Windows setup: Zadig and WinUSB'}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                <p>
                  Windows reserves the USB printer for itself, which blocks silent printing. The free{' '}
                  <strong>Zadig</strong> tool swaps the driver for a web-compatible one.{' '}
                  <strong>This only needs to be done once per computer.</strong> Windows may ask for an administrator password.
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
                  <li>Choose the exact <strong>Xprinter</strong> model from the device list. Do not select another USB device.</li>
                  <li>In the box on the right, make sure it says <strong>WinUSB</strong>.</li>
                  <li>Click <strong>Replace Driver</strong> and wait (~30 seconds).</li>
                  <li>Unplug and re-plug the USB cable, then click <strong>Connect Printer</strong> above.</li>
                </ol>

                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    After this step, the Xprinter may no longer appear as a Windows printer. This website
                    can use it after you select it in Chrome or Edge. If browser permissions or site data
                    are cleared, click Connect Printer again.
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
 * - Direct USB: remembers the selected WebUSB printer after the one-time WinUSB setup.
 * - Browser print dialog: fallback for an installed system printer.
 */
export function ThermalPrinterSetupWizard({ cashierName = 'Staff' }: ThermalPrinterSetupWizardProps) {
  const { settings, updateThermalSettings } = usePrinterContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Receipt Printer Setup</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect the thermal printer once. This browser will reconnect and print receipts automatically
          while the printer is available.
        </p>
      </div>

      <AdvancedSilentSection
        settings={settings}
        updateThermalSettings={updateThermalSettings}
        cashierName={cashierName}
      />

      <Accordion type="single" collapsible>
        <AccordionItem value="fallback">
          <AccordionTrigger>Use a Windows printer instead</AccordionTrigger>
          <AccordionContent>
            <StandardPrinterSection
              settings={settings}
              updateThermalSettings={updateThermalSettings}
              cashierName={cashierName}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
