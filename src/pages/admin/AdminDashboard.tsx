import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  LogOut,
  Shield,
  Building2,
  Users,
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingNGO {
  id: string;
  user_id: string;
  organization_name: string;
  registration_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  verification_status: string;
  created_at: string;
  profile?: {
    full_name: string;
  };
  documents: {
    id: string;
    document_type: string;
    file_name: string;
    document_url: string;
  }[];
}

export default function AdminDashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pendingNGOs, setPendingNGOs] = useState<PendingNGO[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate('/auth');
      return;
    }

    if (user && role === 'admin') {
      fetchPendingVerifications();
    }
  }, [user, role, authLoading, navigate]);

  const fetchPendingVerifications = async () => {
    try {
      // Fetch pending NGOs
      const { data: ngos, error: ngosError } = await supabase
        .from('ngo_details')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true });

      if (ngosError) throw ngosError;

      // Fetch profiles and documents for each NGO
      const enrichedNGOs = await Promise.all(
        (ngos || []).map(async (ngo) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', ngo.user_id)
            .maybeSingle();

          const { data: docs } = await supabase
            .from('verification_documents')
            .select('id, document_type, file_name, document_url')
            .eq('user_id', ngo.user_id);

          return {
            ...ngo,
            profile: profile || undefined,
            documents: docs || [],
          };
        })
      );

      setPendingNGOs(enrichedNGOs as PendingNGO[]);
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ngoId: string) => {
    setProcessingId(ngoId);

    try {
      const { error } = await supabase
        .from('ngo_details')
        .update({
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq('id', ngoId);

      if (error) throw error;

      toast({
        title: 'NGO Approved!',
        description: 'The NGO has been verified and can now create food requests.',
      });

      fetchPendingVerifications();
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

  const handleReject = async (ngoId: string, reason: string) => {
    setProcessingId(ngoId);

    try {
      const { error } = await supabase
        .from('ngo_details')
        .update({
          verification_status: 'rejected',
          rejection_reason: reason || 'Documents could not be verified',
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq('id', ngoId);

      if (error) throw error;

      toast({
        title: 'NGO Rejected',
        description: 'The NGO has been notified of the rejection.',
      });

      fetchPendingVerifications();
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Admin Dashboard</span>
            <Badge variant="outline" className="ml-2">
              Single Authority
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Verifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">{pendingNGOs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Verified NGOs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Active Donors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Volunteers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="verifications" className="space-y-6">
            <TabsList>
              <TabsTrigger value="verifications">
                Pending Verifications
                {pendingNGOs.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingNGOs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ngos">All NGOs</TabsTrigger>
              <TabsTrigger value="food-requests">Food Requests</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="verifications" className="space-y-6">
              {pendingNGOs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <CheckCircle2 className="h-8 w-8 text-success" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                      <p className="text-muted-foreground">
                        No pending verifications at the moment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                pendingNGOs.map((ngo) => (
                  <Card key={ngo.id} className="overflow-hidden">
                    <CardHeader className="bg-warning/5 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {ngo.organization_name}
                          </CardTitle>
                          <CardDescription>
                            Submitted by {ngo.profile?.full_name || 'Unknown'} on{' '}
                            {new Date(ngo.created_at).toLocaleDateString()}
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
                          <h4 className="font-medium mb-3">Organization Details</h4>
                          <dl className="space-y-2 text-sm">
                            <div>
                              <dt className="text-muted-foreground">Registration No.</dt>
                              <dd className="font-medium">{ngo.registration_number}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Address</dt>
                              <dd className="font-medium">
                                {ngo.address}, {ngo.city}, {ngo.state} - {ngo.pincode}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Documents */}
                        <div>
                          <h4 className="font-medium mb-3">Uploaded Documents</h4>
                          {ngo.documents.length === 0 ? (
                            <Alert variant="destructive">
                              <AlertTitle>No documents uploaded</AlertTitle>
                              <AlertDescription>
                                This NGO has not uploaded any verification documents.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <ul className="space-y-2">
                              {ngo.documents.map((doc) => (
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
                          onClick={() => handleReject(ngo.id, 'Documents could not be verified')}
                          disabled={processingId === ngo.id}
                        >
                          {processingId === ngo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApprove(ngo.id)}
                          disabled={processingId === ngo.id || ngo.documents.length === 0}
                        >
                          {processingId === ngo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="ngos">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    NGO management coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="food-requests">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    Food request management coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    Platform analytics coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
