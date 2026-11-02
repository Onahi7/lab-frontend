// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThermalPrint } from './useThermalPrint';
import type { ReceiptData } from '@/utils/escpos';

const mocks = vi.hoisted(() => ({
  browserPrint: vi.fn(),
  autoConnect: vi.fn(),
  usbPrint: vi.fn(),
  mode: 'standard' as 'standard' | 'direct-usb',
  copies: 1 as 1 | 2,
}));

vi.mock('@/context/PrinterContext', () => ({
  usePrinterContext: () => ({
    settings: { thermal: { mode: mocks.mode, copies: mocks.copies } },
    thermalConnected: false,
    qzTrayConnected: false,
  }),
}));
vi.mock('@/services/browserThermalPrint', () => ({ printBothReceiptCopies: mocks.browserPrint }));
vi.mock('@/services/usbPrinterService', () => ({
  usbPrinterService: { isConnected: false, autoConnect: mocks.autoConnect, print: mocks.usbPrint },
}));
vi.mock('@/services/qzTrayService', () => ({ qzTrayService: {} }));
vi.mock('@/utils/escpos', () => ({ buildReceiptESCPOS: () => new Uint8Array([1]) }));

describe('useThermalPrint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mode = 'standard';
    mocks.copies = 1;
    mocks.browserPrint.mockResolvedValue({ success: true, printedCount: 1 });
    mocks.autoConnect.mockResolvedValue(true);
    mocks.usbPrint.mockResolvedValue(undefined);
  });

  it('uses the installed printer path and requested copy count in standard mode', async () => {
    const patient = document.createElement('div');
    const lab = document.createElement('div');
    const { result } = renderHook(() => useThermalPrint());

    await expect(result.current.printBothCopies(patient, lab, 'RCP-1', {} as ReceiptData))
      .resolves.toEqual({ success: true, printedCount: 1 });
    expect(mocks.browserPrint).toHaveBeenCalledWith(patient, lab, 1);
    expect(mocks.autoConnect).not.toHaveBeenCalled();
    expect(mocks.usbPrint).not.toHaveBeenCalled();
  });

  it('prints directly to the paired USB printer in direct mode', async () => {
    mocks.mode = 'direct-usb';
    mocks.copies = 2;
    const { result } = renderHook(() => useThermalPrint());

    await expect(result.current.printBothCopies(null, null, 'RCP-2', {} as ReceiptData))
      .resolves.toEqual({ success: true, printedCount: 2 });
    expect(mocks.autoConnect).toHaveBeenCalledOnce();
    expect(mocks.usbPrint).toHaveBeenCalledTimes(2);
    expect(mocks.browserPrint).not.toHaveBeenCalled();
  });
});
