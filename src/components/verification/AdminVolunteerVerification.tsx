import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, CheckCircle2, XCircle, Clock, FileText, MapPin, Phone, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PendingVolunteer {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  government_id_type: string;
  government_id_number: string;
  associated_organization: string | null;
  verification_status: string;
  created_at: string;
  documents: {
    id: string;
    document_type: string;
    file_name: string;
    document_url: string;
  }[];
}

export function AdminVolunteerVerification() {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<PendingVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<PendingVolunteer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPendingVolunteers = async () => {
    try {
      const { data, error } = await supabase
        .from('volunteer_details')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch documents for each volunteer
      const volunteersWithDocs = await Promise.all(
        (data || []).map(async (volunteer) => {
          const { data: docs } = await supabase
            .from('verification_documents')
            .select('id, document_type, file_name, document_url')
            .eq('user_id', volunteer.user_id);

          return {
            ...volunteer,
            documents: docs || [],
          };
        })
      );

      setVolunteers(volunteersWithDocs as PendingVolunteer[]);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVolunteers();

    const channel = supabase
      .channel('volunteer-verification')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteer_details' }, fetchPendingVolunteers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (volunteerId: string) => {
    setProcessingId(volunteerId);

    try {
      const { error } = await supabase
        .from('volunteer_details')
        .update({
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq('id', volunteerId);

      if (error) throw error;

      toast({
        title: 'Volunteer Approved!',
        description: 'The volunteer can now accept food deliveries.',
      });

      fetchPendingVolunteers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (volunteer: PendingVolunteer) => {
    setSelectedVolunteer(volunteer);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedVolunteer) return;

    setProcessingId(selectedVolunteer.id);
    setRejectDialogOpen(false);

    try {
      const { error } = await supabase
        .from('volunteer_details')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectionReason || 'Documents could not be verified',
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq('id', selectedVolunteer.id);

      if (error) throw error;

      toast({
        title: 'Volunteer Rejected',
        description: 'The volunteer has been notified of the rejection.',
      });

      fetchPendingVolunteers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
      setSelectedVolunteer(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (volunteers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-medium mb-2">All caught up!</h3>
        <p className="text-muted-foreground">No pending volunteer verifications.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {volunteers.map((volunteer) => (
          <Card key={volunteer.id} className="overflow-hidden">
            <CardHeader className="bg-warning/5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {volunteer.full_name}
                  </CardTitle>
                  <CardDescription>
                    Applied on {new Date(volunteer.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Details */}
                <div>
                  <h4 className="font-medium mb-3">Personal Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{volunteer.phone_number}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{volunteer.address}, {volunteer.city}, {volunteer.state} - {volunteer.pincode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>{volunteer.government_id_type}: {volunteer.government_id_number}</span>
                    </div>
                    {volunteer.associated_organization && (
                      <div>
                        <dt className="text-muted-foreground">Organization</dt>
                        <dd className="font-medium">{volunteer.associated_organization}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Documents */}
                <div>
                  <h4 className="font-medium mb-3">Uploaded Documents</h4>
                  {volunteer.documents.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertTitle>No documents uploaded</AlertTitle>
                      <AlertDescription>
                        This volunteer has not uploaded any verification documents.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <ul className="space-y-2">
                      {volunteer.documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {doc.document_type.replace('_', ' ')}
                            </span>
                          </div>
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => openRejectDialog(volunteer)}
                  disabled={processingId === volunteer.id}
                >
                  {processingId === volunteer.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(volunteer.id)}
                  disabled={processingId === volunteer.id}
                >
                  {processingId === volunteer.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Volunteer</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedVolunteer?.full_name}'s verification.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Volunteer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
