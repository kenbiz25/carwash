import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";

/**
 * Fetches washes + confirmed payments for every business in the array
 * and returns aggregated today/month totals.
 *
 * Only runs queries when businesses.length > 1 to avoid duplicate
 * fetching for single-business owners.
 */
export function useCumulativeStats(businesses = []) {
  const ids = businesses.map(b => b.id).filter(Boolean);
  const enabled = ids.length > 1;

  const washQueries = useQueries({
    queries: ids.map(id => ({
      queryKey: ["cumulative-washes", id],
      queryFn: () =>
        api.entities.Wash.filter({ business_id: id }, "-created_date", 500),
      enabled,
      staleTime: 60_000,
    })),
  });

  const paymentQueries = useQueries({
    queries: ids.map(id => ({
      queryKey: ["cumulative-payments", id],
      queryFn: () =>
        api.entities.Payment.filter({ business_id: id }, "-created_date", 500),
      enabled,
      staleTime: 60_000,
    })),
  });

  const allWashes = washQueries.flatMap(q => q.data || []);
  const allPayments = paymentQueries.flatMap(q => q.data || []);

  return useMemo(() => {
    const today = new Date().toDateString();
    const thisMonth = new Date().toISOString().slice(0, 7);

    const confirmed = allPayments.filter(p => p.status === "confirmed");

    // Cancelled jobs never happened as far as the business is concerned -
    // they shouldn't inflate wash-count totals.
    const countedWashes = allWashes.filter(w => w.status !== "cancelled");

    const totalWashesToday = countedWashes.filter(
      w => new Date(w.created_date).toDateString() === today
    ).length;

    const totalRevenueToday = confirmed
      .filter(p => new Date(p.created_date).toDateString() === today)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalWashesMonth = countedWashes.filter(
      w => (w.created_date || "").slice(0, 7) === thisMonth
    ).length;

    const totalRevenueMonth = confirmed
      .filter(p => (p.created_date || "").slice(0, 7) === thisMonth)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const isLoading =
      washQueries.some(q => q.isLoading) ||
      paymentQueries.some(q => q.isLoading);

    return {
      totalWashesToday,
      totalRevenueToday,
      totalWashesMonth,
      totalRevenueMonth,
      isLoading,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWashes.length, allPayments.length, JSON.stringify(allWashes.map(w => w.id)), JSON.stringify(allPayments.map(p => p.id))]);
}
