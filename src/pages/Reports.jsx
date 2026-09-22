import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/common/StatusBadge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  FileText,
  Download,
  TrendingUp,
  Car,
  Banknote,
  Users,
  Search,
  X,
  Loader2
} from "@/lib/icons";
import moment from "moment";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import StatCard from "@/components/common/StatCard";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import { useBusiness } from "@/lib/BusinessContext";
import { commissionForWash, toServicesById } from "@/lib/commissions";
import { defaultDateRange, isWithinDateRange, daysInRange } from "@/lib/dateRange";

export default function Reports() {
  const [{ startDate, endDate }, setRange] = useState(() => defaultDateRange(7));
  const setStartDate = (value) => setRange((r) => ({ ...r, startDate: value }));
  const setEndDate = (value) => setRange((r) => ({ ...r, endDate: value }));
  const [logStaffFilter, setLogStaffFilter] = useState("all");
  const [logVehicleTypeFilter, setLogVehicleTypeFilter] = useState("all");
  const [logPlateSearch, setLogPlateSearch] = useState("");
  const [exportingFullPdf, setExportingFullPdf] = useState(false);
  const reportBodyRef = useRef(null);

  const { currentBusiness: business } = useBusiness();

  const { data: washes = [] } = useQuery({
    queryKey: ["washes", business?.id],
    queryFn: () => api.entities.Wash.filter({ business_id: business?.id }, "-created_date", 1000),
    enabled: !!business?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", business?.id],
    queryFn: () => api.entities.Payment.filter({ business_id: business?.id }, "-created_date", 1000),
    enabled: !!business?.id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", business?.id],
    queryFn: () => api.entities.Staff.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", business?.id],
    queryFn: () => api.entities.Service.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });
  const servicesById = useMemo(() => toServicesById(services), [services]);

  // Filter data by date range (inclusive of both endpoints)
  const filteredWashes = washes.filter(w => isWithinDateRange(w.created_date, startDate, endDate));
  const filteredPayments = payments.filter(p => isWithinDateRange(p.created_date, startDate, endDate));
  const confirmedPayments = filteredPayments.filter(p => p.status === "confirmed");

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const mpesaRevenue = confirmedPayments.filter(p => p.method === "mpesa").reduce((sum, p) => sum + (p.amount || 0), 0);
    const cashRevenue = confirmedPayments.filter(p => p.method === "cash").reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalWashes = filteredWashes.length;
    const completedWashes = filteredWashes.filter(w => ['done', 'paid'].includes(w.status)).length;
    const cancelledWashes = filteredWashes.filter(w => w.status === 'cancelled').length;
    const avgWashValue = completedWashes > 0 ? Math.round(totalRevenue / completedWashes) : 0;

    return { totalRevenue, mpesaRevenue, cashRevenue, totalWashes, completedWashes, cancelledWashes, avgWashValue };
  }, [confirmedPayments, filteredWashes]);

  // Revenue by day chart data
  const revenueByDay = useMemo(() => {
    return daysInRange(startDate, endDate).map((day) => {
      const dayPayments = confirmedPayments.filter(p => moment(p.created_date).format("YYYY-MM-DD") === day);
      return {
        date: moment(day).format("MMM D"),
        revenue: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        washes: filteredWashes.filter(w => moment(w.created_date).format("YYYY-MM-DD") === day).length
      };
    });
  }, [confirmedPayments, filteredWashes, startDate, endDate]);

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const mpesa = confirmedPayments.filter(p => p.method === "mpesa").reduce((sum, p) => sum + (p.amount || 0), 0);
    const cash = confirmedPayments.filter(p => p.method === "cash").reduce((sum, p) => sum + (p.amount || 0), 0);
    const card = confirmedPayments.filter(p => p.method === "card").reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return [
      { name: "M-Pesa", value: mpesa, color: "#10b981" },
      { name: "Cash", value: cash, color: "#3b82f6" },
      { name: "Card", value: card, color: "#8b5cf6" }
    ].filter(d => d.value > 0);
  }, [confirmedPayments]);

  // Staff performance data
  const staffPerformance = useMemo(() => {
    const standards = business?.commission_standards;
    return staff.map(s => {
      const staffWashes = filteredWashes.filter(w => w.assigned_staff_id === s.id);
      const completedWashes = staffWashes.filter(w => ['done', 'paid'].includes(w.status));
      const revenue = completedWashes.reduce((sum, w) => sum + (w.amount_due || 0), 0);
      const commission = completedWashes.reduce(
        (sum, w) => sum + commissionForWash(w, { staff: s, servicesById, standards }),
        0
      );

      return {
        name: s.name,
        washes: completedWashes.length,
        revenue,
        commission: Math.round(commission)
      };
    }).sort((a, b) => b.washes - a.washes);
  }, [staff, filteredWashes, servicesById, business?.commission_standards]);

  // Service popularity
  const servicePopularity = useMemo(() => {
    const serviceCounts = {};
    filteredWashes.forEach(wash => {
      wash.services?.forEach(service => {
        const name = service.name || "Unknown";
        if (!serviceCounts[name]) {
          serviceCounts[name] = { count: 0, revenue: 0 };
        }
        serviceCounts[name].count++;
        serviceCounts[name].revenue += service.price || 0;
      });
    });
    return Object.entries(serviceCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredWashes]);

  // What was actually collected per wash, and by what method - a wash can
  // have more than one Payment attempt (a failed STK push retried as cash),
  // so a confirmed payment always wins over an earlier failed/pending one.
  const paymentByWashId = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (!p.wash_id) return;
      const existing = map[p.wash_id];
      if (existing?.status === "confirmed" && p.status !== "confirmed") return;
      if (p.status === "confirmed" && existing?.status === "confirmed") {
        existing.amount += p.amount || 0;
        return;
      }
      map[p.wash_id] = { amount: p.amount || 0, method: p.method, status: p.status };
    });
    return map;
  }, [payments]);

  const vehicleTypeOptions = useMemo(() => {
    return Array.from(new Set(washes.map((w) => w.vehicle_type).filter(Boolean))).sort();
  }, [washes]);

  // One row per wash, for the filterable "what happened" log below - joins
  // in whatever was actually paid, so an owner/manager checking in from a
  // phone can answer "who washed this plate and what did we collect" without
  // opening each wash individually.
  const washLog = useMemo(() => {
    return filteredWashes
      .filter((w) => logStaffFilter === "all" || w.assigned_staff_id === logStaffFilter)
      .filter((w) => logVehicleTypeFilter === "all" || w.vehicle_type === logVehicleTypeFilter)
      .filter((w) => !logPlateSearch || w.plate_number?.toLowerCase().includes(logPlateSearch.toLowerCase()))
      .map((w) => {
        const pay = paymentByWashId[w.id];
        return {
          id: w.id,
          date: w.created_date,
          plate: w.plate_number || "-",
          vehicleType: w.type === "carpet" ? "carpet" : (w.vehicle_type || "-"),
          staffName: w.assigned_staff_name || "-",
          servicesLabel: w.type === "carpet"
            ? (w.carpet_items || []).map((i) => i.material_name).filter(Boolean).join(", ") || "-"
            : (w.services || []).map((s) => s.name).filter(Boolean).join(", ") || "-",
          amountPaid: pay?.status === "confirmed" ? pay.amount : (w.status === "paid" ? (w.amount_due || 0) : 0),
          method: pay?.method || null,
          status: w.status,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredWashes, logStaffFilter, logVehicleTypeFilter, logPlateSearch, paymentByWashId]);

  const washLogTotal = useMemo(() => washLog.reduce((sum, r) => sum + r.amountPaid, 0), [washLog]);

  // By-method breakdown of the same total, for the footer row - cash/mpesa/card
  // labels only show up here if that method actually collected something in
  // the current filtered period, same convention as paymentMethodData above.
  const washLogTotalsByMethod = useMemo(() => {
    const totals = {};
    washLog.forEach((r) => {
      if (!r.method || r.amountPaid <= 0) return;
      totals[r.method] = (totals[r.method] || 0) + r.amountPaid;
    });
    return totals;
  }, [washLog]);

  const handleExportCsv = () => {
    const header = ["Date", "Plate", "Vehicle Type", "Employee", "Services", "Amount Paid (KES)", "Method", "Status"];
    const rows = washLog.map((r) => [
      moment(r.date).format("YYYY-MM-DD HH:mm"),
      r.plate,
      r.vehicleType,
      r.staffName,
      r.servicesLabel,
      r.amountPaid,
      r.method || "",
      r.status,
    ]);
    const totalRow = ["", "", "", "", "TOTAL", washLogTotal, "", ""];
    const csv = [header, ...rows, totalRow]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wash-report-${moment().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Columns for the printable PDF - same data as the CSV export, sized to
  // fit an A4 landscape page (widths sum to well under the ~277mm usable
  // width once the 10mm margins are subtracted).
  const PDF_COLUMNS = [
    { label: "Date", width: 26, get: (r) => moment(r.date).format("MMM D, h:mma") },
    { label: "Plate", width: 20, get: (r) => r.plate },
    { label: "Vehicle", width: 18, get: (r) => r.vehicleType },
    { label: "Employee", width: 26, get: (r) => r.staffName },
    { label: "Services", width: 85, get: (r) => r.servicesLabel },
    { label: "Amount (KES)", width: 24, get: (r) => r.amountPaid.toLocaleString() },
    { label: "Method", width: 18, get: (r) => r.method || "-" },
    { label: "Status", width: 20, get: (r) => r.status },
  ];
  const pdfTableWidth = PDF_COLUMNS.reduce((sum, c) => sum + c.width, 0);

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const lineHeight = 4.5;
    let y = margin;

    const drawTableHeader = () => {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y - 4, pdfTableWidth, 6, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      let x = margin;
      PDF_COLUMNS.forEach((col) => {
        doc.text(col.label, x + 1, y);
        x += col.width;
      });
      doc.setFont("helvetica", "normal");
      y += 4;
    };

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(business?.name || "Wash Log Report", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Wash Log - ${rangeLabel} - generated ${moment().format("MMM D, YYYY h:mm A")}`, margin, y);
    y += 6;
    drawTableHeader();

    doc.setFontSize(8);
    washLog.forEach((r) => {
      const cellLines = PDF_COLUMNS.map((col) => doc.splitTextToSize(String(col.get(r) ?? "-"), col.width - 2));
      const rowHeight = Math.max(...cellLines.map((lines) => lines.length), 1) * lineHeight;

      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        drawTableHeader();
        doc.setFontSize(8);
      }

      let x = margin;
      cellLines.forEach((lines, i) => {
        doc.text(lines, x + 1, y);
        x += PDF_COLUMNS[i].width;
      });
      y += rowHeight;
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(margin, y - 1, margin + pdfTableWidth, y - 1);
    });

    // Total row - same figures as the on-screen footer and the CSV's TOTAL row.
    const methodBreakdown = Object.entries(washLogTotalsByMethod)
      .map(([method, amount]) => `${method}: KES ${amount.toLocaleString()}`)
      .join("  ·  ");
    if (y + lineHeight * 2 + 4 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL (${rangeLabel})`, margin + 1, y);
    const amountColX = margin + PDF_COLUMNS.slice(0, 5).reduce((sum, c) => sum + c.width, 0);
    doc.text(`KES ${washLogTotal.toLocaleString()}`, amountColX + 1, y);
    if (methodBreakdown) {
      y += lineHeight;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(methodBreakdown, margin + 1, y);
    }

    doc.save(`wash-report-${moment().format("YYYY-MM-DD")}.pdf`);
  };

  // Full-page PDF - a visual snapshot of everything currently on screen
  // (stats, both charts, staff/service tables, and the wash log), as
  // opposed to handleExportPdf's structured, text-searchable wash-log-only
  // table. Charts are SVG (recharts) with no simple text representation, so
  // rasterizing the whole section with html2canvas and slicing it across
  // pages is the only way to include them.
  const handleExportFullPdf = async () => {
    if (!reportBodyRef.current || washLog.length === 0) return;
    setExportingFullPdf(true);
    try {
      const bg = window.getComputedStyle(document.body).backgroundColor || "#ffffff";
      const canvas = await html2canvas(reportBodyRef.current, {
        scale: 2,
        backgroundColor: bg,
        useCORS: true,
      });

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usablePageHeight = pageHeight - margin * 2;
      const firstPageHeight = usablePageHeight - 14; // room for the title block below

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(business?.name || "Business Report", margin, margin + 4);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Reports & Analytics - ${rangeLabel} - generated ${moment().format("MMM D, YYYY h:mm A")}`, margin, margin + 10);

      const mmPerPx = usableWidth / canvas.width;
      let renderedPx = 0;
      let isFirstPage = true;

      while (renderedPx < canvas.height) {
        const availableMm = isFirstPage ? firstPageHeight : usablePageHeight;
        const availablePx = Math.max(1, Math.floor(availableMm / mmPerPx));
        const sliceHeightPx = Math.min(availablePx, canvas.height - renderedPx);

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        sliceCanvas
          .getContext("2d")
          .drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        if (!isFirstPage) doc.addPage();
        const y = isFirstPage ? margin + 14 : margin;
        doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, y, usableWidth, sliceHeightPx * mmPerPx);

        renderedPx += sliceHeightPx;
        isFirstPage = false;
      }

      doc.save(`wash-report-full-${moment().format("YYYY-MM-DD")}.pdf`);
    } catch (err) {
      toast.error(err?.message || "Couldn't generate the PDF - try again");
    } finally {
      setExportingFullPdf(false);
    }
  };

  const rangeLabel = `${moment(startDate).format("MMM D")} - ${moment(endDate).format("MMM D")}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Analytics and business insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter
            idPrefix="reports"
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Button variant="outline" onClick={handleExportCsv} disabled={washLog.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={washLog.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportFullPdf} disabled={washLog.length === 0 || exportingFullPdf}>
            {exportingFullPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Full Report (PDF)
          </Button>
        </div>
      </div>

      <div ref={reportBodyRef} className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title={`Revenue (${rangeLabel})`}
          value={`KES ${stats.totalRevenue.toLocaleString()}`}
          icon={Banknote}
          iconColor="text-brand-orange"
          iconBg="bg-brand-orange-50 dark:bg-brand-orange/10"
        />
        <StatCard
          title="Washes Completed"
          value={stats.completedWashes}
          icon={Car}
          iconColor="text-brand-navy dark:text-brand-blue-light"
          iconBg="bg-brand-navy-50 dark:bg-brand-navy-mid/40"
          subtitle={`${stats.totalWashes} total`}
        />
        <StatCard
          title="Cancelled Washes"
          value={stats.cancelledWashes}
          icon={X}
          iconColor="text-red-500"
          iconBg="bg-red-50 dark:bg-red-500/10"
        />
        <StatCard
          title="Avg Wash Value"
          value={`KES ${stats.avgWashValue.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-brand-blue-mid dark:text-brand-blue-light"
          iconBg="bg-brand-blue-pale/40 dark:bg-brand-blue-mid/20"
        />
        <StatCard
          title="M-Pesa Rate"
          value={`${Math.round((stats.mpesaRevenue / stats.totalRevenue) * 100) || 0}%`}
          icon={FileText}
          iconColor="text-brand-orange-hot"
          iconBg="bg-brand-orange-100 dark:bg-brand-orange/10"
          subtitle={`KES ${stats.mpesaRevenue.toLocaleString()}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === "revenue" ? `KES ${value.toLocaleString()}` : value,
                      name === "revenue" ? "Revenue" : "Washes"
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {paymentMethodData.map((method) => (
                <div key={method.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: method.color }} />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{method.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Staff Performance */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Staff Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Washes</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  staffPerformance.map((member, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.washes}</TableCell>
                      <TableCell>KES {member.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600">
                        KES {member.commission.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Popular Services */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Popular Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicePopularity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500">
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  servicePopularity.map((service, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.count}</TableCell>
                      <TableCell className="text-emerald-600">
                        KES {service.revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Wash Log - filterable, exportable one-view of business activity */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-blue-mid" />
                Wash Log
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {washLog.length} record{washLog.length === 1 ? "" : "s"} · KES {washLogTotal.toLocaleString()} collected
              </p>
            </div>
            <div className="grid grid-cols-2 lg:flex lg:items-center gap-2">
              <div className="relative col-span-2 lg:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search plate number..."
                  value={logPlateSearch}
                  onChange={(e) => setLogPlateSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={logStaffFilter} onValueChange={setLogStaffFilter}>
                <SelectTrigger className="h-9 lg:w-44">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={logVehicleTypeFilter} onValueChange={setLogVehicleTypeFilter}>
                <SelectTrigger className="h-9 lg:w-44">
                  <SelectValue placeholder="Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicle Types</SelectItem>
                  {vehicleTypeOptions.map((v) => (
                    <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {washLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500">
                      No matching washes
                    </TableCell>
                  </TableRow>
                ) : (
                  washLog.slice(0, 200).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm text-slate-500">
                        {moment(r.date).format("MMM D, h:mm A")}
                      </TableCell>
                      <TableCell className="font-mono font-medium">{r.plate}</TableCell>
                      <TableCell className="capitalize">{r.vehicleType}</TableCell>
                      <TableCell>{r.staffName}</TableCell>
                      <TableCell className="font-medium">KES {r.amountPaid.toLocaleString()}</TableCell>
                      <TableCell>{r.method ? <StatusBadge status={r.method} /> : "-"}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {washLog.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>
                      Total ({rangeLabel})
                    </TableCell>
                    <TableCell>KES {washLogTotal.toLocaleString()}</TableCell>
                    <TableCell colSpan={2} className="text-xs text-slate-500 font-normal">
                      {Object.entries(washLogTotalsByMethod)
                        .map(([method, amount]) => `${method}: KES ${amount.toLocaleString()}`)
                        .join(" · ")}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
          {washLog.length > 200 && (
            <p className="text-xs text-slate-400 mt-3 text-center">
              Showing the first 200 of {washLog.length} - narrow the filters or date range to see more, or use Export for the full list.
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}