/**
 * USB Printer Service — WebUSB connection management for the Xprinter XT-80P
 * (and any other USB Class 7 thermal printer).
 *
 * ⚠️  Windows note:
 * The Windows USB printer class driver (usbprint.sys) takes exclusive ownership
 * of the device, blocking WebUSB access.  Before using this service, you must
 * replace the driver with WinUSB using the Zadig tool:
 *   https://zadig.akeo.ie/
 * Select the printer, choose "WinUSB", click "Replace Driver".
 *
 * Only Chrome / Edge support the WebUSB API.
 */

const SAVED_DEVICE_KEY = 'thermal_printer_device';

export interface SavedDeviceInfo {
  vendorId: number;
  productId: number;
  serialNumber?: string;
  manufacturerName?: string;
  productName?: string;
}

class USBPrinterService {
  private device: USBDevice | null = null;
  private interfaceNumber: number | null = null;
  private endpointNumber: number | null = null;

  /** True if the browser supports the WebUSB API */
  get isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  /** True if a device is currently opened and claimed */
  get isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }

  /** Returns device info stored in localStorage from a previous pairing, or null */
  getSavedDevice(): SavedDeviceInfo | null {
    try {
      const raw = localStorage.getItem(SAVED_DEVICE_KEY);
      return raw ? (JSON.parse(raw) as SavedDeviceInfo) : null;
    } catch {
      return null;
    }
  }

  /**
   * Opens the browser USB device picker.
   * Requires a user gesture (button click).
   * Saves the paired device info to localStorage for auto-reconnect.
   */
  async requestAndConnect(): Promise<SavedDeviceInfo> {
    if (!this.isSupported) {
      throw new Error(
        'WebUSB is not supported in this browser. Use Chrome or Edge.'
      );
    }

    const device = await navigator.usb.requestDevice({ filters: [] });
    await this._openDevice(device);

    const info: SavedDeviceInfo = {
      vendorId: device.vendorId,
      productId: device.productId,
      serialNumber: device.serialNumber || undefined,
      manufacturerName: device.manufacturerName,
      productName: device.productName,
    };
    localStorage.setItem(SAVED_DEVICE_KEY, JSON.stringify(info));
    return info;
  }

  /**
   * Tries to silently reconnect the previously paired device.
   * Call this on app startup/page load.
   * Returns true if reconnect succeeded.
   */
  async autoConnect(): Promise<boolean> {
    if (this.isConnected) return true;
    if (!this.isSupported) return false;
    const saved = this.getSavedDevice();
    if (!saved) return false;

    try {
      const devices = await navigator.usb.getDevices();
      const matches = devices.filter(
        d => d.vendorId === saved.vendorId &&
          d.productId === saved.productId &&
          (!saved.serialNumber || d.serialNumber === saved.serialNumber)
      );
      if (matches.length !== 1) return false;
      const match = matches[0];

      await this._openDevice(match);
      if (!saved.serialNumber && match.serialNumber) {
        localStorage.setItem(SAVED_DEVICE_KEY, JSON.stringify({ ...saved, serialNumber: match.serialNumber }));
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Releases the interface, closes the device, and removes the pairing from
   * localStorage.
   */
  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        if (this.interfaceNumber !== null) {
          await this.device.releaseInterface(this.interfaceNumber);
        }
        await this.device.close();
      } catch {
        // Ignore errors on close
      }
      this.device = null;
    }
    this.interfaceNumber = null;
    this.endpointNumber = null;
    localStorage.removeItem(SAVED_DEVICE_KEY);
  }

  handleUsbDisconnect(device: USBDevice): boolean {
    if (this.device !== device) return false;
    this.device = null;
    this.interfaceNumber = null;
    this.endpointNumber = null;
    return true;
  }

  /**
   * Sends raw bytes to the printer via the bulk OUT endpoint.
   * Splits data into 64-byte chunks to avoid USB buffer overflows.
   */
  async print(data: Uint8Array): Promise<void> {
    if (!this.device || !this.device.opened) {
      throw new Error('Thermal printer is not connected.');
    }

    if (this.endpointNumber === null) {
      throw new Error(
        'No bulk OUT endpoint found. The device may not be a printer.'
      );
    }

    const CHUNK = 64;
    for (let offset = 0; offset < data.length; offset += CHUNK) {
      const result = await this.device.transferOut(this.endpointNumber, data.slice(offset, offset + CHUNK));
      if (result.status !== 'ok') throw new Error(`Printer USB transfer failed: ${result.status}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async _openDevice(device: USBDevice): Promise<void> {
    if (this.device === device && this.isConnected) return;
    try {
      if (!device.opened) await device.open();

      if (device.configuration === null) {
        const configuration = device.configurations[0];
        if (!configuration) throw new Error('USB device has no configuration.');
        await device.selectConfiguration(configuration.configurationValue);
      }

      const interfaces = device.configuration!.interfaces;
      const candidates = interfaces.map(iface => ({
        interfaceNumber: iface.interfaceNumber,
        interfaceClass: iface.alternate.interfaceClass,
        endpointNumber: iface.alternate.endpoints.find(ep => ep.direction === 'out' && ep.type === 'bulk')?.endpointNumber,
      })).filter(candidate => candidate.endpointNumber !== undefined);
      const selected = candidates.find(candidate => candidate.interfaceClass === 7) ?? candidates[0];
      if (!selected || selected.endpointNumber === undefined) {
        throw new Error('No printer bulk OUT endpoint found. Choose the thermal printer in the USB picker.');
      }

      await device.claimInterface(selected.interfaceNumber);
      this.device = device;
      this.interfaceNumber = selected.interfaceNumber;
      this.endpointNumber = selected.endpointNumber;
    } catch (err: unknown) {
      if (device.opened) await device.close().catch(() => {});
      const isDenied =
        (err instanceof DOMException && err.name === 'SecurityError') ||
        (err instanceof Error && /access denied|unable to claim|protected class/i.test(err.message));
      if (isDenied) {
        throw new Error(
          'ACCESS_DENIED: Windows is blocking WebUSB access to this printer.\n\n' +
          'You must replace the USB driver with WinUSB using the Zadig tool:\n' +
          '1. Download Zadig from https://zadig.akeo.ie/\n' +
          '2. Select your printer from the device list\n' +
          '3. Choose "WinUSB" as the driver\n' +
          '4. Click "Replace Driver" and wait for it to finish\n' +
          '5. Unplug and replug the printer, then try connecting again.'
        );
      }
      throw err;
    }
  }
}

// Singleton instance shared across the app
export const usbPrinterService = new USBPrinterService();
