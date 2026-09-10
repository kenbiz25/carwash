import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";

/**
 * All business-scoped queries + realtime invalidation + refresh helper.
 * Keeps Dashboard.jsx small.
 */
export function useBusinessScopedData(selectedBusinessId) {
  const queryClient = useQueryClient();

  const washesQuery = useQuery({
    queryKey: ["washes", selectedBusinessId],
    enabled: !!selectedBusinessId,
    queryFn: () =>
      api.entities.Wash.filter(
        { business_id: selectedBusinessId },
        "-created_date",
        200
      ),
  });

  const paymentsQuery = useQuery({
    queryKey: ["payments", selectedBusinessId],
    enabled: !!selectedBusinessId,
    queryFn: () =>
      api.entities.Payment.filter(
        { business_id: selectedBusinessId },
        "-created_date",
        500
      ),
  });

  const staffQuery = useQuery({
    queryKey: ["staff", selectedBusinessId],
    enabled: !!selectedBusinessId,
    queryFn: () => api.entities.Staff.filter({ business_id: selectedBusinessId }),
  });

  const servicesQuery = useQuery({
    queryKey: ["services", selectedBusinessId],
    enabled: !!selectedBusinessId,
    queryFn: () => api.entities.Service.filter({ business_id: selectedBusinessId }),
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory", selectedBusinessId],
    enabled: !!selectedBusinessId,
    queryFn: () => api.entities.Inventory.filter({ business_id: selectedBusinessId }),
  });

  const cctvFeedsQuery = useQuery({
    queryKey: ["cctvFeeds", selectedBusinessId],
    enabled: !!selectedBusinessId,
    queryFn: () => api.entities.CCTVFeed.filter({ business_id: selectedBusinessId }),
  });

  const customersQuery = useQuery({
    queryKey: ["customers", selectedBusinessId],
    enabled: !!selectedBusinessId,
    queryFn: () =>
      api.entities.LoyaltyCustomer.filter({ business_id: selectedBusinessId }),
  });

  // Realtime subscriptions → invalidate scoped queries
  // Pass business_id filter so Firestore rules are satisfied and we only
  // listen to documents for this business (not the entire collection).
  useEffect(() => {
    if (!selectedBusinessId) return;

    const unsubWashes = api.entities.Wash.subscribe(
      () => queryClient.invalidateQueries({ queryKey: ["washes", selectedBusinessId] }),
      { business_id: selectedBusinessId }
    );

    const unsubPayments = api.entities.Payment.subscribe(
      () => queryClient.invalidateQueries({ queryKey: ["payments", selectedBusinessId] }),
      { business_id: selectedBusinessId }
    );

    return () => {
      unsubWashes?.();
      unsubPayments?.();
    };
  }, [selectedBusinessId, queryClient]);

  const refresh = () => {
    if (!selectedBusinessId) return;
    queryClient.invalidateQueries({ queryKey: ["washes", selectedBusinessId] });
    queryClient.invalidateQueries({ queryKey: ["payments", selectedBusinessId] });
    queryClient.invalidateQueries({ queryKey: ["staff", selectedBusinessId] });
    queryClient.invalidateQueries({ queryKey: ["inventory", selectedBusinessId] });
    queryClient.invalidateQueries({ queryKey: ["services", selectedBusinessId] });
    queryClient.invalidateQueries({ queryKey: ["customers", selectedBusinessId] });
    queryClient.invalidateQueries({ queryKey: ["cctvFeeds", selectedBusinessId] });
  };

  return useMemo(
    () => ({
      washes: washesQuery.data || [],
      payments: paymentsQuery.data || [],
      staff: staffQuery.data || [],
      services: servicesQuery.data || [],
      inventory: inventoryQuery.data || [],
      cctvFeeds: cctvFeedsQuery.data || [],
      customers: customersQuery.data || [],
      refetchWashes: washesQuery.refetch,
      refresh,
      loading:
        washesQuery.isLoading ||
        paymentsQuery.isLoading ||
        staffQuery.isLoading ||
        servicesQuery.isLoading ||
        inventoryQuery.isLoading ||
        cctvFeedsQuery.isLoading ||
        customersQuery.isLoading,
    }),
    [
      washesQuery.data,
      paymentsQuery.data,
      staffQuery.data,
      servicesQuery.data,
      inventoryQuery.data,
      cctvFeedsQuery.data,
      customersQuery.data,
      washesQuery.refetch,
      washesQuery.isLoading,
      paymentsQuery.isLoading,
      staffQuery.isLoading,
      servicesQuery.isLoading,
      inventoryQuery.isLoading,
      cctvFeedsQuery.isLoading,
      customersQuery.isLoading,
    ]
  );
}