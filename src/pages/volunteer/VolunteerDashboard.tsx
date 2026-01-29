import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Users, Truck, Clock, MapPin, Navigation, UtensilsCrossed } from 'lucide-react';
import { LocationMap, MapMarker } from '@/components/maps/LocationMap';
import { useUserLocation } from '@/hooks/useUserLocation';
import { formatDistance, calculateDistance } from '@/lib/distance';
import { VolunteerFoodRequestList } from '@/components/food-requests';

interface ApprovedNGO {
  id: string;
  organization_name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export default function VolunteerDashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { location: userLocation, loading: locationLoading, error: locationError, refresh: refreshLocation } = useUserLocation(true);
  
  const [approvedNGOs, setApprovedNGOs] = useState<ApprovedNGO[]>([]);
  const [loadingNGOs, setLoadingNGOs] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'volunteer')) {
      navigate('/auth');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    fetchApprovedNGOs();
  }, []);

  const fetchApprovedNGOs = async () => {
    try {
      const { data, error } = await supabase
        .from('ngo_details')
        .select('id, organization_name, address, city, state, latitude, longitude')
        .eq('verification_status', 'approved')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      setApprovedNGOs((data || []) as ApprovedNGO[]);
    } catch (error) {
      console.error('Error fetching NGOs:', error);
    } finally {
      setLoadingNGOs(false);
    }
  };

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

  // Calculate distances and sort NGOs
  const ngosWithDistance = userLocation
    ? approvedNGOs
        .map((ngo) => ({
          ...ngo,
          distance: calculateDistance(userLocation.lat, userLocation.lng, ngo.latitude, ngo.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)
    : approvedNGOs.map((ngo) => ({ ...ngo, distance: null as number | null }));

  // Create map markers
  const markers: MapMarker[] = [
    ...(userLocation
      ? [
          {
            id: 'user-location',
            lat: userLocation.lat,
            lng: userLocation.lng,
            title: 'Your Location',
            type: 'volunteer' as const,
            description: 'You are here',
          },
        ]
      : []),
    ...approvedNGOs.map((ngo) => ({
      id: ngo.id,
      lat: ngo.latitude,
      lng: ngo.longitude,
      title: ngo.organization_name,
      type: 'ngo' as const,
      description: `${ngo.city}, ${ngo.state}`,
    })),
  ];

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
                <CardDescription>Nearby NGOs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{approvedNGOs.length}</div>
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

          {/* Tabs for Map and List view */}
          <Tabs defaultValue="map" className="space-y-6">
            <TabsList>
              <TabsTrigger value="map">
                <MapPin className="h-4 w-4 mr-2" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="list">
                <Navigation className="h-4 w-4 mr-2" />
                Nearby NGOs
              </TabsTrigger>
              <TabsTrigger value="deliveries">
                <Truck className="h-4 w-4 mr-2" />
                Available Deliveries
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    NGO Locations Near You
                  </CardTitle>
                  <CardDescription>
                    {locationLoading
                      ? 'Getting your location...'
                      : locationError
                      ? `Location error: ${locationError}`
                      : userLocation
                      ? 'Showing verified NGOs in your area'
                      : 'Enable location to see distances'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingNGOs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <LocationMap
                      markers={markers}
                      height="400px"
                      showUserLocation={false}
                      center={userLocation ? [userLocation.lat, userLocation.lng] : undefined}
                      zoom={userLocation ? 12 : 5}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Nearby NGOs</CardTitle>
                      <CardDescription>Verified NGOs sorted by distance from your location</CardDescription>
                    </div>
                    {!userLocation && !locationLoading && (
                      <Button variant="outline" size="sm" onClick={refreshLocation}>
                        <Navigation className="h-4 w-4 mr-2" />
                        Get Location
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingNGOs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : ngosWithDistance.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No verified NGOs with locations yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ngosWithDistance.map((ngo) => (
                        <div
                          key={ngo.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{ngo.organization_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {ngo.address}, {ngo.city}
                              </p>
                            </div>
                          </div>
                          {ngo.distance !== null && (
                            <div className="text-right">
                              <span className="text-lg font-semibold text-primary">
                                {formatDistance(ngo.distance)}
                              </span>
                              <p className="text-xs text-muted-foreground">away</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deliveries">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Available Deliveries
                  </CardTitle>
                  <CardDescription>
                    Food requests that need delivery assistance, sorted by urgency and distance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VolunteerFoodRequestList userLocation={userLocation} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
