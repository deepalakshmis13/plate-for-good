import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Leaf, Heart, Users, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AppRole = 'ngo' | 'donor' | 'volunteer';

const roleInfo = {
  ngo: {
    icon: Heart,
    title: 'NGO',
    description: 'Create food requests and receive donations',
  },
  donor: {
    icon: Leaf,
    title: 'Donor',
    description: 'Donate surplus food to those in need',
  },
  volunteer: {
    icon: Users,
    title: 'Volunteer',
    description: 'Help deliver food from donors to NGOs',
  },
};

export default function Auth() {
  const { user, role, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('donor');
  
  // Form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && role) {
    // Redirect based on role
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'ngo') return <Navigate to="/ngo" replace />;
    if (role === 'donor') return <Navigate to="/donor" replace />;
    if (role === 'volunteer') return <Navigate to="/volunteer" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(signInEmail, signInPassword);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
    }

    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpPassword !== signUpConfirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
      });
      return;
    }

    if (signUpPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await signUp(signUpEmail, signUpPassword, fullName, selectedRole);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'Welcome to SmartPlate. Please complete your profile.',
      });
      
      // Navigate based on role
      if (selectedRole === 'ngo') {
        navigate('/ngo/verification');
      } else if (selectedRole === 'volunteer') {
        navigate('/volunteer/verification');
      } else {
        navigate('/donor');
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center items-center p-12 text-primary-foreground">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Leaf className="h-16 w-16" />
            <h1 className="text-5xl font-bold">SmartPlate</h1>
          </div>
          <p className="text-2xl mb-4">Zero Hunger, Zero Waste</p>
          <p className="text-lg opacity-90">
            A secure, AI-assisted food redistribution platform connecting NGOs, donors, and volunteers to reduce food waste and hunger.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-primary-foreground/20 rounded-full p-4 w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                <Shield className="h-8 w-8" />
              </div>
              <p className="text-sm">Verified NGOs</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-foreground/20 rounded-full p-4 w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                <Heart className="h-8 w-8" />
              </div>
              <p className="text-sm">Trusted Donors</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-foreground/20 rounded-full p-4 w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                <Users className="h-8 w-8" />
              </div>
              <p className="text-sm">Active Volunteers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 lg:hidden mb-4">
              <Leaf className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">SmartPlate</span>
            </div>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Full Name</Label>
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>I want to join as</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleInfo).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <info.icon className="h-4 w-4" />
                              <span>{info.title}</span>
                              <span className="text-muted-foreground text-xs">- {info.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
