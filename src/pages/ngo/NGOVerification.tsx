import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle2, Clock, XCircle, FileText, Building2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LocationPicker } from '@/components/maps/LocationPicker';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface NGODetails {
  organization_name: string;
  registration_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  verification_status: VerificationStatus;
  rejection_reason?: string;
}

interface VerificationDocument {
  id: string;
  document_type: string;
  file_name: string;
  document_url: string;
  uploaded_at: string;
}

export default function NGOVerification() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingDetails, setExistingDetails] = useState<NGODetails | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);

  // Form state
  const [formData, setFormData] = useState<Omit<NGODetails, 'verification_status' | 'rejection_reason'>>({
    organization_name: '',
    registration_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    description: '',
    latitude: null,
    longitude: null,
  });

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'ngo')) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchExistingData();
    }
  }, [user, role, authLoading, navigate]);

  const fetchExistingData = async () => {
    if (!user) return;

    try {
      // Fetch NGO details
      const { data: ngoData, error: ngoError } = await supabase
        .from('ngo_details')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ngoError) throw ngoError;

      if (ngoData) {
        setExistingDetails(ngoData as unknown as NGODetails);
        setFormData({
          organization_name: ngoData.organization_name,
          registration_number: ngoData.registration_number,
          address: ngoData.address,
          city: ngoData.city,
          state: ngoData.state,
          pincode: ngoData.pincode,
          website: ngoData.website || '',
          description: ngoData.description || '',
          latitude: ngoData.latitude,
          longitude: ngoData.longitude,
        });
      }

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData as unknown as VerificationDocument[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('ngo_details').upsert({
        user_id: user.id,
        ...formData,
        verification_status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Details saved!',
        description: 'Please upload your verification documents.',
      });

      setStep(2);
      fetchExistingData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving details',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    if (!user) return;

    setUploadingDoc(docType);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docType}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      // Save document record
      const { error: dbError } = await supabase.from('verification_documents').insert({
        user_id: user.id,
        document_type: docType,
        file_name: file.name,
        document_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Document uploaded!',
        description: `${docType} has been uploaded successfully.`,
      });

      fetchExistingData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    const classes = {
      pending: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      rejected: 'status-badge status-rejected',
    };
    return (
      <span className={classes[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already verified, show success and redirect option
  if (existingDetails?.verification_status === 'approved') {
    return (
      <div className="min-h-screen bg-muted/30 p-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verification Approved!</h2>
                <p className="text-muted-foreground mb-6">
                  Your NGO has been verified. You can now create food requests.
                </p>
                <Button onClick={() => navigate('/ngo')}>Go to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If rejected, show rejection reason
  if (existingDetails?.verification_status === 'rejected') {
    return (
      <div className="min-h-screen bg-muted/30 p-8">
        <div className="mx-auto max-w-2xl">
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Verification Rejected</AlertTitle>
            <AlertDescription>
              {existingDetails.rejection_reason || 'Your verification was rejected. Please contact support.'}
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Resubmit Verification</CardTitle>
              <CardDescription>
                Please update your information and resubmit for verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setStep(1)} variant="outline">
                Edit Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const requiredDocs = [
    { type: 'registration_certificate', label: 'Registration Certificate', description: 'NGO registration/incorporation document' },
    { type: 'address_proof', label: 'Address Proof', description: 'Utility bill, lease agreement, or official letter' },
  ];

  const hasAllDocs = requiredDocs.every((doc) =>
    documents.some((d) => d.document_type === doc.type)
  );

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">NGO Verification</h1>
          </div>
          <p className="text-muted-foreground">
            Complete the verification process to start receiving food donations
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className={step >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              1. Organization Details
            </span>
            <span className={step >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              2. Upload Documents
            </span>
            <span className={step >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              3. Review
            </span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        {/* Step 1: Organization Details */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Provide accurate information about your NGO. This will be verified by our admin team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitDetails} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization_name">Organization Name *</Label>
                    <Input
                      id="organization_name"
                      name="organization_name"
                      value={formData.organization_name}
                      onChange={handleInputChange}
                      placeholder="Helping Hands Foundation"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration_number">Registration Number *</Label>
                    <Input
                      id="registration_number"
                      name="registration_number"
                      value={formData.registration_number}
                      onChange={handleInputChange}
                      placeholder="NGO/2024/12345"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main Street, Building A"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Mumbai"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Maharashtra"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="400001"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://www.yourorganization.org"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Tell us about your organization's mission and the communities you serve..."
                    rows={4}
                  />
                </div>

                {/* Location Picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Organization Location *
                  </Label>
                  <LocationPicker
                    value={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : null}
                    onChange={(location) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: location.lat,
                        longitude: location.lng,
                      }));
                    }}
                    placeholder="Select your organization's location on the map for distance-based matching"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Documents */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Upload Verification Documents</CardTitle>
              <CardDescription>
                Upload the required documents to verify your organization's authenticity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {requiredDocs.map((doc) => {
                const uploaded = documents.find((d) => d.document_type === doc.type);
                return (
                  <div
                    key={doc.type}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">{doc.label}</h4>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                        {uploaded && (
                          <p className="text-sm text-success flex items-center gap-1 mt-1">
                            <CheckCircle2 className="h-4 w-4" />
                            {uploaded.file_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <input
                        type="file"
                        id={doc.type}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(doc.type, e.target.files[0]);
                          }
                        }}
                      />
                      <Button
                        variant={uploaded ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => document.getElementById(doc.type)?.click()}
                        disabled={uploadingDoc === doc.type}
                      >
                        {uploadingDoc === doc.type ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploaded ? 'Replace' : 'Upload'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!hasAllDocs}>
                  Continue to Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>
                Review your information before submitting for verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <Alert>
                {getStatusIcon(existingDetails?.verification_status || 'pending')}
                <AlertTitle className="ml-2">
                  Verification Status: {getStatusBadge(existingDetails?.verification_status || 'pending')}
                </AlertTitle>
                <AlertDescription className="ml-2">
                  Your application is being reviewed by our admin team. This usually takes 1-2 business days.
                </AlertDescription>
              </Alert>

              {/* Organization Summary */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Organization Details</h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{formData.organization_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registration No.</dt>
                    <dd className="font-medium">{formData.registration_number}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="font-medium">
                      {formData.address}, {formData.city}, {formData.state} - {formData.pincode}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Documents Summary */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Uploaded Documents</h4>
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="font-medium">{doc.document_type.replace('_', ' ')}</span>
                      <span className="text-muted-foreground">- {doc.file_name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={() => navigate('/ngo')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
