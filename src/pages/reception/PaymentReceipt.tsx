import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/hooks/useOrders';

interface ReceiptData {
  receiptNumber: string;
  orderNumber: string;
  patientName: string;
  patientId: string;
  patientPhone?: string;
  tests: Array<{
    code: string;
    name: string;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  total: number;
  amountPaid: number;
  paymentMethod: 'cash' | 'card' | 'mobile-money';
  paymentDate: string;
  cashier: string;
  collectionDate?: string;
}

export default function PaymentReceipt() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: order, isLoading } = useOrder(orderId!);
  const patientReceiptRef = useRef<HTMLDivElement>(null);
  const labReceiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printCount, setPrintCount] = useState(0);

  // Transform order data to receipt format
  const receiptData: ReceiptData | null = order ? {
    receiptNumber: `RCP-${format(new Date(), 'yyyyMMdd')}-${order.order_number.split('-').pop()}`,
    orderNumber: order.order_number,
    patientName: `${order.patients.first_name} ${order.patients.last_name}`,
    patientId: order.patients.patient_id,
    patientPhone: order.patients.phone || undefined,
    tests: (order.order_tests || []).map((ot: any) => ({
      code: ot.test_catalog?.code || 'N/A',
      name: ot.test_catalog?.name || 'Unknown Test',
      price: ot.price || 0,
    })),
    subtotal: order.subtotal || 0,
    discount: order.discount || 0,
    discountType: order.discount_type || 'fixed',
    total: order.total || 0,
    amountPaid: order.total || 0,
    paymentMethod: order.payment_method || 'cash',
    paymentDate: order.created_at,
    cashier: profile?.full_name || 'Cashier',
    collectionDate: order.collected_at ? format(new Date(order.collected_at), 'yyyy-MM-dd HH:mm') : undefined,
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order || !receiptData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/reception/orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `Le ${amount.toLocaleString()}`;
  };

  const handlePrintBoth = async () => {
    setIsPrinting(true);
    
    try {
      // Print patient copy
      await printReceipt(patientReceiptRef.current, 'Patient Copy');
      setPrintCount(1);
      
      // Small delay between prints
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Print lab copy
      await printReceipt(labReceiptRef.current, 'Lab Copy');
      setPrintCount(2);
      
      toast.success('Both receipts printed successfully');
      
      // Redirect after successful print
      setTimeout(() => {
        navigate('/reception/orders');
      }, 2000);
    } catch (error) {
      toast.error('Failed to print receipts');
      console.error('Print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const printReceipt = (element: HTMLElement | null, copyType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!element) {
        reject(new Error('Receipt element not found'));
        return;
      }

      const printWindow = window.open('', '', 'width=302,height=600');
      if (!printWindow) {
        reject(new Error('Failed to open print window'));
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>${copyType} - ${receiptData.receiptNumber}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                width: 80mm;
                padding: 5mm;
                background: white;
              }
              
              .receipt {
                width: 100%;
              }
              
              .header {
                text-align: center;
                margin-bottom: 10px;
                border-bottom: 2px dashed #000;
                padding-bottom: 10px;
              }
              
              .logo {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              
              .company-name {
                font-size: 14px;
                font-weight: bold;
              }
              
              .company-info {
                font-size: 10px;
                margin-top: 3px;
              }
              
              .copy-type {
                font-size: 14px;
                font-weight: bold;
                margin: 10px 0;
                text-align: center;
                padding: 5px;
                border: 2px solid #000;
                background: ${copyType === 'Patient Copy' ? '#f0f0f0' : '#e0e0e0'};
              }
              
              .section {
                margin: 10px 0;
                padding: 5px 0;
              }
              
              .section-title {
                font-weight: bold;
                font-size: 11px;
                margin-bottom: 5px;
                text-transform: uppercase;
              }
              
              .info-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
                font-size: 11px;
              }
              
              .info-label {
                font-weight: bold;
              }
              
              .info-value {
                text-align: right;
              }
              
              .items-table {
                width: 100%;
                margin: 10px 0;
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
                padding: 5px 0;
              }
              
              .item-row {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                font-size: 11px;
              }
              
              .item-name {
                flex: 1;
                padding-right: 10px;
              }
              
              .item-price {
                white-space: nowrap;
                font-weight: bold;
              }
              
              .totals {
                margin: 10px 0;
                padding: 5px 0;
                border-top: 2px solid #000;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                font-size: 12px;
              }
              
              .total-row.grand-total {
                font-size: 14px;
                font-weight: bold;
                border-top: 1px dashed #000;
                padding-top: 5px;
                margin-top: 5px;
              }
              
              .payment-info {
                margin: 10px 0;
                padding: 10px 0;
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
              }
              
              .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 10px;
              }
              
              .barcode {
                text-align: center;
                font-family: 'Libre Barcode 128', cursive;
                font-size: 40px;
                margin: 10px 0;
                letter-spacing: 0;
              }
              
              .thank-you {
                text-align: center;
                font-weight: bold;
                margin: 10px 0;
                font-size: 12px;
              }
              
              .instructions {
                font-size: 10px;
                margin: 10px 0;
                padding: 5px;
                background: #f5f5f5;
                border: 1px solid #ddd;
              }
              
              .lab-instructions {
                background: #fff3cd;
                border: 1px solid #ffc107;
              }
              
              @media print {
                body {
                  width: 80mm;
                }
                .no-print {
                  display: none !important;
                }
              }
            </style>
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
          resolve();
        }, 500);
      }, 250);
    });
  };

  const ReceiptContent = ({ copyType }: { copyType: 'patient' | 'lab' }) => (
    <div className="receipt">
      {/* Header */}
      <div className="header">
        <div className="logo">🏥</div>
        <div className="company-name">HARBOUR MEDICAL</div>
        <div className="company-name">DIAGNOSTIC</div>
        <div className="company-info">114 Fourah Bay Road</div>
        <div className="company-info">Freetown, Sierra Leone</div>
        <div className="company-info">Tel: 075 766461, 031-551811</div>
        <div className="company-info">ogbenecarefarmsig@gmail.com</div>
      </div>

      {/* Copy Type Badge */}
      <div className="copy-type">
        {copyType === 'patient' ? '📋 PATIENT COPY' : '🔬 LAB COPY'}
      </div>

      {/* Receipt Info */}
      <div className="section">
        <div className="info-row">
          <span className="info-label">Receipt No:</span>
          <span className="info-value">{receiptData.receiptNumber}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Order No:</span>
          <span className="info-value">{receiptData.orderNumber}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Date:</span>
          <span className="info-value">{format(new Date(receiptData.paymentDate), 'dd/MM/yyyy HH:mm')}</span>
        </div>
      </div>

      {/* Patient Info */}
      <div className="section">
        <div className="section-title">Patient Information</div>
        <div className="info-row">
          <span className="info-label">Name:</span>
          <span className="info-value">{receiptData.patientName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Patient ID:</span>
          <span className="info-value">{receiptData.patientId}</span>
        </div>
        {receiptData.patientPhone && (
          <div className="info-row">
            <span className="info-label">Phone:</span>
            <span className="info-value">{receiptData.patientPhone}</span>
          </div>
        )}
      </div>

      {/* Tests/Items */}
      <div className="items-table">
        <div className="section-title">Tests Ordered</div>
        {receiptData.tests.map((test, index) => (
          <div key={index} className="item-row">
            <div className="item-name">
              <div style={{ fontWeight: 'bold' }}>{test.code}</div>
              <div style={{ fontSize: '10px' }}>{test.name}</div>
            </div>
            <div className="item-price">{formatCurrency(test.price)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="totals">
        <div className="total-row">
          <span>Subtotal:</span>
          <span>{formatCurrency(receiptData.subtotal)}</span>
        </div>
        {receiptData.discount > 0 && (
          <div className="total-row">
            <span>
              Discount ({receiptData.discountType === 'percentage' ? `${receiptData.discount}%` : formatCurrency(receiptData.discount)}):
            </span>
            <span>
              -{formatCurrency(
                receiptData.discountType === 'percentage'
                  ? (receiptData.subtotal * receiptData.discount) / 100
                  : receiptData.discount
              )}
            </span>
          </div>
        )}
        <div className="total-row grand-total">
          <span>TOTAL:</span>
          <span>{formatCurrency(receiptData.total)}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="payment-info">
        <div className="info-row">
          <span className="info-label">Payment Method:</span>
          <span className="info-value" style={{ textTransform: 'uppercase' }}>
            {receiptData.paymentMethod.replace('-', ' ')}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Amount Paid:</span>
          <span className="info-value">{formatCurrency(receiptData.amountPaid)}</span>
        </div>
        {receiptData.amountPaid > receiptData.total && (
          <div className="info-row">
            <span className="info-label">Change:</span>
            <span className="info-value">{formatCurrency(receiptData.amountPaid - receiptData.total)}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Cashier:</span>
          <span className="info-value">{receiptData.cashier}</span>
        </div>
      </div>

      {/* Collection Info */}
      {receiptData.collectionDate && (
        <div className="section">
          <div className="section-title">Sample Collection</div>
          <div className="info-row">
            <span className="info-label">Scheduled:</span>
            <span className="info-value">{receiptData.collectionDate}</span>
          </div>
        </div>
      )}

      {/* Instructions based on copy type */}
      {copyType === 'patient' ? (
        <div className="instructions">
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>IMPORTANT INSTRUCTIONS:</div>
          <div>• Please arrive 15 minutes before your scheduled time</div>
          <div>• Bring this receipt for sample collection</div>
          <div>• Fasting may be required for some tests</div>
          <div>• Results will be ready within 24-48 hours</div>
          <div>• Contact us for any queries</div>
        </div>
      ) : (
        <div className="instructions lab-instructions">
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>LAB TECHNICIAN NOTES:</div>
          <div>• Verify patient ID before collection</div>
          <div>• Check test requirements and prep</div>
          <div>• Label samples with order number</div>
          <div>• Update system after collection</div>
          <div>• Handle samples per protocol</div>
        </div>
      )}

      {/* Barcode */}
      <div className="barcode">{receiptData.orderNumber}</div>

      {/* Footer */}
      <div className="thank-you">THANK YOU FOR CHOOSING US!</div>
      <div className="footer">
        <div>Open 24/7 | Onsite & Online Access</div>
        <div>Trusted by Clinics & Hospitals</div>
        <div style={{ marginTop: '10px', fontSize: '9px' }}>
          This is a computer-generated receipt
        </div>
        <div style={{ fontSize: '9px' }}>
          Printed: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Action Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/reception/orders')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
              <div>
                <h2 className="text-lg font-semibold">Payment Receipt</h2>
                <p className="text-sm text-muted-foreground">
                  Order: {receiptData.orderNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {printCount > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="w-3 h-3 mr-1" />
                  {printCount} of 2 printed
                </Badge>
              )}
              <Button 
                onClick={handlePrintBoth}
                disabled={isPrinting}
                size="lg"
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? 'Printing...' : 'Print Both Receipts'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Receipt Previews */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Patient Copy Preview */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Patient Copy Preview</h3>
            <Badge>Copy 1</Badge>
          </div>
          <div 
            ref={patientReceiptRef}
            className="bg-white border-2 border-dashed border-gray-300 p-4 font-mono text-xs"
            style={{ width: '302px', margin: '0 auto' }}
          >
            <ReceiptContent copyType="patient" />
          </div>
        </Card>

        {/* Lab Copy Preview */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Lab Copy Preview</h3>
            <Badge variant="secondary">Copy 2</Badge>
          </div>
          <div 
            ref={labReceiptRef}
            className="bg-white border-2 border-dashed border-gray-300 p-4 font-mono text-xs"
            style={{ width: '302px', margin: '0 auto' }}
          >
            <ReceiptContent copyType="lab" />
          </div>
        </Card>
      </div>

      {/* Print Instructions */}
      <div className="max-w-4xl mx-auto mt-6">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Printer className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Thermal Printer Setup</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ensure thermal printer is connected and powered on</li>
                <li>• Paper width should be set to 80mm</li>
                <li>• Both receipts will print automatically in sequence</li>
                <li>• Patient copy prints first, followed by lab copy</li>
                <li>• Give patient copy to the patient, keep lab copy for records</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
