import React, { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Plus, Download, FileText, Loader2, Trash2, Edit2, Lock, Wallet, TrendingUp, Banknote } from "@/lib/icons";
import moment from "moment";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import StatCard from "@/components/common/StatCard";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import { useBusiness } from "@/lib/BusinessContext";
import { canManageBusiness } from "@/lib/permissions";
import { defaultDateRange, isWithinDateRange } from "@/lib/dateRange";

const CATEGORIES = {
  consumables: "Consumable Products",
  drawer_payout: "Cash Drawer Payout",
  repairs_maintenance: "Fix & Repair",
  food: "Lunch / Food",
  utilities: "Utilities",
  transport: "Transport",
  salaries: "Salaries",
  other: "Other",
};

const PAYMENT_SOURCES = {
  cash_drawer: "Cash Drawer",
  bank: "Bank",
  mpesa: "M-Pesa",
};

const QUICK_RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
];

const emptyForm = () => ({
  date: moment().format("YYYY-MM-DD"),
  amount: "",
  category: "consumables",
  note: "",
  payment_source: "cash_drawer",
});

export default function Expenses() {
  const queryClient = useQueryClient();
  const { user, currentBusiness: business } = useBusiness();
  const canManage = canManageBusiness(user, business);
  const businessId = business?.id;

  const [form, setForm] = useState(emptyForm());
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [quickRange, setQuickRange] = useState("week");
  const [{ startDate, endDate }, setRangeState] = useState(() => defaultDateRange(7));
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef(null);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", businessId],
    queryFn: () => api.entities.Expense.filter({ business_id: businessId }, "-date", 1000),
    enabled: !!businessId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", businessId],
    queryFn: () => api.entities.Payment.filter({ business_id: businessId }, "-created_date", 1000),
    enabled: !!businessId,
  });

  const setStartDate = (v) => { setQuickRange(null); setRangeState((r) => ({ ...r, startDate: v })); };
  const setEndDate = (v) => { setQuickRange(null); setRangeState((r) => ({ ...r, endDate: v })); };
  const applyQuickRange = (key) => {
    const days = QUICK_RANGES.find((r) => r.key === key)?.days || 7;
    setQuickRange(key);
    setRangeState(defaultDateRange(days));
  };

  // Expenses are filtered by their own `date` (the till/drawer date a
  // manager assigns, e.g. backdating a receipt) rather than `created_date`
  // (when it was typed into the app) - see emptyForm above.
  const filteredExpenses = useMemo(
    () => expenses
      .filter((e) => isWithinDateRange(e.date || e.created_date, startDate, endDate))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [expenses, startDate, endDate]
  );
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const revenueInRange = useMemo(
    () => payments
      .filter((p) => p.status === "confirmed" && isWithinDateRange(p.created_date, startDate, endDate))
      .reduce((s, p) => s + (p.amount || 0), 0),
    [payments, startDate, endDate]
  );

  const byCategory = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((e) => {
      const key = e.category || "other";
      map[key] = (map[key] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const rangeLabel = `${moment(startDate).format("MMM D")} - ${moment(endDate).format("MMM D")}`;

  if (!businessId) return null;

  // Managers and above only - staff who navigate here directly (e.g. a
  // stale link) see this instead of the form/report, matching the pattern
  // ProductCatalogue.jsx already uses for its own manager-only edit UI.
  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="h-10 w-10 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Manager access required</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-sm">
          Expenses are visible to managers and above only.
        </p>
      </div>
    );
  }

  const openEdit = (exp) => {
    setEditItem(exp);
    setForm({
      date: exp.date || moment(exp.created_date).format("YYYY-MM-DD"),
      amount: String(exp.amount ?? ""),
      category: exp.category || "consumables",
      note: exp.note || "",
      payment_source: exp.payment_source || "cash_drawer",
    });
  };

  const cancelEdit = () => {
    setEditItem(null);
    setForm(emptyForm());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!form.date) {
      toast.error("Pick a date");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        date: form.date,
        amount,
        category: form.category,
        note: form.note.trim(),
        payment_source: form.payment_source,
        recorded_by: user?.email || "",
      };
      if (editItem) {
        await api.entities.Expense.update(editItem.id, payload);
        toast.success("Expense updated");
      } else {
        await api.entities.Expense.create(payload);
        toast.success("Expense recorded");
      }
      cancelEdit();
      queryClient.invalidateQueries({ queryKey: ["expenses", businessId] });
    } catch (err) {
      toast.error(err?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.entities.Expense.delete(id);
    toast.success("Expense removed");
    if (editItem?.id === id) cancelEdit();
    queryClient.invalidateQueries({ queryKey: ["expenses", businessId] });
  };

  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) {
      toast.error("Nothing to export for this range");
      return;
    }
    const rows = filteredExpenses.map((e) => ({
      Date: e.date,
      Category: CATEGORIES[e.category] || e.category,
      Note: e.note || "",
      "Payment Source": PAYMENT_SOURCES[e.payment_source] || e.payment_source || "",
      "Amount (KES)": e.amount || 0,
      "Recorded By": e.recorded_by || "",
    }));
    rows.push({ Date: "", Category: "", Note: "", "Payment Source": "TOTAL", "Amount (KES)": totalExpenses, "Recorded By": "" });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Expenses");
    XLSX.writeFile(workbook, `expenses-${startDate}-to-${endDate}.xlsx`);
  };

  // Same html2canvas + jsPDF page-slicing approach as Reports.jsx's
  // handleExportFullPdf - rasterizes the report section and tiles it across
  // A4 pages, since the category breakdown table needs no charts but should
  // still look like the rest of the report suite.
  const handleExportPdf = async () => {
    if (!reportRef.current || filteredExpenses.length === 0) {
      toast.error("Nothing to export for this range");
      return;
    }
    setExportingPdf(true);
    try {
      const bg = window.getComputedStyle(document.body).backgroundColor || "#ffffff";
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: bg, useCORS: true });

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usablePageHeight = pageHeight - margin * 2;
      const firstPageHeight = usablePageHeight - 14;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(business?.name || "Expense Report", margin, margin + 4);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Expenses - ${rangeLabel} - generated ${moment().format("MMM D, YYYY h:mm A")}`, margin, margin + 10);

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

      doc.save(`expenses-${startDate}-to-${endDate}.pdf`);
    } catch (err) {
      toast.error(err?.message || "Couldn't generate the PDF - try again");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="h-6 w-6 text-brand-orange" />
          Expenses
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Record business expenses and see them against sales for {business?.name || "this business"}
        </p>
      </div>

      {/* Entry form */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{editItem ? "Edit Expense" : "Record an Expense"}</CardTitle>
          <CardDescription>e.g. consumables, drawer payouts, repairs, lunch</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                max={moment().format("YYYY-MM-DD")}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Amount (KES) *</Label>
              <Input
                type="number"
                min="0"
                placeholder="2000"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Paid From</Label>
              <Select value={form.payment_source} onValueChange={(v) => setForm((f) => ({ ...f, payment_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_SOURCES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} variant="gradient" className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {editItem ? "Save" : "Add"}
              </Button>
              {editItem && (
                <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>
              )}
            </div>
            <div className="md:col-span-5 space-y-1">
              <Label>Note</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Naivas consumable products, kettle repair, lunch for staff..."
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Report filters + export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => applyQuickRange(r.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  quickRange === r.key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <DateRangeFilter
            idPrefix="expenses"
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Stats + report (captured for PDF export) */}
      <div ref={reportRef} className="space-y-6 bg-slate-50 dark:bg-slate-900 p-1">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title={`Sales (${rangeLabel})`}
            value={`KES ${revenueInRange.toLocaleString()}`}
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            title={`Expenses (${rangeLabel})`}
            value={`KES ${totalExpenses.toLocaleString()}`}
            icon={Wallet}
            iconColor="text-brand-orange"
            iconBg="bg-brand-orange-50 dark:bg-brand-orange/10"
            subtitle={`${filteredExpenses.length} entries`}
          />
          <StatCard
            title="Net"
            value={`KES ${(revenueInRange - totalExpenses).toLocaleString()}`}
            icon={Banknote}
            iconColor={revenueInRange - totalExpenses >= 0 ? "text-emerald-600" : "text-red-500"}
            iconBg={revenueInRange - totalExpenses >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}
          />
        </div>

        {/* By category */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">By Category</CardTitle></CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No expenses in this range</p>
            ) : (
              <div className="space-y-2">
                {byCategory.map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{CATEGORIES[cat] || cat}</span>
                    <span className="font-semibold">KES {amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense log */}
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="print:hidden">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">No expenses recorded for this range</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <TableCell className="whitespace-nowrap">{moment(exp.date).format("MMM D, YYYY")}</TableCell>
                    <TableCell>{CATEGORIES[exp.category] || exp.category}</TableCell>
                    <TableCell className="max-w-xs truncate text-slate-500">{exp.note || "-"}</TableCell>
                    <TableCell className="font-semibold text-red-600">KES {(exp.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exp)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(exp.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {filteredExpenses.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                  <TableCell className="font-bold text-red-600">KES {totalExpenses.toLocaleString()}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </Card>
      </div>
    </div>
  );
}
