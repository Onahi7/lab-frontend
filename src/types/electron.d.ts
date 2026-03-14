export {};

interface PrintResult {
  success: boolean;
  error?: string;
  filePath?: string;
}

interface PrintOptions {
  copies?: number;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margins?: {
    marginType?: 'default' | 'none' | 'printableArea' | 'custom';
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  silent?: boolean;
  printerName?: string;
}

interface DiscoverResult {
  url: string;
  method: 'udp' | 'http-probe' | 'cached';
}

interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;

      // Network
      getOnlineStatus: () => Promise<boolean>;
      discoverBackend: () => Promise<DiscoverResult | null>;
      getLocalIPs: () => Promise<string[]>;
      setServerUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
      getServerUrl: () => Promise<string | null>;

      // Printing
      printSilent: (options?: PrintOptions) => Promise<PrintResult>;
      printWithDialog: () => Promise<PrintResult>;
      printHTML: (html: string, options?: PrintOptions) => Promise<PrintResult>;
      printToPDF: (options?: Partial<PrintOptions>) => Promise<PrintResult>;
      getPrinters: () => Promise<PrinterInfo[]>;
    };
  }
}
