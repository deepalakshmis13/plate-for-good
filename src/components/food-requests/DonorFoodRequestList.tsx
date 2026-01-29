import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserLocation } from '@/hooks/useUserLocation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Clock, AlertTriangle, Package, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { calculateDistance, formatDistance } from '@/lib/distance';
import type { FoodRequest, UrgencyLevel } from './types';

interface FoodRequestWithDistance extends FoodRequest {
  distance?: number;
  ngo_name?: string;
}

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string; priority: number }> = {
  critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive', priority: 0 },
  high: { label: 'High', className: 'bg-warning/10 text-warning', priority: 1 },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary', priority: 2 },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground', priority: 3 },
};

export function DonorFoodRequestList() {
  const { user } = useAuth();
  const { location: userLocation, loading: locationLoading } = useUserLocation();
  const [requests, setRequests] = useState<FoodRequestWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // Fetch approved food requests that donors can accept
      const { data: requestsData, error: requestsError } = await supabase
        .from('food_requests')
        .select('*')
        .eq('status', 'approved')
        .is('donor_id', null);

      if (requestsError) throw requestsError;

      // Fetch NGO names for each request
      const ngoIds = [...new Set(requestsData?.map(r => r.ngo_id) || [])];
      const { data: ngosData } = await supabase
        .from('ngo_details')
        .select('id, organization_name')
        .in('id', ngoIds);

      const ngoMap = new Map(ngosData?.map(n => [n.id, n.organization_name]) || []);

      // Add distance and NGO name to requests
      const requestsWithInfo: FoodRequestWithDistance[] = (requestsData || []).map(request => {
        let distance: number | undefined;
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
          urgency_level: request.urgency_level as UrgencyLevel,
          distance,
          ngo_name: ngoMap.get(request.ngo_id),
        };
      });

      // Sort by urgency first, then by distance
      requestsWithInfo.sort((a, b) => {
        const urgencyDiff = urgencyConfig[a.urgency_level].priority - urgencyConfig[b.urgency_level].priority;
        if (urgencyDiff !== 0) return urgencyDiff;
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return 0;
      });

      setRequests(requestsWithInfo);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load food requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('donor-food-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userLocation]);

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;

    setAcceptingId(requestId);
    try {
      const { error } = await supabase
        .from('food_requests')
        .update({
          status: 'matched',
          donor_id: user.id,
        })
        .eq('id', requestId)
        .eq('status', 'approved');

      if (error) throw error;

      toast({
        title: 'Request Accepted',
        description: 'You have been matched with this food request. The NGO will be notified.',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No food requests available</h3>
            <p className="text-muted-foreground">
              When verified NGOs create food requests and admins approve them, they will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {locationLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Navigation className="h-4 w-4 animate-pulse" />
          Getting your location for distance sorting...
        </div>
      )}

      {requests.map((request) => {
        const urgency = urgencyConfig[request.urgency_level];
        const isAccepting = acceptingId === request.id;

        return (
          <Card key={request.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{request.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {request.ngo_name && (
                      <span className="font-medium text-foreground">{request.ngo_name}</span>
                    )}
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="default">Available</Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${urgency.className}`}>
                    {urgency.label === 'Critical' && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                    {urgency.label}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.description && (
                <p className="text-sm text-muted-foreground">{request.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{request.quantity_needed}</span>
                  <span className="text-muted-foreground">{request.quantity_unit}</span>
                </div>

                {request.needed_by && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Needed by {format(new Date(request.needed_by), 'MMM d, h:mm a')}
                  </div>
                )}

                {request.distance !== undefined && (
                  <div className="flex items-center gap-1 text-primary">
                    <Navigation className="h-3 w-3" />
                    {formatDistance(request.distance)} away
                  </div>
                )}
              </div>

              {request.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {request.address}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => handleAcceptRequest(request.id)}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Accepting...
                    </>
                  ) : (
                    'Accept & Donate'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
