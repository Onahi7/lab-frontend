import { useCallback } from 'react';
import { thermalPrintStyles } from '@/components/receipts/ThermalReceipt';

interface PrintOptions {
  title: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useThermalPrint = () => {
  const printReceipt = useCallback(
    (element: HTMLElement | null, options: PrintOptions): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!element) {
          const error = new Error('Receipt element not found');
          options.onError?.(error);
          reject(error);
          return;
        }

        const printWindow = window.open('', '', 'width=302,height=600');
        if (!printWindow) {
          const error = new Error('Failed to open print window');
          options.onError?.(error);
          reject(error);
          return;
        }

        printWindow.document.write(`
          <html>
            <head>
              <title>${options.title}</title>
              <style>${thermalPrintStyles}</style>
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load
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

  const printBothCopies = useCallback(
    async (
      patientCopyElement: HTMLElement | null,
      labCopyElement: HTMLElement | null,
      receiptNumber: string
    ): Promise<{ success: boolean; printedCount: number }> => {
      let printedCount = 0;

      try {
        // Print patient copy
        await printReceipt(patientCopyElement, {
          title: `Patient Copy - ${receiptNumber}`,
        });
        printedCount++;

        // Small delay between prints
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Print lab copy
        await printReceipt(labCopyElement, {
          title: `Lab Copy - ${receiptNumber}`,
        });
        printedCount++;

        return { success: true, printedCount };
      } catch (error) {
        console.error('Print error:', error);
        return { success: false, printedCount };
      }
    },
    [printReceipt]
  );

  return {
    printReceipt,
    printBothCopies,
  };
};
