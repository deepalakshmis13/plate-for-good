import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Building2,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import type { FoodRequestStatus, UrgencyLevel } from './types';

interface FoodRequestWithNGO {
  id: string;
  ngo_id: string;
  user_id: string;
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
  photos?: {
    id: string;
    photo_url: string;
    latitude: number | null;
    longitude: number | null;
  }[];
}

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
  high: { label: 'High', className: 'bg-warning/10 text-warning' },
  critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive' },
};

export function AdminFoodRequestReview() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FoodRequestWithNGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('food_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch NGO details and photos for each request
      const enrichedRequests = await Promise.all(
        (data || []).map(async (request) => {
          const { data: ngo } = await supabase
            .from('ngo_details')
            .select('organization_name, city, state')
            .eq('id', request.ngo_id)
            .maybeSingle();

          const { data: photos } = await supabase
            .from('food_request_photos')
            .select('id, photo_url, latitude, longitude')
            .eq('request_id', request.id);

          return {
            ...request,
            ngo: ngo || undefined,
            photos: photos || [],
          } as FoodRequestWithNGO;
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending food requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('admin-food-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_requests',
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setProcessingId(requestId);

    try {
      const { error } = await supabase
        .from('food_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Approved',
        description: 'The food request is now visible to donors.',
      });

      fetchPendingRequests();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !selectedRequestId) return;
    setProcessingId(selectedRequestId);

    try {
      const { error } = await supabase
        .from('food_requests')
        .update({ status: 'cancelled' })
        .eq('id', selectedRequestId);

      if (error) throw error;

      toast({
        title: 'Request Rejected',
        description: 'The NGO has been notified.',
      });

      setRejectDialogOpen(false);
      fetchPendingRequests();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-medium mb-2">All caught up!</h3>
        <p className="text-muted-foreground">No pending food requests to review.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => {
          const urgency = urgencyConfig[request.urgency_level];

          return (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="bg-warning/5 border-b pb-3">
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
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Description */}
                {request.description && (
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Quantity</span>
                    <p className="font-medium">
                      {request.quantity_needed} {request.quantity_unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted</span>
                    <p className="font-medium">{format(new Date(request.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  {request.needed_by && (
                    <div>
                      <span className="text-muted-foreground">Needed By</span>
                      <p className="font-medium">{format(new Date(request.needed_by), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Location</span>
                    <p className="font-medium flex items-center gap-1">
                      {request.latitude && request.longitude ? (
                        <>
                          <MapPin className="h-3 w-3 text-success" />
                          Set
                        </>
                      ) : (
                        'Not set'
                      )}
                    </p>
                  </div>
                </div>

                {/* Address */}
                {request.address && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Delivery Address: </span>
                    <span>{request.address}</span>
                  </div>
                )}

                {/* Photos */}
                {request.photos && request.photos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {request.photos.length} photo(s) attached
                    </span>
                    <div className="flex gap-2 overflow-x-auto">
                      {request.photos.map((photo) => (
                        <a
                          key={photo.id}
                          href={photo.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={photo.photo_url}
                            alt="Food request"
                            className="h-20 w-20 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                          />
                          {photo.latitude && photo.longitude && (
                            <span className="text-xs text-success flex items-center gap-0.5 mt-1">
                              <MapPin className="h-2 w-2" /> Geo-tagged
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => openRejectDialog(request.id)}
                    disabled={processingId === request.id}
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                  <Button onClick={() => handleApprove(request.id)} disabled={processingId === request.id}>
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Food Request</DialogTitle>
            <DialogDescription>Provide a reason for rejection (optional). The NGO will be notified.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!processingId}>
              {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
