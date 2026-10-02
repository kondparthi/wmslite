/**
 * Generic React Query hooks for the Master Data CRUD endpoints.
 *
 * `resource` is the API path segment, e.g. "/master-data/locations".
 * Every Master Data sub-tab uses the same shape of hooks — this factory
 * keeps each component's data-fetching code to a couple of lines instead
 * of repeating query/mutation boilerplate 11 times.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMasterDataList<T>(resource: string) {
  return useQuery<T[]>({
    queryKey: [resource],
    queryFn: () => api.list<T>(resource),
  });
}

export function useMasterDataCreate<T>(resource: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => api.create<T>(resource, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useMasterDataUpdate<T>(resource: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: unknown }) =>
      api.update<T>(resource, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useMasterDataDelete(resource: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => api.remove(resource, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}
