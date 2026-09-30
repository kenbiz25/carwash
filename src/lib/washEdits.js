// Manager+ corrections to a wash after check-in (a mistyped plate, a washer
// swapped mid-job) - see WashDetails.jsx. Kept pure so the diff/audit logic
// can be tested without the data server.
export const EDITABLE_WASH_FIELDS = [
  "plate_number",
  "vehicle_make",
  "vehicle_model",
  "vehicle_color",
  "customer_name",
  "customer_phone",
  "assigned_staff_id",
  "bay_number",
];

const LABELS = {
  plate_number: "Plate",
  vehicle_make: "Make",
  vehicle_model: "Model",
  vehicle_color: "Color",
  customer_name: "Customer name",
  customer_phone: "Customer phone",
  assigned_staff_id: "Staff",
  bay_number: "Bay",
};

const asText = (v) => (v == null ? "" : String(v));

// Form values for the edit dialog - every field as a string so inputs are
// always controlled.
export function washEditForm(wash) {
  return Object.fromEntries(EDITABLE_WASH_FIELDS.map((key) => [key, asText(wash[key])]));
}

// Returns { error } if the form is invalid, { updateData: null } if nothing
// changed, or { updateData, changes } to save. Every save appends to
// edit_history with who/when/before/after, so a correction never silently
// rewrites who did the work (it feeds commissions and staff reports).
export function buildWashEdit({ wash, form, staff = [], reason = "", editedBy = "", now = new Date() }) {
  const plate = asText(form.plate_number).trim();
  const next = {
    ...form,
    plate_number: wash.type === "carpet" ? plate : plate.toUpperCase(),
    customer_name: asText(form.customer_name).trim(),
    customer_phone: asText(form.customer_phone).trim(),
  };
  if (!next.plate_number) {
    return { error: wash.type === "carpet" ? "Reference can't be empty" : "Plate number can't be empty" };
  }

  const changed = EDITABLE_WASH_FIELDS.filter((key) => asText(wash[key]) !== asText(next[key]));
  if (changed.length === 0) return { updateData: null, changes: [] };

  const staffMember = staff.find((s) => s.id === next.assigned_staff_id);
  const staffChanged = changed.includes("assigned_staff_id");

  // Log staff changes by name - an id means nothing to whoever reads the history.
  const changes = changed.map((key) => key === "assigned_staff_id"
    ? { field: key, label: LABELS[key], from: wash.assigned_staff_name || "", to: staffMember?.name || "" }
    : { field: key, label: wash.type === "carpet" && key === "plate_number" ? "Reference" : LABELS[key], from: asText(wash[key]), to: asText(next[key]) });

  const updateData = {
    ...Object.fromEntries(changed.map((key) => [key, next[key]])),
    ...(staffChanged && { assigned_staff_name: staffMember?.name || "" }),
    ...(changed.includes("bay_number") && {
      bay_number: next.bay_number ? parseInt(next.bay_number, 10) : null,
    }),
    edit_history: [
      ...(wash.edit_history || []),
      { changes, reason: asText(reason).trim(), edited_by: editedBy, edited_at: now.toISOString() },
    ],
  };

  return { updateData, changes, staffChanged, staffMember, plate: next.plate_number };
}
