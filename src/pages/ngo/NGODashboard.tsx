import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Clock, LogOut, Building2, FileText, Plus } from 'lucide-react';
import { CreateFoodRequestDialog, FoodRequestList } from '@/components/food-requests';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface NGODetails {
  id: string;
  organization_name: string;
  verification_status: VerificationStatus;
  latitude: number | null;
  longitude: number | null;
}

export default function NGODashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ngoDetails, setNgoDetails] = useState<NGODetails | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'ngo')) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchNGODetails();
    }
  }, [user, role, authLoading, navigate]);

  const fetchNGODetails = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ngo_details')
        .select('id, organization_name, verification_status, latitude, longitude')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setNgoDetails(data as unknown as NGODetails);
    } catch (error) {
      console.error('Error fetching NGO details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no NGO details, redirect to verification
  if (!ngoDetails) {
    return (
      <div className="min-h-screen bg-muted/30 p-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                You need to complete your NGO verification before you can access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/ngo/verification')}>
                <FileText className="h-4 w-4 mr-2" />
                Start Verification
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If pending verification
  if (ngoDetails.verification_status === 'pending') {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">{ngoDetails.organization_name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </header>

        <main className="p-8">
          <div className="mx-auto max-w-2xl">
            <Alert className="bg-warning/10 border-warning">
              <Clock className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning">Verification Pending</AlertTitle>
              <AlertDescription>
                Your NGO verification is being reviewed by our admin team. This usually takes 1-2 business days.
                You will be able to create food requests once approved.
              </AlertDescription>
            </Alert>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>While you wait...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Here's what you can do while waiting for verification:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Ensure all your documents are correctly uploaded</li>
                  <li>Verify your organization details are accurate</li>
                  <li>Prepare information about your food needs</li>
                </ul>
                <Button variant="outline" onClick={() => navigate('/ngo/verification')}>
                  Review Submitted Information
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // If rejected
  if (ngoDetails.verification_status === 'rejected') {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">{ngoDetails.organization_name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </header>

        <main className="p-8">
          <div className="mx-auto max-w-2xl">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Rejected</AlertTitle>
              <AlertDescription>
                Your NGO verification was rejected. Please update your information and resubmit.
              </AlertDescription>
            </Alert>

            <Card className="mt-6">
              <CardContent className="pt-6">
                <Button onClick={() => navigate('/ngo/verification')}>
                  Resubmit Verification
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Approved - Full Dashboard
  return <ApprovedNGODashboard ngoDetails={ngoDetails} onSignOut={handleSignOut} />;
}

// Extract approved dashboard to a separate component for cleanliness
function ApprovedNGODashboard({ 
  ngoDetails, 
  onSignOut 
}: { 
  ngoDetails: NGODetails; 
  onSignOut: () => void;
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const ngoLocation = ngoDetails.latitude && ngoDetails.longitude
    ? { latitude: ngoDetails.latitude, longitude: ngoDetails.longitude }
    : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <span className="text-xl font-bold">{ngoDetails.organization_name}</span>
              <span className="ml-2 inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Manage your food requests and donations</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Food Request
            </Button>
          </div>

          {/* Food Request List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Food Requests</CardTitle>
              <CardDescription>
                Track the status of your food donation requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FoodRequestList 
                ngoId={ngoDetails.id} 
                refreshTrigger={refreshTrigger}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <CreateFoodRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        ngoId={ngoDetails.id}
        ngoLocation={ngoLocation}
        onSuccess={() => setRefreshTrigger((t) => t + 1)}
      />
    </div>
  );
}
