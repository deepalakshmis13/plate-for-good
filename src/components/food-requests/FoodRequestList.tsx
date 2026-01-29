import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FoodRequestCard } from './FoodRequestCard';
import { Loader2, FileText } from 'lucide-react';
import type { FoodRequest } from './types';

interface FoodRequestListProps {
  ngoId: string;
  refreshTrigger?: number;
}

export function FoodRequestList({ ngoId, refreshTrigger }: FoodRequestListProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('food_requests')
        .select('*')
        .eq('ngo_id', ngoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as unknown as FoodRequest[]) || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load food requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('food_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast({
        title: 'Request Deleted',
        description: 'The food request has been removed.',
      });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the request.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, ngoId, refreshTrigger]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('food-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_requests',
          filter: `ngo_id=eq.${ngoId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ngoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No food requests yet</h3>
        <p className="text-muted-foreground">
          Create your first food request to start receiving donations.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {requests.map((request) => (
        <FoodRequestCard
          key={request.id}
          request={request}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
