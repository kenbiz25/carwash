// Shared between EnhancedCheckIn.jsx (picking services at check-in) and
// WashDetails.jsx (adding a service to an already-checked-in wash) so both
// price a catalogue service identically instead of two copies drifting apart.

// price_suv/price_van only mean "SUV/Van price" for a vehicle-tiered
// service - for a per-unit or variant-priced one they mean something else
// entirely (e.g. "Premium rate", "Option B"), so only substitute them when
// the vehicle_type passed in actually applies. A service saved before
// pricing_kind existed has no value for it, which always meant vehicle
// tiers back then - default it that way, not to "flat" (see ProductCatalogue.jsx).
export function getServicePrice(service, vehicleType) {
  const kind = service.pricing_kind || "vehicle";
  if (kind !== "vehicle") return service.price_kes;
  let price = service.price_kes;
  if (vehicleType === "suv" && service.price_suv) price = service.price_suv;
  if (["van", "truck", "tipper", "bus"].includes(vehicleType) && service.price_van) price = service.price_van;
  return price;
}

// A service with no vehicle_types set applies to every vehicle (most add-ons
// and engine/interior services aren't vehicle-size-specific) - one is only
// excluded once it's been explicitly tagged and the current vehicle isn't in
// that list, e.g. "Basic Wash (SUV)" shouldn't show up for a saloon.
export function appliesToVehicle(service, vehicleType) {
  return !service.vehicle_types?.length || service.vehicle_types.includes(vehicleType);
}
