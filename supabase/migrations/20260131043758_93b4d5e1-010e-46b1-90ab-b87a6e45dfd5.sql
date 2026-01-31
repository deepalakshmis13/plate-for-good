-- Create volunteer_details table for volunteer verification
CREATE TABLE public.volunteer_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  government_id_type TEXT NOT NULL,
  government_id_number TEXT NOT NULL,
  associated_organization TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.volunteer_details ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_volunteer_details_user_id ON public.volunteer_details(user_id);
CREATE INDEX idx_volunteer_details_status ON public.volunteer_details(verification_status);

-- RLS Policies

-- Volunteers can view their own details
CREATE POLICY "Volunteers can view their own details"
ON public.volunteer_details
FOR SELECT
USING (auth.uid() = user_id);

-- Volunteers can insert their own details
CREATE POLICY "Volunteers can insert their own details"
ON public.volunteer_details
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Volunteers can update their own details while pending
CREATE POLICY "Volunteers can update their own pending details"
ON public.volunteer_details
FOR UPDATE
USING (auth.uid() = user_id AND verification_status = 'pending');

-- Admins can view all volunteer details
CREATE POLICY "Admins can view all volunteer details"
ON public.volunteer_details
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all volunteer details
CREATE POLICY "Admins can update all volunteer details"
ON public.volunteer_details
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_volunteer_details_updated_at
BEFORE UPDATE ON public.volunteer_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for volunteer documents
INSERT INTO storage.buckets (id, name, public) VALUES ('volunteer-documents', 'volunteer-documents', false);

-- Storage policies for volunteer documents
CREATE POLICY "Volunteers can upload their documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'volunteer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Volunteers can view their own documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'volunteer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all volunteer documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'volunteer-documents' AND has_role(auth.uid(), 'admin'));