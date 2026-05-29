import { useQuery, useMutation, useQueryClient } from 'react-query';
import { linksApi, Link, PaginatedResponse } from '@/services/api';
import toast from 'react-hot-toast';

export function useLinks(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: string }) {
  return useQuery<PaginatedResponse<Link>>(
    ['links', params],
    () => linksApi.getAll(params).then((r) => r.data),
    { keepPreviousData: true }
  );
}

export function useLink(id: string) {
  return useQuery<Link>(
    ['link', id],
    () => linksApi.getById(id).then((r) => r.data),
    { enabled: !!id }
  );
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation(
    (data: Partial<Link> & { originalUrl: string }) => linksApi.create(data).then((r) => r.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('links');
        toast.success('Link created successfully!');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to create link');
      },
    }
  );
}

export function useUpdateLink() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: Partial<Link> }) => linksApi.update(id, data).then((r) => r.data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('links');
        queryClient.invalidateQueries(['link', variables.id]);
        toast.success('Link updated!');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update link');
      },
    }
  );
}

export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation(
    (id: string) => linksApi.delete(id).then((r) => r.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('links');
        toast.success('Link deleted');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to delete link');
      },
    }
  );
}

export function useLinkAnalytics(id: string, params?: { startDate?: string; endDate?: string }) {
  return useQuery(
    ['linkAnalytics', id, params],
    () => linksApi.getAnalytics(id, params).then((r) => r.data),
    { enabled: !!id }
  );
}
