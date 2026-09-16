import moment from "moment";

// The last `days` calendar days, inclusive of today - the shared default
// across Payments/Reports/Dashboard so a quiet day doesn't show as all zeros.
export function defaultDateRange(days = 7) {
  return {
    startDate: moment().subtract(days - 1, "days").format("YYYY-MM-DD"),
    endDate: moment().format("YYYY-MM-DD"),
  };
}

export function isWithinDateRange(date, startDate, endDate) {
  return moment(date).isBetween(moment(startDate).startOf("day"), moment(endDate).endOf("day"), null, "[]");
}

// Inclusive list of "YYYY-MM-DD" days from startDate to endDate, oldest first.
export function daysInRange(startDate, endDate) {
  const days = [];
  const cursor = moment(startDate).startOf("day");
  const end = moment(endDate).startOf("day");
  while (cursor.isSameOrBefore(end)) {
    days.push(cursor.format("YYYY-MM-DD"));
    cursor.add(1, "day");
  }
  return days;
}
