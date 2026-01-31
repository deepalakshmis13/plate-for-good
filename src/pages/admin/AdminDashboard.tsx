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
  MapPin,
  UtensilsCrossed,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LocationMap, MapMarker } from '@/components/maps/LocationMap';
import { AdminFoodRequestReview } from '@/components/food-requests';
import { AdminVolunteerVerification } from '@/components/verification';

interface PendingNGO {
  id: string;
  user_id: string;
  organization_name: string;
  registration_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
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

interface OverviewStats {
  pendingNGOs: number;
  approvedNGOs: number;
  rejectedNGOs: number;
  pendingVolunteers: number;
  approvedVolunteers: number;
  rejectedVolunteers: number;
  activeDonors: number;
  pendingFoodRequests: number;
  completedDeliveries: number;
}

export default function AdminDashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pendingNGOs, setPendingNGOs] = useState<PendingNGO[]>([]);
  const [stats, setStats] = useState<OverviewStats>({
    pendingNGOs: 0,
    approvedNGOs: 0,
    rejectedNGOs: 0,
    pendingVolunteers: 0,
    approvedVolunteers: 0,
    rejectedVolunteers: 0,
    activeDonors: 0,
    pendingFoodRequests: 0,
    completedDeliveries: 0,
  });
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate('/auth');
      return;
    }

    if (user && role === 'admin') {
      fetchData();
    }
  }, [user, role, authLoading, navigate]);

  const fetchData = async () => {
    await Promise.all([
      fetchPendingNGOs(),
      fetchOverviewStats(),
    ]);
    setLoading(false);
  };

  const fetchOverviewStats = async () => {
    try {
      // NGO stats
      const [pendingNGOs, approvedNGOs, rejectedNGOs] = await Promise.all([
        supabase.from('ngo_details').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('ngo_details').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),
        supabase.from('ngo_details').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
      ]);

      // Volunteer stats
      const [pendingVolunteers, approvedVolunteers, rejectedVolunteers] = await Promise.all([
        supabase.from('volunteer_details').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('volunteer_details').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),
        supabase.from('volunteer_details').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
      ]);

      // Donor stats
      const donors = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'donor');

      // Food request stats
      const [pendingRequests, completedDeliveries] = await Promise.all([
        supabase.from('food_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('food_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);

      setStats({
        pendingNGOs: pendingNGOs.count || 0,
        approvedNGOs: approvedNGOs.count || 0,
        rejectedNGOs: rejectedNGOs.count || 0,
        pendingVolunteers: pendingVolunteers.count || 0,
        approvedVolunteers: approvedVolunteers.count || 0,
        rejectedVolunteers: rejectedVolunteers.count || 0,
        activeDonors: donors.count || 0,
        pendingFoodRequests: pendingRequests.count || 0,
        completedDeliveries: completedDeliveries.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPendingNGOs = async () => {
    try {
      const { data: ngos, error: ngosError } = await supabase
        .from('ngo_details')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true });

      if (ngosError) throw ngosError;

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

      fetchData();
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

      fetchData();
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

  const totalPendingVerifications = stats.pendingNGOs + stats.pendingVolunteers;

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
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Verifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">{totalPendingVerifications}</div>
                <p className="text-xs text-muted-foreground">{stats.pendingNGOs} NGOs, {stats.pendingVolunteers} Volunteers</p>
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
                <div className="text-3xl font-bold text-success">{stats.approvedNGOs}</div>
                <p className="text-xs text-muted-foreground">{stats.rejectedNGOs} rejected</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Verified Volunteers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{stats.approvedVolunteers}</div>
                <p className="text-xs text-muted-foreground">{stats.rejectedVolunteers} rejected</p>
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
                <div className="text-3xl font-bold">{stats.activeDonors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Completed Deliveries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.completedDeliveries}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">
                <TrendingUp className="h-4 w-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="ngo-verification">
                <Building2 className="h-4 w-4 mr-1" />
                NGO Verification
                {stats.pendingNGOs > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.pendingNGOs}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="volunteer-verification">
                <Users className="h-4 w-4 mr-1" />
                Volunteer Verification
                {stats.pendingVolunteers > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.pendingVolunteers}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="food-requests">
                <UtensilsCrossed className="h-4 w-4 mr-1" />
                Food Requests
                {stats.pendingFoodRequests > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.pendingFoodRequests}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="map">
                <MapPin className="h-4 w-4 mr-1" />
                Map View
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* NGO Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      NGO Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-warning" />
                          Pending
                        </span>
                        <Badge variant="outline" className="bg-warning/10 text-warning">{stats.pendingNGOs}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Approved
                        </span>
                        <Badge variant="outline" className="bg-success/10 text-success">{stats.approvedNGOs}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          Rejected
                        </span>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive">{stats.rejectedNGOs}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Volunteer Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Volunteer Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-warning" />
                          Pending
                        </span>
                        <Badge variant="outline" className="bg-warning/10 text-warning">{stats.pendingVolunteers}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Approved
                        </span>
                        <Badge variant="outline" className="bg-success/10 text-success">{stats.approvedVolunteers}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          Rejected
                        </span>
                        <Badge variant="outline" className="bg-destructive/10 text-destructive">{stats.rejectedVolunteers}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Platform Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-primary" />
                          Active Donors
                        </span>
                        <Badge variant="outline">{stats.activeDonors}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <UtensilsCrossed className="h-4 w-4 text-warning" />
                          Pending Requests
                        </span>
                        <Badge variant="outline" className="bg-warning/10 text-warning">{stats.pendingFoodRequests}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Completed
                        </span>
                        <Badge variant="outline" className="bg-success/10 text-success">{stats.completedDeliveries}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              {totalPendingVerifications > 0 && (
                <Alert className="bg-warning/10 border-warning">
                  <Clock className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">Action Required</AlertTitle>
                  <AlertDescription>
                    You have {totalPendingVerifications} pending verification{totalPendingVerifications > 1 ? 's' : ''} to review.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* NGO Verification Tab */}
            <TabsContent value="ngo-verification" className="space-y-6">
              {pendingNGOs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <CheckCircle2 className="h-8 w-8 text-success" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                      <p className="text-muted-foreground">No pending NGO verifications.</p>
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
                                <li key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{doc.document_type.replace('_', ' ')}</span>
                                  </div>
                                  <a
                                    href={doc.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-sm flex items-center gap-1"
                                  >
                                    View <ExternalLink className="h-3 w-3" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
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

            {/* Volunteer Verification Tab */}
            <TabsContent value="volunteer-verification">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Pending Volunteer Verifications
                  </CardTitle>
                  <CardDescription>
                    Review and approve volunteer applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminVolunteerVerification />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Food Requests Tab */}
            <TabsContent value="food-requests">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Pending Food Requests
                  </CardTitle>
                  <CardDescription>
                    Review and approve food requests from verified NGOs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminFoodRequestReview />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    NGO Locations
                  </CardTitle>
                  <CardDescription>
                    View all pending NGO locations on the map
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const markers: MapMarker[] = pendingNGOs
                      .filter((ngo) => ngo.latitude && ngo.longitude)
                      .map((ngo) => ({
                        id: ngo.id,
                        lat: ngo.latitude!,
                        lng: ngo.longitude!,
                        title: ngo.organization_name,
                        type: 'ngo' as const,
                        description: `${ngo.city}, ${ngo.state}`,
                      }));

                    return markers.length > 0 ? (
                      <LocationMap
                        markers={markers}
                        height="500px"
                        onMarkerClick={(marker) => {
                          const ngo = pendingNGOs.find((n) => n.id === marker.id);
                          if (ngo) {
                            alert(`NGO: ${ngo.organization_name}\nAddress: ${ngo.address}, ${ngo.city}`);
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No NGOs with location data yet.</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
