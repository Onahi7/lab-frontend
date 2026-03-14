import { useCallback } from 'react';
import { thermalPrintStyles } from '@/components/receipts/ThermalReceipt';
import { usePrinterContext } from '@/context/PrinterContext';
import { usbPrinterService } from '@/services/usbPrinterService';
import { buildReceiptESCPOS, type ReceiptData } from '@/utils/escpos';

interface PrintOptions {
  title: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useThermalPrint = () => {
  const { settings, thermalConnected } = usePrinterContext();

  // ── ESC/POS path (WebUSB) ──────────────────────────────────────────────

  /**
   * Sends a receipt directly to the USB thermal printer using raw ESC/POS.
   * Does NOT open any browser dialog.
   */
  const printReceiptESCPOS = useCallback(
    async (data: ReceiptData, copyType: 'patient' | 'lab'): Promise<void> => {
      const bytes = buildReceiptESCPOS(data, copyType);
      await usbPrinterService.print(bytes);
    },
    []
  );

  // ── Print fallback (Electron native or browser popup) ────────────────

  /**
   * Renders the DOM element and prints it.
   * - Electron: uses native silent print in a hidden window (no dialog)
   * - Browser: falls back to popup window + window.print()
   */
  const printReceipt = useCallback(
    (element: HTMLElement | null, options: PrintOptions): Promise<void> => {
      return new Promise(async (resolve, reject) => {
        if (!element) {
          const error = new Error('Receipt element not found');
          options.onError?.(error);
          reject(error);
          return;
        }

        const html = `<html><head><title>${options.title}</title><style>${thermalPrintStyles}</style></head><body>${element.innerHTML}</body></html>`;

        // Electron path: silent print via IPC (no popup, no dialog)
        if (window.electronAPI?.printHTML) {
          try {
            const result = await window.electronAPI.printHTML(html, {
              copies: 1,
              silent: true,
            });
            if (result.success) {
              options.onSuccess?.();
              resolve();
            } else {
              throw new Error(result.error || 'Print failed');
            }
          } catch (err) {
            // Fall through to browser path
            console.warn('[Print] Electron native print failed, using browser fallback:', err);
          }
        }

        // Browser fallback: popup window
        const printWindow = window.open('', '', 'width=302,height=600');
        if (!printWindow) {
          const error = new Error('Failed to open print window');
          options.onError?.(error);
          reject(error);
          return;
        }

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            options.onSuccess?.();
            resolve();
          }, 500);
        }, 250);
      });
    },
    []
  );

  // ── Smart combined entrypoint ──────────────────────────────────────────

  /**
   * Prints all required receipt copies.
   *
   * - If the USB thermal printer is connected and ESC/POS is enabled, sends raw
   *   bytes directly — no print dialog.
   * - Otherwise falls through to the browser popup print path.
   *
   * @param patientCopyElement  DOM ref for the patient-copy receipt (browser path)
   * @param labCopyElement      DOM ref for the lab-copy receipt (browser path)
   * @param receiptNumber       Used for the browser popup window title
   * @param receiptData         Required for the ESC/POS path
   */
  const printBothCopies = useCallback(
    async (
      patientCopyElement: HTMLElement | null,
      labCopyElement: HTMLElement | null,
      receiptNumber: string,
      receiptData?: ReceiptData
    ): Promise<{ success: boolean; printedCount: number }> => {
      // Check the singleton directly — React state can be stale in closures
      const usbReady =
        settings.thermal.enabled &&
        usbPrinterService.isConnected &&
        receiptData != null;

      let printedCount = 0;

      try {
        if (usbReady && receiptData) {
          // ── ESC/POS path ────────────────────────────────────────────
          await printReceiptESCPOS(receiptData, 'patient');
          printedCount++;

          if (settings.thermal.copies === 2) {
            await new Promise(r => setTimeout(r, 800));
            await printReceiptESCPOS(receiptData, 'lab');
            printedCount++;
          }
        } else {
          // ── Browser popup path ──────────────────────────────────────
          await printReceipt(patientCopyElement, {
            title: `Patient Copy - ${receiptNumber}`,
          });
          printedCount++;

          await new Promise(r => setTimeout(r, 1000));

          await printReceipt(labCopyElement, {
            title: `Lab Copy - ${receiptNumber}`,
          });
          printedCount++;
        }

        return { success: true, printedCount };
      } catch (error) {
        console.error('Print error:', error);
        return { success: false, printedCount };
      }
    },
    [printReceipt, printReceiptESCPOS, settings.thermal]
  );

  return {
    printReceipt,
    printReceiptESCPOS,
    printBothCopies,
  };
};
