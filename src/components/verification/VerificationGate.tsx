import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, XCircle, Shield } from 'lucide-react';

type VerificationStatus = 'pending' | 'approved' | 'rejected' | null;

interface VerificationGateProps {
  status: VerificationStatus;
  rejectionReason?: string;
  role: 'ngo' | 'volunteer';
  verificationPath: string;
  children: ReactNode;
  loading?: boolean;
}

export function VerificationGate({
  status,
  rejectionReason,
  role,
  verificationPath,
  children,
  loading,
}: VerificationGateProps) {
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  // Not yet submitted verification
  if (status === null) {
    return (
      <Card className="mx-auto max-w-lg mt-8">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Required</h2>
            <p className="text-muted-foreground mb-6">
              Please complete the verification process to access all features.
            </p>
            <Button onClick={() => navigate(verificationPath)}>
              Start Verification
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending verification
  if (status === 'pending') {
    return (
      <Alert className="mx-auto max-w-lg mt-8 bg-warning/10 border-warning">
        <Clock className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Account Under Verification</AlertTitle>
        <AlertDescription>
          Your account is being reviewed by our admin team. You will be notified once your verification is complete.
          This usually takes 24-48 hours.
        </AlertDescription>
      </Alert>
    );
  }

  // Rejected
  if (status === 'rejected') {
    return (
      <div className="mx-auto max-w-lg mt-8 space-y-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Verification Rejected</AlertTitle>
          <AlertDescription>
            {rejectionReason || 'Your verification was rejected. Please update your information and resubmit.'}
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent className="pt-6 text-center">
            <Button onClick={() => navigate(verificationPath)}>
              Resubmit Verification
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved - show children
  return <>{children}</>;
}
