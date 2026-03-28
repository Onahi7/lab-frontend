import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { printService, PrintMethod } from '@/services/printService';
import { Printer, Usb, Globe, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PrinterSettings() {
  const [printMethod, setPrintMethod] = useState<PrintMethod>('auto');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSerialSupported, setIsSerialSupported] = useState(false);

  useEffect(() => {
    // Load saved preference
    const saved = printService.getPreferredMethod();
    setPrintMethod(saved);
    
    // Check if Web Serial is supported
    setIsSerialSupported(printService.isSerialSupported());
    
    // Check connection status
    setIsConnected(printService.isSerialPrinterConnected());
  }, []);

  const handleMethodChange = (method: PrintMethod) => {
    setPrintMethod(method);
    printService.setPreferredMethod(method);
    toast.success(`Print method set to: ${method}`);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await printService.connectSerialPrinter();
      setIsConnected(success);
      
      if (success) {
        toast.success('Connected to thermal printer');
      } else {
        toast.error('Failed to connect to printer');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to printer');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await printService.disconnectSerialPrinter();
      setIsConnected(false);
      toast.success('Disconnected from printer');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const success = await printService.testPrinter();
      
      if (success) {
        toast.success('Test print sent successfully');
      } else {
        toast.error('Test print failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Test print failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenDrawer = async () => {
    try {
      const success = await printService.openCashDrawer();
      
      if (success) {
        toast.success('Cash drawer opened');
      } else {
        toast.error('Failed to open cash drawer');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to open cash drawer');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Receipt Printer Settings
          </CardTitle>
          <CardDescription>
            Configure your XPrinter 80mm thermal printer for receipt printing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Support Alert */}
          {!isSerialSupported && (
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> Direct printer connection (Web Serial API) is not supported in this browser.
                Please use Chrome, Edge, or Opera for direct printing. Browser print dialog will be used as fallback.
              </AlertDescription>
            </Alert>
          )}

          {/* Print Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="print-method">Print Method</Label>
            <Select value={printMethod} onValueChange={handleMethodChange}>
              <SelectTrigger id="print-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <span>Auto (Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="serial" disabled={!isSerialSupported}>
                  <div className="flex items-center gap-2">
                    <Usb className="w-4 h-4" />
                    <span>Direct USB/Serial</span>
                  </div>
                </SelectItem>
                <SelectItem value="browser">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Browser Print Dialog</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {printMethod === 'auto' && 'Tries direct printing first, falls back to browser dialog'}
              {printMethod === 'serial' && 'Direct ESC/POS printing via USB/Serial (fastest)'}
              {printMethod === 'browser' && 'Uses standard browser print dialog'}
            </p>
          </div>

          {/* Connection Status */}
          {isSerialSupported && (printMethod === 'auto' || printMethod === 'serial') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Printer Connection</Label>
                <Badge variant={isConnected ? 'default' : 'secondary'} className="flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      Not Connected
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex gap-2">
                {!isConnected ? (
                  <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
                    {isConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Usb className="w-4 h-4 mr-2" />
                    Connect Printer
                  </Button>
                ) : (
                  <Button onClick={handleDisconnect} variant="outline" className="flex-1">
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Test Actions */}
          <div className="space-y-2">
            <Label>Test Printer</Label>
            <div className="flex gap-2">
              <Button 
                onClick={handleTest} 
                disabled={isTesting || (!isConnected && printMethod === 'serial')}
                variant="outline"
                className="flex-1"
              >
                {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Printer className="w-4 h-4 mr-2" />
                Print Test Receipt
              </Button>
              
              {isConnected && (
                <Button 
                  onClick={handleOpenDrawer}
                  variant="outline"
                >
                  Open Drawer
                </Button>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Setup Instructions</Label>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>For Direct USB/Serial Printing:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Connect your XPrinter 80mm to USB port</li>
                <li>Click "Connect Printer" button above</li>
                <li>Select your printer from the browser dialog</li>
                <li>Click "Print Test Receipt" to verify</li>
              </ol>
              
              <p className="mt-3"><strong>For Browser Print Dialog:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Set print method to "Browser Print Dialog"</li>
                <li>Configure your printer in Windows/System settings</li>
                <li>Set paper size to 80mm (3.15 inches) width</li>
                <li>When printing, select your thermal printer</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
