import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Percent, Save, Loader2, Wrench, Users } from "@/lib/icons";
import { toast } from "sonner";
import { useBusiness } from "@/lib/BusinessContext";
import { categoryStandard } from "@/lib/commissions";

// One row per service/staff member, with an inline-editable override field -
// blank means "use the standard rate above (or the category default if no
// standard has been set yet)". See src/lib/commissions.js for the precedence
// this feeds: employee override > service override > category standard.
function OverrideRow({ label, sublabel, standardLabel, value, onSave, saving }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);
  const dirty = draft !== (value ?? "").toString();

  return (
    <TableRow>
      <TableCell className="font-medium">
        {label}
        {sublabel && <p className="text-xs text-slate-500 font-normal">{sublabel}</p>}
      </TableCell>
      <TableCell className="text-slate-500">{standardLabel}</TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          max="100"
          placeholder="Standard"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-28"
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || saving}
          onClick={() => onSave(draft === "" ? null : Number(draft))}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function Commissions() {
  const { currentBusiness: business } = useBusiness();
  const queryClient = useQueryClient();

  const [vehicleWashRate, setVehicleWashRate] = useState(30);
  const [otherRate, setOtherRate] = useState(25);
  const [savingStandards, setSavingStandards] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);

  useEffect(() => {
    if (business?.commission_standards) {
      setVehicleWashRate(business.commission_standards.vehicle_wash ?? 30);
      setOtherRate(business.commission_standards.other ?? 25);
    }
  }, [business?.commission_standards]);

  const { data: services = [], refetch: refetchServices } = useQuery({
    queryKey: ["services", business?.id],
    queryFn: () => api.entities.Service.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const { data: staff = [], refetch: refetchStaff } = useQuery({
    queryKey: ["staff", business?.id],
    queryFn: () => api.entities.Staff.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const standards = { vehicle_wash: vehicleWashRate, other: otherRate };

  const handleSaveStandards = async () => {
    setSavingStandards(true);
    try {
      await api.entities.Business.update(business.id, {
        commission_standards: { vehicle_wash: Number(vehicleWashRate), other: Number(otherRate) },
      });
      await queryClient.invalidateQueries({ queryKey: ["userBusinesses"] });
      toast.success("Standard commission rates saved");
    } catch (err) {
      toast.error("Failed to save: " + (err?.message || err));
    } finally {
      setSavingStandards(false);
    }
  };

  const handleSaveService = async (service, override) => {
    setSavingRowId(service.id);
    try {
      await api.entities.Service.update(service.id, { commission_override: override });
      toast.success(`${service.name} updated`);
      refetchServices();
    } catch (err) {
      toast.error("Failed to save: " + (err?.message || err));
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSaveStaff = async (member, override) => {
    setSavingRowId(member.id);
    try {
      await api.entities.Staff.update(member.id, { commission_override: override });
      toast.success(`${member.name} updated`);
      refetchStaff();
    } catch (err) {
      toast.error("Failed to save: " + (err?.message || err));
    } finally {
      setSavingRowId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Commissions</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Set the standard commission rate, then override it for a specific service or a specific
          employee where needed. When both apply to the same wash, the employee's override wins.
        </p>
      </div>

      {/* Standard rates */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-brand-orange" />
            Standard Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2">
              <Label>Vehicle Wash Services (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={vehicleWashRate}
                onChange={(e) => setVehicleWashRate(e.target.value)}
              />
              <p className="text-xs text-slate-500">Exterior wash &amp; package services</p>
            </div>
            <div className="space-y-2">
              <Label>Other Services (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={otherRate}
                onChange={(e) => setOtherRate(e.target.value)}
              />
              <p className="text-xs text-slate-500">Vacuuming, dashboard polish, carpet cleaning, greasing, etc.</p>
            </div>
          </div>
          <Button className="mt-4" variant="gradient" onClick={handleSaveStandards} disabled={savingStandards}>
            {savingStandards ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Standard Rates
          </Button>
        </CardContent>
      </Card>

      {/* Per-service overrides */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-brand-navy dark:text-brand-blue-light" />
            Service Overrides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Override</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">No services yet</TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <OverrideRow
                    key={service.id}
                    label={service.name}
                    sublabel={service.category}
                    standardLabel={`${categoryStandard(service.category, standards)}%`}
                    value={service.commission_override}
                    saving={savingRowId === service.id}
                    onSave={(override) => handleSaveService(service, override)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-employee overrides */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-blue-mid dark:text-brand-blue-light" />
            Employee Overrides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Override</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">No staff yet</TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <OverrideRow
                    key={member.id}
                    label={member.name}
                    sublabel={member.role}
                    standardLabel="Varies by service"
                    value={member.commission_override}
                    saving={savingRowId === member.id}
                    onSave={(override) => handleSaveStaff(member, override)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
