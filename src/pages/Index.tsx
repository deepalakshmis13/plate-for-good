import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Heart, Users, Shield, ArrowRight, MapPin, Zap, TrendingUp } from 'lucide-react';
export default function Index() {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">SmartPlate</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Leaf className="h-4 w-4" />
            SDG-2: Zero Hunger Initiative
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Connecting Surplus Food<br />
            <span className="text-primary">With Those Who Need It</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            SmartPlate is a secure, AI-assisted food redistribution platform that reduces food waste 
            and hunger by connecting verified NGOs, donors, and volunteers in real-time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Join the Movement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100+</div>
              <div className="text-muted-foreground">Meals Redistributed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10+</div>
              <div className="text-muted-foreground">Verified NGOs</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">20+</div>
              <div className="text-muted-foreground">Active Volunteers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50kg+</div>
              <div className="text-muted-foreground">Food Waste Prevented</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How SmartPlate Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A trusted ecosystem for food redistribution with verification, tracking, and AI-powered matching.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Verified NGOs</CardTitle>
                <CardDescription>
                  All NGOs undergo strict verification with document validation before they can request food.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Trusted Donors</CardTitle>
                <CardDescription>
                  Donors upload geo-tagged food photos for admin verification ensuring food quality and authenticity.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-info" />
                </div>
                <CardTitle>Verified Volunteers</CardTitle>
                <CardDescription>
                  Volunteers are verified with ID proof and help bridge the gap between donors and NGOs.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
                <Zap className="h-4 w-4" />
                AI-Powered
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Smart Matching & Logistics
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our AI assists with intelligent matching and logistics, but all decisions are reviewed and approved by admins to ensure quality and trust.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-success" />
                  </div>
                  <span>Urgency scoring for food requests</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-success" />
                  </div>
                  <span>Nearest location matching for efficient delivery</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-success" />
                  </div>
                  <span>Food spoilage risk prediction</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-success" />
                  </div>
                  <span>Partial fulfillment suggestions</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-medium">Live Tracking</div>
                  <div className="text-sm text-muted-foreground">Real-time location updates</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-medium">Fraud Prevention</div>
                  <div className="text-sm text-muted-foreground">Geo-tagged verification</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-medium">Analytics</div>
                  <div className="text-sm text-muted-foreground">Impact measurement</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="font-medium">Smart Matching</div>
                  <div className="text-sm text-muted-foreground">AI-assisted logistics</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join SmartPlate today and be part of the movement to eliminate food waste and hunger.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Sign Up as NGO
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Become a Donor
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Volunteer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">SmartPlate</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 SmartPlate. Supporting SDG-2: Zero Hunger.
            </p>
          </div>
        </div>
      </footer>
    </div>;
}