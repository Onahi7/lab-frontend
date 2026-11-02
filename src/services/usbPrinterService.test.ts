// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

function device(serialNumber: string) {
  const printer = {
    vendorId: 123,
    productId: 456,
    serialNumber,
    opened: false,
    configuration: {
      interfaces: [{
        interfaceNumber: 2,
        alternate: {
          interfaceClass: 7,
          endpoints: [{ direction: 'out', type: 'bulk', endpointNumber: 3 }],
        },
      }],
    },
    open: vi.fn(async () => { printer.opened = true; }),
    close: vi.fn(async () => { printer.opened = false; }),
    claimInterface: vi.fn(async () => {}),
    releaseInterface: vi.fn(async () => {}),
    transferOut: vi.fn(async () => ({ status: 'ok' })),
  };
  return printer;
}

describe('usbPrinterService', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('reconnects the saved serial number and prints on its claimed endpoint', async () => {
    const first = device('FIRST');
    const saved = device('SAVED');
    Object.defineProperty(navigator, 'usb', {
      configurable: true,
      value: { getDevices: vi.fn(async () => [first, saved]) },
    });
    localStorage.setItem('thermal_printer_device', JSON.stringify({
      vendorId: 123, productId: 456, serialNumber: 'SAVED',
    }));
    const { usbPrinterService } = await import('./usbPrinterService');

    expect(await usbPrinterService.autoConnect()).toBe(true);
    await usbPrinterService.print(new Uint8Array([1, 2]));
    expect(first.open).not.toHaveBeenCalled();
    expect(saved.claimInterface).toHaveBeenCalledWith(2);
    expect(saved.transferOut).toHaveBeenCalledWith(3, new Uint8Array([1, 2]));
  });

  it('does not guess when two identical printers lack a saved serial number', async () => {
    const first = device('FIRST');
    const second = device('SECOND');
    Object.defineProperty(navigator, 'usb', {
      configurable: true,
      value: { getDevices: vi.fn(async () => [first, second]) },
    });
    localStorage.setItem('thermal_printer_device', JSON.stringify({ vendorId: 123, productId: 456 }));
    const { usbPrinterService } = await import('./usbPrinterService');

    expect(await usbPrinterService.autoConnect()).toBe(false);
    expect(first.open).not.toHaveBeenCalled();
    expect(second.open).not.toHaveBeenCalled();
  });
});
