import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Leaf, Package, Heart, CheckCircle2, User, Phone } from 'lucide-react';
import { DonorFoodRequestList } from '@/components/food-requests';

export default function DonorDashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    availableRequests: 0,
    myDonations: 0,
    completedDonations: 0,
  });

  useEffect(() => {
    if (!authLoading && (!user || role !== 'donor')) {
      navigate('/auth');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      // Fetch available requests count
      const { count: availableCount } = await supabase
        .from('food_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .is('donor_id', null);

      // Fetch my active donations
      const { count: myActiveCount } = await supabase
        .from('food_requests')
        .select('*', { count: 'exact', head: true })
        .eq('donor_id', user.id)
        .in('status', ['matched', 'in_progress']);

      // Fetch completed donations
      const { count: completedCount } = await supabase
        .from('food_requests')
        .select('*', { count: 'exact', head: true })
        .eq('donor_id', user.id)
        .eq('status', 'completed');

      setStats({
        availableRequests: availableCount || 0,
        myDonations: myActiveCount || 0,
        completedDonations: completedCount || 0,
      });
    };

    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('donor-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_requests' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
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
            <Leaf className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Donor Dashboard</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Welcome, Donor!</h1>
            <p className="text-muted-foreground">Thank you for helping reduce food waste</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Available Requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.availableRequests}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>My Active Donations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.myDonations}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed Donations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-3xl font-bold">{stats.completedDonations}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="available" className="space-y-4">
            <TabsList>
              <TabsTrigger value="available">Available Requests</TabsTrigger>
              <TabsTrigger value="my-donations">My Donations</TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              <DonorFoodRequestList />
            </TabsContent>

            <TabsContent value="my-donations">
              <MyDonationsList userId={user?.id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// Component to show donor's accepted donations
interface DonationWithVolunteer {
  id: string;
  title: string;
  description: string | null;
  quantity_needed: number;
  quantity_unit: string;
  status: string;
  volunteer_id: string | null;
  volunteer_info?: { full_name: string; phone_number: string } | null;
}

function MyDonationsList({ userId }: { userId?: string }) {
  const [donations, setDonations] = useState<DonationWithVolunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('food_requests')
        .select('*')
        .eq('donor_id', userId)
        .in('status', ['matched', 'in_progress', 'completed'])
        .order('updated_at', { ascending: false });

      if (!error && data) {
        // Fetch volunteer info for donations with volunteer_id
        const volunteerIds = [...new Set(data.filter(d => d.volunteer_id).map(d => d.volunteer_id))];
        
        let volunteerMap = new Map<string, { full_name: string; phone_number: string }>();
        if (volunteerIds.length > 0) {
          const { data: volunteersData } = await supabase
            .from('volunteer_details')
            .select('user_id, full_name, phone_number')
            .in('user_id', volunteerIds);
          
          if (volunteersData) {
            volunteerMap = new Map(volunteersData.map(v => [v.user_id, { full_name: v.full_name, phone_number: v.phone_number }]));
          }
        }

        const donationsWithVolunteer = data.map(donation => ({
          ...donation,
          volunteer_info: donation.volunteer_id ? volunteerMap.get(donation.volunteer_id) || null : null,
        }));

        setDonations(donationsWithVolunteer);
      }
      setLoading(false);
    };

    fetchDonations();

    const channel = supabase
      .channel('my-donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_requests' }, fetchDonations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No donations yet</h3>
            <p className="text-muted-foreground">
              When you accept a food request, it will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusLabels: Record<string, { label: string; className: string }> = {
    matched: { label: 'Matched', className: 'bg-primary text-primary-foreground' },
    in_progress: { label: 'In Progress', className: 'bg-warning text-warning-foreground' },
    completed: { label: 'Completed', className: 'bg-success text-success-foreground' },
  };

  return (
    <div className="space-y-4">
      {donations.map((donation) => {
        const status = statusLabels[donation.status] || { label: donation.status, className: 'bg-muted' };
        const showVolunteerInfo = donation.volunteer_info && ['in_progress', 'completed'].includes(donation.status);
        
        return (
          <Card key={donation.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{donation.title}</CardTitle>
                  <CardDescription>
                    {donation.quantity_needed} {donation.quantity_unit}
                  </CardDescription>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                  {status.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {donation.description && (
                <p className="text-sm text-muted-foreground">{donation.description}</p>
              )}

              {/* Volunteer Contact Info */}
              {showVolunteerInfo && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs font-medium text-primary mb-2">Volunteer Contact</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{donation.volunteer_info!.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <a 
                        href={`tel:${donation.volunteer_info!.phone_number}`}
                        className="text-primary hover:underline"
                      >
                        {donation.volunteer_info!.phone_number}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
