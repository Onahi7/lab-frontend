import { useState, useMemo } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useActiveTests } from '@/hooks/useTestCatalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EscPosBuilder, LINE_WIDTH } from '@/utils/escpos';
import { usbPrinterService } from '@/services/usbPrinterService';
import { thermalPrintStyles } from '@/components/receipts/ThermalReceipt';
import { cn } from '@/lib/utils';

function padLine(label: string, value: string, width = LINE_WIDTH): string {
  const spaces = width - label.length - value.length;
  return spaces > 0 ? label + ' '.repeat(spaces) + value : `${label} ${value}`;
}

function formatCurrency(n: number): string {
  return `Le ${n.toLocaleString('en-US')}`;
}

export default function PriceListPage() {
  const { profile, primaryRole } = useAuth();
  const currentRole = primaryRole === 'admin' ? 'admin' : 'receptionist';
  const { data: tests, isLoading } = useActiveTests();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);

  const allTests = useMemo(() => (Array.isArray(tests) ? tests : []) as any[], [tests]);

  const groupedTests = useMemo(() => {
    const filtered = allTests.filter(t => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        t.name?.toLowerCase().includes(s) ||
        t.code?.toLowerCase().includes(s) ||
        t.category?.toLowerCase().includes(s)
      );
    });
    return filtered.reduce<Record<string, any[]>>((acc, t) => {
      const cat = t.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {});
  }, [allTests, searchTerm]);

  const allFilteredIds = useMemo(
    () => Object.values(groupedTests).flat().map((t: any) => t.id || t._id),
    [groupedTests]
  );
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

  const selectedTests = useMemo(
    () => allTests.filter((t: any) => selectedIds.has(t.id || t._id)),
    [allTests, selectedIds]
  );
  const selectedTotal = useMemo(
    () => selectedTests.reduce((sum: number, t: any) => sum + (t.price || 0), 0),
    [selectedTests]
  );

  function toggleTest(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); allFilteredIds.forEach(id => next.delete(id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); allFilteredIds.forEach(id => next.add(id)); return next; });
    }
  }

  const itemsToPrint = selectedTests.length > 0 ? selectedTests : allTests;

  async function printESCPOS(items: any[]) {
    const grouped = items.reduce<Record<string, any[]>>((acc, t) => {
      const cat = t.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {});

    const b = new EscPosBuilder();
    b.init();
    b.align('center');
    b.bold(true).fontSize(0x11);
    b.line('HARBOUR Medical Diagnostic');
    b.fontSize(0x00).bold(false);
    b.line('114, Fourah Bay Road, Freetown');
    b.line('Tel: +232744414434');
    b.separator('=');
    b.bold(true).line(selectedTests.length > 0 ? 'SELECTED TESTS — QUOTATION' : 'FULL PRICE LIST').bold(false);
    b.line(format(new Date(), 'dd/MM/yyyy HH:mm'));
    b.separator('=');
    b.align('left');

    for (const [cat, catItems] of Object.entries(grouped).sort(([a], [bb]) => a.localeCompare(bb))) {
      b.bold(true).line(cat.toUpperCase()).bold(false);
      b.separator('-');
      for (const t of catItems) {
        const name = t.name.length > 22 ? t.name.slice(0, 20) + '..' : t.name;
        b.line(padLine(`${t.code}  ${name}`, formatCurrency(t.price || 0)));
      }
      b.line('');
    }

    if (selectedTests.length > 0) {
      b.separator('=');
      b.bold(true).line(padLine('TOTAL:', formatCurrency(selectedTotal))).bold(false);
    }

    b.separator('=');
    b.align('center');
    b.line('Prices subject to change');
    b.line('Thank you for choosing us!');
    b.feed(3);
    b.cut();

    await usbPrinterService.print(b.build());
  }

  function printBrowser(items: any[]) {
    const grouped = items.reduce<Record<string, any[]>>((acc, t) => {
      const cat = t.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {});

    const rows = Object.entries(grouped)
      .sort(([a], [bb]) => a.localeCompare(bb))
      .map(([cat, catItems]) => `
        <div class="section">
          <div class="section-title">${cat}</div>
          ${catItems.map(t => `
            <div class="item-row">
              <div class="item-name">
                <span style="font-weight:bold">${t.code}</span>
                <span style="font-size:10px;margin-left:4px">${t.name}</span>
              </div>
              <div class="item-price">${formatCurrency(t.price || 0)}</div>
            </div>`).join('')}
        </div>`).join('');

    const totalRow = selectedTests.length > 0
      ? `<div class="total-row grand-total" style="margin-top:8px"><span>TOTAL:</span><span>${formatCurrency(selectedTotal)}</span></div>`
      : '';

    const html = `<html><head><title>Price List</title><style>
      ${thermalPrintStyles}
      .item-row{display:flex;justify-content:space-between;margin:4px 0;font-size:11px}
      .item-name{flex:1;padding-right:8px}
      .item-price{white-space:nowrap;font-weight:bold}
    </style></head><body>
      <div class="receipt">
        <div class="header">
          <div class="logo">🏥</div>
          <div class="company-name">HARBOUR Medical Diagnostic</div>
          <div class="company-info">114, Fourah Bay Road, Freetown, Sierra Leone</div>
          <div class="company-info">Tel: +232744414434</div>
        </div>
        <div class="copy-type">${selectedTests.length > 0 ? 'SELECTED TESTS — QUOTATION' : 'FULL PRICE LIST'}</div>
        <div class="company-info" style="text-align:center;margin-bottom:8px">${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        ${rows}
        ${totalRow}
        <div class="footer" style="margin-top:12px">
          <div>Prices subject to change</div>
          <div>Thank you for choosing us!</div>
        </div>
      </div>
    </body></html>`;

    const w = window.open('', '', 'width=320,height=700');
    if (!w) { toast.error('Popup blocked — allow popups and retry'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); setTimeout(() => w.close(), 500); }, 300);
  }

  async function handlePrint() {
    if (itemsToPrint.length === 0) { toast.error('No tests to print'); return; }
    setIsPrinting(true);
    try {
      if (!usbPrinterService.isConnected) await usbPrinterService.autoConnect();
      if (usbPrinterService.isConnected) {
        await printESCPOS(itemsToPrint);
        toast.success('Price list sent to printer');
      } else {
        printBrowser(itemsToPrint);
      }
    } catch {
      printBrowser(itemsToPrint);
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <RoleLayout
      title="Price List"
      subtitle="Select tests to quote prices and print"
      role={currentRole as any}
      userName={profile?.full_name}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code or category..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="select-all" checked={allSelected} onCheckedChange={toggleAll} />
          <label htmlFor="select-all" className="text-sm cursor-pointer select-none">Select all</label>
        </div>
        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="gap-1 pr-1">
            {selectedIds.size} selected
            <button onClick={() => setSelectedIds(new Set())} className="hover:text-destructive ml-1">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
        <Button onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
          {selectedIds.size > 0 ? `Print Selected (${selectedIds.size})` : 'Print All'}
        </Button>
      </div>

      {/* Running total */}
      {selectedIds.size > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} test{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <span className="text-xl font-bold text-primary">{formatCurrency(selectedTotal)}</span>
        </div>
      )}

      {/* Test list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTests)
            .sort(([a], [bb]) => a.localeCompare(bb))
            .map(([category, items]) => (
              <Card key={category} className="overflow-hidden">
                <div className="bg-muted px-4 py-2 flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wide">{category}</h3>
                  <Badge variant="outline">{items.length} test{items.length !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="divide-y">
                  {items.map((t: any) => {
                    const id = t.id || t._id;
                    const checked = selectedIds.has(id);
                    return (
                      <div
                        key={id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors',
                          checked && 'bg-primary/5'
                        )}
                        onClick={() => toggleTest(id)}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleTest(id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {t.code}
                            </span>
                            <span className="font-medium text-sm truncate">{t.name}</span>
                          </div>
                          {t.sampleType && (
                            <p className="text-xs text-muted-foreground mt-0.5">{t.sampleType}</p>
                          )}
                        </div>
                        <span className={cn('font-bold text-sm whitespace-nowrap', checked && 'text-primary')}>
                          {formatCurrency(t.price || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          {Object.keys(groupedTests).length === 0 && (
            <p className="text-center text-muted-foreground py-12">No tests found</p>
          )}
        </div>
      )}
    </RoleLayout>
  );
}

  const [isPrinting, setIsPrinting] = useState(false);

  // Group tests by category
  const groupedTests = useMemo(() => {
    const list = (Array.isArray(tests) ? tests : []) as any[];
    const filtered = list.filter(t => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return t.name?.toLowerCase().includes(s) || t.code?.toLowerCase().includes(s) || t.category?.toLowerCase().includes(s);
    });
    return filtered.reduce<Record<string, any[]>>((acc, t) => {
      const cat = t.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {});
  }, [tests, searchTerm]);

  const allTestIds = useMemo(() => (Array.isArray(tests) ? tests : []).map((t: any) => t.id || t._id), [tests]);
  const allSelected = allTestIds.length > 0 && allTestIds.every((id: string) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  function toggleTest(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allTestIds));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedTests = useMemo(() => {
    const list = (Array.isArray(tests) ? tests : []) as any[];
    return list.filter((t: any) => selectedIds.has(t.id || t._id));
  }, [tests, selectedIds]);

  // Print via ESC/POS USB
  async function printESCPOS(itemsToPrint: any[]) {
    const b = new EscPosBuilder();
    b.init();
    b.align('center');
    b.bold(true).fontSize(0x11);
    b.line('HARBOUR Medical Diagnostic');
    b.fontSize(0x00).bold(false);
    b.line('114, Fourah Bay Road, Freetown');
    b.line('Tel: +232744414434');
    b.separator('=');
    b.bold(true).line('PRICE LIST').bold(false);
    b.line(format(new Date(), 'dd/MM/yyyy HH:mm'));
    b.separator('=');
    b.align('left');

    const grouped = itemsToPrint.reduce<Record<string, any[]>>((acc, t) => {
      const cat = t.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {});

    for (const [cat, items] of Object.entries(grouped)) {
      b.bold(true).line(cat.toUpperCase()).bold(false);
      b.separator('-');
      for (const t of items) {
        const name = t.name.length > 24 ? t.name.slice(0, 22) + '..' : t.name;
        b.line(padLine(`${t.code}  ${name}`, formatCurrency(t.price)));
      }
      b.line('');
    }

    b.separator('=');
    b.align('center');
    b.line('Prices are subject to change');
    b.line('Thank you for choosing us!');
    b.feed(3);
    b.cut();

    await usbPrinterService.print(b.build());
  }

  // Print via browser popup (fallback)
  function printBrowser(itemsToPrint: any[]) {
    const grouped = itemsToPrint.reduce<Record<string, any[]>>((acc, t) => {
      const cat = t.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {});

    const rows = Object.entries(grouped).map(([cat, items]) => `
      <div class="section">
        <div class="section-title">${cat}</div>
        ${items.map(t => `
          <div class="item-row">
            <div class="item-name">
              <span style="font-weight:bold">${t.code}</span>
              <span style="font-size:10px;margin-left:4px">${t.name}</span>
            </div>
            <div class="item-price">${formatCurrency(t.price)}</div>
          </div>
        `).join('')}
      </div>
    `).join('');

    const html = `
      <html><head><title>Price List</title><style>
        ${thermalPrintStyles}
        .item-row { display:flex; justify-content:space-between; margin:4px 0; font-size:11px; }
        .item-name { flex:1; padding-right:8px; }
        .item-price { white-space:nowrap; font-weight:bold; }
      </style></head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">🏥</div>
            <div class="company-name">HARBOUR Medical Diagnostic</div>
            <div class="company-info">114, Fourah Bay Road, Freetown, Sierra Leone</div>
            <div class="company-info">Tel: +232744414434</div>
          </div>
          <div class="copy-type">PRICE LIST</div>
          <div class="company-info" style="text-align:center;margin-bottom:8px">
            ${format(new Date(), 'dd/MM/yyyy HH:mm')}
          </div>
          ${rows}
          <div class="footer">
            <div>Prices are subject to change</div>
            <div>Thank you for choosing us!</div>
          </div>
        </div>
      </body></html>
    `;

    const w = window.open('', '', 'width=320,height=600');
    if (!w) { toast.error('Popup blocked — allow popups and try again'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); setTimeout(() => w.close(), 500); }, 300);
  }

  async function handlePrint() {
    const items = someSelected ? selectedTests : (Array.isArray(tests) ? tests as any[] : []);
    if (items.length === 0) { toast.error('No tests to print'); return; }
    setIsPrinting(true);
    try {
      if (!usbPrinterService.isConnected) {
        await usbPrinterService.autoConnect();
      }
      if (usbPrinterService.isConnected) {
        await printESCPOS(items);
        toast.success('Price list sent to printer');
      } else {
        printBrowser(items);
        toast.success('Price list sent to print dialog');
      }
    } catch {
      printBrowser(items);
      toast.success('Price list sent to print dialog');
    } finally {
      setIsPrinting(false);
    }
  }

  // Recent paid orders for the Orders tab
  const filteredOrders = useMemo(() => {
    const list = (Array.isArray(orders) ? orders : []) as any[];
    return list.filter(o => {
      if (!orderSearch) return true;
      const s = orderSearch.toLowerCase();
      const num = (o.orderNumber || o.order_number || '').toLowerCase();
      const fname = (o.patientId?.firstName || o.patients?.first_name || '').toLowerCase();
      const lname = (o.patientId?.lastName || o.patients?.last_name || '').toLowerCase();
      return num.includes(s) || fname.includes(s) || lname.includes(s);
    });
  }, [orders, orderSearch]);

  async function printOrderPrices(order: any) {
    const rawTests = (order.order_tests || order.tests || []) as any[];
    const total = order.total || order.totalAmount || 0;
    const discount = order.discount || 0;
    const subtotal = order.subtotal || 0;

    const b = new EscPosBuilder();
    b.init();
    b.align('center');
    b.bold(true).fontSize(0x11);
    b.line('HARBOUR Medical Diagnostic');
    b.fontSize(0x00).bold(false);
    b.separator('=');
    b.bold(true).line('ORDER PRICE BREAKDOWN').bold(false);
    b.line(format(new Date(), 'dd/MM/yyyy HH:mm'));
    b.separator('=');
    b.align('left');
    b.line(padLine('Order:', order.orderNumber || order.order_number || ''));
    const fn = order.patientId?.firstName || order.patients?.first_name || '';
    const ln = order.patientId?.lastName || order.patients?.last_name || '';
    b.line(padLine('Patient:', `${fn} ${ln}`));
    b.separator('-');
    b.bold(true).line('TESTS').bold(false);
    const seen = new Set<string>();
    for (const ot of rawTests) {
      const panelCode = ot.panelCode || ot.panel_code;
      const panelName = ot.panelName || ot.panel_name;
      if (panelCode && panelName) {
        if (!seen.has(panelCode)) {
          seen.add(panelCode);
          const panelPrice = rawTests.filter((t: any) => (t.panelCode || t.panel_code) === panelCode).reduce((s: number, t: any) => s + (t.price || 0), 0);
          const name = panelName.length > 22 ? panelName.slice(0, 20) + '..' : panelName;
          b.line(padLine(`${panelCode}  ${name}`, formatCurrency(panelPrice)));
        }
      } else {
        const code = ot.testCode || ot.test_code || ot.test_catalog?.code || '';
        const name = (ot.testName || ot.test_name || ot.test_catalog?.name || '').slice(0, 22);
        b.line(padLine(`${code}  ${name}`, formatCurrency(ot.price || 0)));
      }
    }
    b.separator('-');
    if (subtotal > 0) b.line(padLine('Subtotal:', formatCurrency(subtotal)));
    if (discount > 0) b.line(padLine('Discount:', `-${formatCurrency(discount)}`));
    b.bold(true).line(padLine('TOTAL:', formatCurrency(total))).bold(false);
    b.separator('=');
    b.align('center');
    b.line('HARBOUR Medical Diagnostic');
    b.feed(3);
    b.cut();

    setIsPrinting(true);
    try {
      if (!usbPrinterService.isConnected) await usbPrinterService.autoConnect();
      if (usbPrinterService.isConnected) {
        await usbPrinterService.print(b.build());
        toast.success('Order prices sent to printer');
      } else {
        toast.error('No thermal printer connected');
      }
    } catch {
      toast.error('Failed to print order prices');
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <RoleLayout
      title="Price List"
      subtitle="View test prices and print price lists"
      role={currentRole as any}
      userName={profile?.full_name}
    >
      <Tabs defaultValue="catalogue">
        <TabsList className="mb-6">
          <TabsTrigger value="catalogue">
            <Tag className="w-4 h-4 mr-2" />
            Test Catalogue
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ClipboardList className="w-4 h-4 mr-2" />
            Order Prices
          </TabsTrigger>
        </TabsList>

        {/* ─── Test Catalogue Tab ─────────────────────────────────────── */}
        <TabsContent value="catalogue">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tests..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer">Select all</label>
            </div>
            {someSelected && (
              <Badge variant="secondary" className="gap-1">
                {selectedIds.size} selected
                <button onClick={clearSelection} className="hover:text-destructive ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <Button onClick={handlePrint} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
              {someSelected ? `Print Selected (${selectedIds.size})` : 'Print All'}
            </Button>
          </div>

          {testsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTests).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
                <Card key={category} className="overflow-hidden">
                  <div className="bg-muted px-4 py-2 flex items-center justify-between">
                    <h3 className="font-semibold text-sm uppercase tracking-wide">{category}</h3>
                    <Badge variant="outline">{items.length} test{items.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="divide-y">
                    {items.map((t: any) => {
                      const id = t.id || t._id;
                      return (
                        <div
                          key={id}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors',
                            selectedIds.has(id) && 'bg-primary/5'
                          )}
                          onClick={() => toggleTest(id)}
                        >
                          <Checkbox
                            checked={selectedIds.has(id)}
                            onCheckedChange={() => toggleTest(id)}
                            onClick={e => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {t.code}
                              </span>
                              <span className="font-medium text-sm truncate">{t.name}</span>
                            </div>
                            {t.sampleType && (
                              <p className="text-xs text-muted-foreground mt-0.5">{t.sampleType}</p>
                            )}
                          </div>
                          <span className="font-bold text-sm whitespace-nowrap">
                            {formatCurrency(t.price || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
              {Object.keys(groupedTests).length === 0 && (
                <p className="text-center text-muted-foreground py-12">No tests found</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── Order Prices Tab ───────────────────────────────────────── */}
        <TabsContent value="orders">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order # or patient..."
              className="pl-10"
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
            />
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Patient</th>
                    <th>Tests</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order: any) => {
                    const orderNum = order.orderNumber || order.order_number;
                    const fn = order.patientId?.firstName || order.patients?.first_name || '';
                    const ln = order.patientId?.lastName || order.patients?.last_name || '';
                    const rawTests = (order.order_tests || order.tests || []) as any[];
                    const total = order.total || order.totalAmount || 0;
                    const paymentStatus = order.paymentStatus || order.payment_status;
                    const createdAt = order.createdAt || order.created_at;
                    return (
                      <tr key={order.id || order._id}>
                        <td className="font-mono text-sm">{orderNum}</td>
                        <td>{fn} {ln}</td>
                        <td className="text-muted-foreground text-sm">{rawTests.length} test{rawTests.length !== 1 ? 's' : ''}</td>
                        <td className="font-bold">{formatCurrency(Number(total))}</td>
                        <td>
                          <Badge variant="outline" className={cn(
                            paymentStatus === 'paid' ? 'bg-status-normal/10 text-status-normal' :
                            paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-status-warning/10 text-status-warning'
                          )}>
                            {paymentStatus}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground text-sm">
                          {createdAt ? format(new Date(createdAt), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPrinting}
                            onClick={() => printOrderPrices(order)}
                          >
                            {isPrinting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3 mr-1" />}
                            Print
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">No orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </RoleLayout>
  );
}
