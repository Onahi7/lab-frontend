import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { useAuth } from '@/context/AuthContext';
import { useDoctorReferralReport } from '@/hooks/useReconciliation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Loader2,
  FileDown,
  Search,
  Stethoscope,
  Users,
  Banknote,
  Tag,
  ClipboardList,
} from 'lucide-react';

export default function DoctorReferralReport() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const role = pathname.startsWith('/reception') ? 'receptionist' : 'admin';
  const reportRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [appliedParams, setAppliedParams] = useState<{
    startDate: string;
    endDate: string;
    doctor: string;
  }>({ startDate: today, endDate: today, doctor: '' });

  const { data: report, isLoading } = useDoctorReferralReport({
    startDate: appliedParams.startDate,
    endDate: appliedParams.endDate,
    doctor: appliedParams.doctor || undefined,
  });

  const handleSearch = () => {
    setAppliedParams({ startDate, endDate, doctor: doctorFilter });
  };

  const handleExportPDF = () => {
    if (!reportRef.current || !report) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dateRange =
      appliedParams.startDate === appliedParams.endDate
        ? format(new Date(appliedParams.startDate + 'T00:00:00'), 'MMMM dd, yyyy')
        : `${format(new Date(appliedParams.startDate + 'T00:00:00'), 'MMM dd')} – ${format(new Date(appliedParams.endDate + 'T00:00:00'), 'MMM dd, yyyy')}`;

    const L = (n: number) => (n || 0).toLocaleString();

    let summaryRows = '';
    report.summary.doctors.forEach((d: any) => {
      summaryRows += `<tr>
        <td>${d.name}</td>
        <td class="text-center">${d.orders}</td>
        <td class="text-right">Le ${L(d.billed)}</td>
        <td class="text-right">Le ${L(d.discount)}</td>
        <td class="text-right">Le ${L(d.paid)}</td>
      </tr>`;
    });

    let detailRows = '';
    report.rows.forEach((r: any) => {
      const date = r.date ? format(new Date(r.date), 'dd/MM/yy') : '-';
      const badge = r.paymentStatus === 'paid'
        ? `<span style="background:#dcfce7;color:#16a34a;padding:1px 6px;border-radius:10px;font-size:10px">${r.paymentStatus}</span>`
        : `<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:10px;font-size:10px">${r.paymentStatus}</span>`;
      detailRows += `<tr>
        <td>${date}</td>
        <td>${r.orderNumber}</td>
        <td>${r.patientName}</td>
        <td>${r.doctor}</td>
        <td>${r.tests}</td>
        <td class="text-right">Le ${L(r.total)}</td>
        <td class="text-right">Le ${L(r.discount)}</td>
        <td class="text-right">Le ${L(r.amountPaid)}</td>
        <td class="text-center">${badge}</td>
      </tr>`;
    });

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Doctor Referral Report — ${dateRange}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:20px; color:#111; font-size:11px; }
        h2 { text-align:center; margin-bottom:4px; font-size:16px; }
        .subtitle { text-align:center; color:#666; margin-bottom:16px; }
        .section { border:1px solid #ddd; border-radius:6px; padding:12px; margin-bottom:12px; }
        .section-title { font-weight:700; font-size:12px; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:4px; }
        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
        .stat { text-align:center; background:#f9f9f9; padding:8px; border-radius:4px; }
        .stat .value { font-size:14px; font-weight:700; }
        .stat .label { font-size:9px; color:#888; }
        table { width:100%; border-collapse:collapse; font-size:10px; }
        th, td { padding:5px 7px; text-align:left; border-bottom:1px solid #eee; }
        th { background:#f5f5f5; font-weight:600; }
        .text-right { text-align:right; }
        .text-center { text-align:center; }
        @media print { body { padding:10px; } }
      </style>
    </head><body>
      <h2>Hobour Diagnostics — Doctor Referral Report</h2>
      <p class="subtitle">${dateRange}${appliedParams.doctor ? ` · Doctor: ${appliedParams.doctor}` : ''}</p>

      <div class="stats">
        <div class="stat"><div class="value">${report.summary.totalOrders}</div><div class="label">Orders</div></div>
        <div class="stat"><div class="value">Le ${L(report.summary.totalBilled)}</div><div class="label">Billed</div></div>
        <div class="stat"><div class="value">Le ${L(report.summary.totalDiscount)}</div><div class="label">Discounts</div></div>
        <div class="stat"><div class="value">Le ${L(report.summary.totalPaid)}</div><div class="label">Paid</div></div>
      </div>

      ${report.summary.doctors.length > 0 ? `
      <div class="section">
        <div class="section-title">Summary by Doctor</div>
        <table>
          <thead><tr><th>Doctor</th><th class="text-center">Orders</th><th class="text-right">Billed</th><th class="text-right">Discount</th><th class="text-right">Paid</th></tr></thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </div>` : ''}

      <div class="section">
        <div class="section-title">Patient Detail</div>
        <table>
          <thead><tr><th>Date</th><th>Order #</th><th>Patient</th><th>Doctor</th><th>Tests</th><th class="text-right">Billed</th><th class="text-right">Discount</th><th class="text-right">Paid</th><th class="text-center">Status</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <RoleLayout
      title="Doctor Referral Report"
      subtitle="Orders grouped by referring doctor — patient, tests ordered, discounts & payments"
      role={role as any}
      userName={profile?.full_name}
    >
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
          <Input
            type="date"
            value={startDate}
            max={today}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
          <Input
            type="date"
            value={endDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Doctor (optional filter)</Label>
          <Input
            placeholder="Search by doctor name…"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-52"
          />
        </div>
        <Button onClick={handleSearch} className="gap-2">
          <Search className="w-4 h-4" /> Search
        </Button>
        {report && report.rows.length > 0 && (
          <Button variant="outline" onClick={handleExportPDF} className="gap-2 ml-auto">
            <FileDown className="w-4 h-4" /> Export PDF
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !report || report.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Stethoscope className="w-10 h-10 opacity-30" />
          <p>No referral orders found for the selected period.</p>
        </div>
      ) : (
        <div ref={reportRef} className="space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border rounded-lg p-4 text-center">
              <ClipboardList className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{report.summary.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Banknote className="w-5 h-5 mx-auto text-status-normal mb-1" />
              <p className="text-2xl font-bold">Le {report.summary.totalBilled.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Billed</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Tag className="w-5 h-5 mx-auto text-status-warning mb-1" />
              <p className="text-2xl font-bold text-status-critical">Le {report.summary.totalDiscount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Discount</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Banknote className="w-5 h-5 mx-auto text-status-normal mb-1" />
              <p className="text-2xl font-bold text-status-normal">Le {report.summary.totalPaid.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
          </div>

          {/* Doctor Summary */}
          {report.summary.doctors.length > 0 && (
            <div className="bg-card border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4" /> Summary by Doctor
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Doctor</th>
                      <th className="text-center px-3 py-2 font-medium">Orders</th>
                      <th className="text-right px-3 py-2 font-medium">Billed</th>
                      <th className="text-right px-3 py-2 font-medium">Discount</th>
                      <th className="text-right px-3 py-2 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.summary.doctors.map((d: any) => (
                      <tr key={d.name}>
                        <td className="px-3 py-2 font-medium">{d.name}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="secondary">{d.orders}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">Le {d.billed.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-status-critical">
                          {d.discount > 0 ? `− Le ${d.discount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-status-normal font-medium">
                          Le {d.paid.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Patient Detail Table */}
          <div className="bg-card border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" /> Patient Detail
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="text-left px-3 py-2 font-medium">Order #</th>
                    <th className="text-left px-3 py-2 font-medium">Patient</th>
                    <th className="text-left px-3 py-2 font-medium">Doctor</th>
                    <th className="text-left px-3 py-2 font-medium">Tests</th>
                    <th className="text-right px-3 py-2 font-medium">Billed</th>
                    <th className="text-right px-3 py-2 font-medium">Discount</th>
                    <th className="text-right px-3 py-2 font-medium">Paid</th>
                    <th className="text-center px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/40">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-xs">
                        {row.date ? format(new Date(row.date), 'dd/MM/yy') : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.orderNumber}</td>
                      <td className="px-3 py-2 font-medium">{row.patientName}</td>
                      <td className="px-3 py-2">{row.doctor}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.tests}</td>
                      <td className="px-3 py-2 text-right">Le {row.total.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-status-critical">
                        {row.discount > 0 ? `− Le ${row.discount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-status-normal font-medium">
                        Le {row.amountPaid.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant="outline"
                          className={cn('text-xs capitalize', {
                            'bg-status-normal/10 text-status-normal': row.paymentStatus === 'paid',
                            'bg-status-warning/10 text-status-warning': row.paymentStatus === 'pending' || row.paymentStatus === 'partial',
                          })}
                        >
                          {row.paymentStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </RoleLayout>
  );
}
