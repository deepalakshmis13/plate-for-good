import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, LogOut, Users, Truck, Clock, AlertCircle } from 'lucide-react';

export default function VolunteerDashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'volunteer')) {
      navigate('/auth');
    }
  }, [user, role, authLoading, navigate]);

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

  // For now show pending verification (volunteer verification not yet implemented)
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Volunteer Dashboard</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="mx-auto max-w-6xl">
          <Alert className="mb-8 bg-warning/10 border-warning">
            <Clock className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Verification Required</AlertTitle>
            <AlertDescription>
              Volunteer verification is coming soon. You will be able to upload your ID proof and get verified to start helping with deliveries.
            </AlertDescription>
          </Alert>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">Welcome, Volunteer!</h1>
            <p className="text-muted-foreground">Help us bridge the gap between donors and NGOs</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Deliveries Available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Your Deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Meals Delivered</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Distance Traveled (km)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          {/* Empty state */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No deliveries available</h3>
                <p className="text-muted-foreground mb-4">
                  When donors need help with deliveries, they will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
