"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateRelatedQueries } from '@/lib/query-client';
import { authenticatedFetch, getCurrentUser, setUserContext } from '@/lib/auth-client';
import { toast } from 'sonner';
import { User, Organization } from '../../../store/types';

// Query hooks for auth-related data
export const useUserProfile = (email?: string) => {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      if (!email) {
        // Get current user from Supabase
        const currentUser = await getCurrentUser();
        if (!currentUser) throw new Error('No authenticated user');
        
        // Ensure user context is set in cookies for authenticatedFetch
        await setUserContext(currentUser.id, currentUser.email!);
        email = currentUser.email!;
      }

      // Fetch user profile from backend
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/users?email=${encodeURIComponent(email)}`
      );

      if (!response.ok) throw new Error('Failed to fetch user profile');
      
      const userData = await response.json();
      if (Array.isArray(userData) && userData.length > 0) {
        return userData[0] as User;
      }
      throw new Error('No user data found');
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2;
    },
  });
};

export const useOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: queryKeys.auth.organization(organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return null;

      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/organizations/${organizationId}`
      );

      if (!response.ok) throw new Error('Failed to fetch organization');
      return response.json() as unknown as Organization;
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes - organizations change less frequently
  });
};

// Mutation for updating organization
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, updates }: {
      organizationId: string;
      updates: Partial<Organization>;
    }) => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/organizations/${organizationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) throw new Error('Failed to update organization');
      return response.json() as unknown as Organization;
    },
    onSuccess: (data, { organizationId }) => {
      toast.success('Organization updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.organization(organizationId) });
    },
    onError: (error: any) => {
      toast.error('Failed to update organization', {
        description: error.message,
      });
    },
  });
};