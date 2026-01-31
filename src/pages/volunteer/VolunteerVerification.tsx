import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, CheckCircle2, Clock, XCircle, FileText, Users, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LocationPicker } from '@/components/maps/LocationPicker';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface VolunteerDetails {
  full_name: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  government_id_type: string;
  government_id_number: string;
  associated_organization: string;
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

const ID_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'passport', label: 'Passport' },
];

export default function VolunteerVerification() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingDetails, setExistingDetails] = useState<VolunteerDetails | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);

  const [formData, setFormData] = useState<Omit<VolunteerDetails, 'verification_status' | 'rejection_reason'>>({
    full_name: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    government_id_type: '',
    government_id_number: '',
    associated_organization: '',
    latitude: null,
    longitude: null,
  });

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'volunteer')) {
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
      const { data: volunteerData, error: volunteerError } = await supabase
        .from('volunteer_details')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (volunteerError) throw volunteerError;

      if (volunteerData) {
        setExistingDetails(volunteerData as unknown as VolunteerDetails);
        setFormData({
          full_name: volunteerData.full_name,
          phone_number: volunteerData.phone_number,
          address: volunteerData.address,
          city: volunteerData.city,
          state: volunteerData.state,
          pincode: volunteerData.pincode,
          government_id_type: volunteerData.government_id_type,
          government_id_number: volunteerData.government_id_number,
          associated_organization: volunteerData.associated_organization || '',
          latitude: volunteerData.latitude,
          longitude: volunteerData.longitude,
        });
      }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const { error } = await supabase.from('volunteer_details').upsert({
        user_id: user.id,
        ...formData,
        verification_status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Details saved!',
        description: 'Please upload your government ID.',
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

      const { error: uploadError } = await supabase.storage
        .from('volunteer-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('volunteer-documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('verification_documents').insert({
        user_id: user.id,
        document_type: docType,
        file_name: file.name,
        document_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Document uploaded!',
        description: 'Your ID document has been uploaded successfully.',
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

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If approved, redirect to dashboard
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
                  You can now accept food deliveries.
                </p>
                <Button onClick={() => navigate('/volunteer')}>Go to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If rejected
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

  const hasIdDocument = documents.some((d) => d.document_type === 'government_id');

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Volunteer Verification</h1>
          </div>
          <p className="text-muted-foreground">
            Complete the verification process to start helping with deliveries
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className={step >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              1. Personal Details
            </span>
            <span className={step >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              2. Upload ID
            </span>
            <span className={step >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}>
              3. Review
            </span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>
                Provide your personal information for verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitDetails} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="+91 9876543210"
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
                    placeholder="123 Main Street, Apartment 4B"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Government ID Type *</Label>
                    <Select
                      value={formData.government_id_type}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, government_id_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ID_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="government_id_number">ID Number *</Label>
                    <Input
                      id="government_id_number"
                      name="government_id_number"
                      value={formData.government_id_number}
                      onChange={handleInputChange}
                      placeholder="XXXX-XXXX-XXXX"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="associated_organization">Associated Organization (Optional)</Label>
                  <Input
                    id="associated_organization"
                    name="associated_organization"
                    value={formData.associated_organization}
                    onChange={handleInputChange}
                    placeholder="E.g., Red Cross, Local Community Group"
                  />
                </div>

                {/* Location Picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Your Location (Optional)
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
                    placeholder="Select your location for distance-based delivery matching"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={submitting || !formData.government_id_type}>
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
              <CardTitle>Upload Government ID</CardTitle>
              <CardDescription>
                Upload a clear photo or scan of your {ID_TYPES.find(t => t.value === formData.government_id_type)?.label || 'ID'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Government ID Proof</h4>
                    <p className="text-sm text-muted-foreground">
                      {ID_TYPES.find(t => t.value === formData.government_id_type)?.label || 'ID document'}
                    </p>
                    {hasIdDocument && (
                      <p className="text-sm text-success flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Uploaded
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    id="government_id"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('government_id', file);
                    }}
                    disabled={uploadingDoc === 'government_id'}
                  />
                  <Button
                    variant={hasIdDocument ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => document.getElementById('government_id')?.click()}
                    disabled={uploadingDoc === 'government_id'}
                  >
                    {uploadingDoc === 'government_id' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {hasIdDocument ? 'Replace' : 'Upload'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!hasIdDocument}
                >
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
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Personal Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{formData.full_name}</dd></div>
                    <div><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{formData.phone_number}</dd></div>
                    <div><dt className="text-muted-foreground">Address</dt><dd className="font-medium">{formData.address}, {formData.city}, {formData.state} - {formData.pincode}</dd></div>
                    <div><dt className="text-muted-foreground">ID Type</dt><dd className="font-medium">{ID_TYPES.find(t => t.value === formData.government_id_type)?.label}</dd></div>
                    <div><dt className="text-muted-foreground">ID Number</dt><dd className="font-medium">{formData.government_id_number}</dd></div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Documents</h4>
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>{doc.document_type.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {existingDetails?.verification_status === 'pending' && (
                <Alert className="bg-warning/10 border-warning">
                  <Clock className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">Verification Pending</AlertTitle>
                  <AlertDescription>
                    Your application is under review by our admin team. You'll be notified once approved.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={() => navigate('/volunteer')}>
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
