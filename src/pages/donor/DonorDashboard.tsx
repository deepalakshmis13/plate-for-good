import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, Leaf, Package, TrendingUp, Heart } from 'lucide-react';

export default function DonorDashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'donor')) {
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Food Requests Available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Your Donations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Meals Provided</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Food Saved (kg)</CardDescription>
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
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No active food requests</h3>
                <p className="text-muted-foreground mb-4">
                  When verified NGOs create food requests, they will appear here for you to accept.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
