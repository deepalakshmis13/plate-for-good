import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, AlertTriangle, Building2, Hand, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { calculateDistance, formatDistance } from '@/lib/distance';
import type { FoodRequestStatus, UrgencyLevel } from './types';

interface FoodRequestForVolunteer {
  id: string;
  ngo_id: string;
  title: string;
  description: string | null;
  quantity_needed: number;
  quantity_unit: string;
  urgency_level: UrgencyLevel;
  status: FoodRequestStatus;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  needed_by: string | null;
  created_at: string;
  ngo?: {
    organization_name: string;
    city: string;
    state: string;
  };
  distance?: number | null;
}

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string; priority: number }> = {
  critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive', priority: 0 },
  high: { label: 'High', className: 'bg-warning/10 text-warning', priority: 1 },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary', priority: 2 },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground', priority: 3 },
};

const statusConfig: Record<FoodRequestStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Available', variant: 'default' },
  matched: { label: 'Matched', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

interface VolunteerFoodRequestListProps {
  userLocation?: { lat: number; lng: number } | null;
}

export function VolunteerFoodRequestList({ userLocation }: VolunteerFoodRequestListProps) {
  const [requests, setRequests] = useState<FoodRequestForVolunteer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailableRequests = async () => {
    try {
      // Volunteers can see matched and in_progress requests
      const { data, error } = await supabase
        .from('food_requests')
        .select('*')
        .in('status', ['matched', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch NGO details for each request
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request) => {
          const { data: ngo } = await supabase
            .from('ngo_details')
            .select('organization_name, city, state')
            .eq('id', request.ngo_id)
            .maybeSingle();

          let distance = null;
          if (userLocation && request.latitude && request.longitude) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              request.latitude,
              request.longitude
            );
          }

          return {
            ...request,
            ngo: ngo || undefined,
            distance,
          } as FoodRequestForVolunteer;
        })
      );

      // Sort by urgency (critical first), then by distance
      const sorted = enrichedRequests.sort((a, b) => {
        const urgencyDiff =
          urgencyConfig[a.urgency_level].priority - urgencyConfig[b.urgency_level].priority;
        if (urgencyDiff !== 0) return urgencyDiff;
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });

      setRequests(sorted);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available deliveries.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('volunteer-food-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_requests',
        },
        () => {
          fetchAvailableRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Hand className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No deliveries available</h3>
        <p className="text-muted-foreground">
          When donors accept food requests, deliveries will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const urgency = urgencyConfig[request.urgency_level];
        const status = statusConfig[request.status];

        return (
          <Card key={request.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {request.title}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${urgency.className}`}>
                      {urgency.label === 'Critical' && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {urgency.label}
                    </span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Building2 className="h-3 w-3" />
                    {request.ngo?.organization_name || 'Unknown NGO'}
                    <span className="text-xs">
                      ({request.ngo?.city}, {request.ngo?.state})
                    </span>
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {request.distance !== null && (
                    <span className="text-sm font-medium text-primary">
                      {formatDistance(request.distance)} away
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{request.quantity_needed}</span>
                  <span className="text-muted-foreground">{request.quantity_unit}</span>
                </div>

                {request.needed_by && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Needed by {format(new Date(request.needed_by), 'MMM d')}
                  </div>
                )}

                {request.latitude && request.longitude && (
                  <div className="flex items-center gap-1 text-success">
                    <MapPin className="h-3 w-3" />
                    Location available
                  </div>
                )}
              </div>

              {request.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {request.address}
                </p>
              )}

              {request.status === 'matched' && (
                <div className="flex justify-end pt-2">
                  <Button size="sm">
                    <Hand className="h-4 w-4 mr-2" />
                    Accept Delivery
                  </Button>
                </div>
              )}

              {request.status === 'in_progress' && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    You accepted this delivery
                  </span>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
