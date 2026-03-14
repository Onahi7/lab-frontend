import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usbPrinterService, type SavedDeviceInfo } from '@/services/usbPrinterService';
import { settingsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ── Settings types ────────────────────────────────────────────────────────────

export interface ThermalPrinterSettings {
  /** Whether the thermal receipt path is active */
  enabled: boolean;
  /** 1 = patient copy only, 2 = patient + lab copy */
  copies: 1 | 2;
  /** Automatically print as soon as payment is confirmed */
  autoPrintOnPayment: boolean;
}

export interface A4PrinterSettings {
  /** Whether the A4 result report path is active */
  enabled: boolean;
  /** Number of copies (informational — set in browser print dialog) */
  copies: number;
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  /** Automatically print result report when results are verified */
  autoPrintOnResult: boolean;
}

export interface PrinterSettings {
  thermal: ThermalPrinterSettings;
  a4: A4PrinterSettings;
}

const DEFAULT_SETTINGS: PrinterSettings = {
  thermal: {
    enabled: true,
    copies: 2,
    autoPrintOnPayment: true,
  },
  a4: {
    enabled: true,
    copies: 1,
    paperSize: 'A4',
    orientation: 'portrait',
    autoPrintOnResult: false,
  },
};

const SETTINGS_KEY = 'printer_settings_v1';

function loadSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PrinterSettings>;
    return {
      thermal: { ...DEFAULT_SETTINGS.thermal, ...parsed.thermal },
      a4: { ...DEFAULT_SETTINGS.a4, ...parsed.a4 },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

export interface PrinterContextValue {
  settings: PrinterSettings;
  /** Partially update thermal or a4 settings */
  updateThermalSettings: (patch: Partial<ThermalPrinterSettings>) => void;
  updateA4Settings: (patch: Partial<A4PrinterSettings>) => void;

  /** Info about the paired USB thermal printer (null if none) */
  thermalDevice: SavedDeviceInfo | null;
  /** True when the USB device is opened and claimed */
  thermalConnected: boolean;
  /** Whether the browser supports WebUSB */
  webUsbSupported: boolean;

  /** Triggers the browser USB picker and pairs the chosen device */
  connectThermalPrinter: () => Promise<void>;
  /** Releases claim, closes device, removes pairing */
  disconnectThermalPrinter: () => Promise<void>;
}

const PrinterContext = createContext<PrinterContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function PrinterProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<PrinterSettings>(loadSettings);
  const [thermalDevice, setThermalDevice] = useState<SavedDeviceInfo | null>(
    () => usbPrinterService.getSavedDevice()
  );
  const [thermalConnected, setThermalConnected] = useState(false);
  const [webUsbSupported] = useState(() => usbPrinterService.isSupported);

  // Attempt silent reconnect on mount
  useEffect(() => {
    usbPrinterService.autoConnect().then(connected => {
      setThermalConnected(connected);
      if (connected) setThermalDevice(usbPrinterService.getSavedDevice());
    });
  }, []);

  // Sync printer settings from backend when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    settingsAPI.getPrinterSettings().then(remote => {
      if (!remote) return;
      const merged: PrinterSettings = {
        thermal: { ...DEFAULT_SETTINGS.thermal, ...remote.thermal },
        a4: { ...DEFAULT_SETTINGS.a4, ...remote.a4 },
      };
      setSettings(merged);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    }).catch(() => {
      // Offline — keep localStorage value
    });
  }, [isAuthenticated]);

  const persist = useCallback((next: PrinterSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  const updateThermalSettings = useCallback(
    (patch: Partial<ThermalPrinterSettings>) => {
      setSettings(prev => {
        const next: PrinterSettings = {
          ...prev,
          thermal: { ...prev.thermal, ...patch },
        };
        persist(next);
        settingsAPI.updatePrinterSettings({ thermal: next.thermal }).catch(() => {});
        return next;
      });
    },
    [persist]
  );

  const updateA4Settings = useCallback(
    (patch: Partial<A4PrinterSettings>) => {
      setSettings(prev => {
        const next: PrinterSettings = {
          ...prev,
          a4: { ...prev.a4, ...patch },
        };
        persist(next);
        settingsAPI.updatePrinterSettings({ a4: next.a4 }).catch(() => {});
        return next;
      });
    },
    [persist]
  );

  const connectThermalPrinter = useCallback(async () => {
    const info = await usbPrinterService.requestAndConnect();
    setThermalDevice(info);
    setThermalConnected(true);
  }, []);

  const disconnectThermalPrinter = useCallback(async () => {
    await usbPrinterService.disconnect();
    setThermalDevice(null);
    setThermalConnected(false);
  }, []);

  return (
    <PrinterContext.Provider
      value={{
        settings,
        updateThermalSettings,
        updateA4Settings,
        thermalDevice,
        thermalConnected,
        webUsbSupported,
        connectThermalPrinter,
        disconnectThermalPrinter,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePrinterContext(): PrinterContextValue {
  const ctx = useContext(PrinterContext);
  if (!ctx) {
    throw new Error('usePrinterContext must be used inside <PrinterProvider>');
  }
  return ctx;
}
