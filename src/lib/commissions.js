// Shared staff-commission math - one source of truth so Staff.jsx, Reports.jsx,
// and the dashboard's StaffPerformance widget can't drift out of sync.
//
// Precedence (owner's call): an employee's own override beats a service's
// own override, which beats the category standard (vehicle wash vs other).
const VEHICLE_WASH_CATEGORIES = ["exterior_wash", "package"];

export function categoryStandard(category, standards) {
  return VEHICLE_WASH_CATEGORIES.includes(category)
    ? (standards?.vehicle_wash ?? 30)
    : (standards?.other ?? 25);
}

export function effectiveRate({ serviceCategory, service, staff, standards }) {
  if (staff?.commission_override != null) return staff.commission_override;
  if (service?.commission_override != null) return service.commission_override;
  return categoryStandard(serviceCategory, standards);
}

// Sums commission across every service line item on a wash - wash.services[]
// already carries category + price per item from check-in, so a wash mixing
// e.g. an exterior wash and a vacuum add-on splits correctly instead of
// applying one flat rate to the whole amount_due.
export function commissionForWash(wash, { staff, servicesById, standards }) {
  return (wash.services || []).reduce((sum, line) => {
    const service = servicesById?.[line.service_id];
    const rate = effectiveRate({ serviceCategory: line.category, service, staff, standards });
    return sum + (line.price || 0) * (rate / 100);
  }, 0);
}

export function toServicesById(services) {
  const map = {};
  (services || []).forEach((s) => { map[s.id] = s; });
  return map;
}
