-- Create food request status enum
CREATE TYPE public.food_request_status AS ENUM ('pending', 'approved', 'matched', 'in_progress', 'completed', 'cancelled');

-- Create food_requests table
CREATE TABLE public.food_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES public.ngo_details(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quantity_needed INTEGER NOT NULL CHECK (quantity_needed > 0),
  quantity_unit TEXT NOT NULL DEFAULT 'meals',
  urgency_level TEXT NOT NULL DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'critical')),
  status food_request_status NOT NULL DEFAULT 'pending',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  needed_by TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create food_request_photos table for geo-tagged photos
CREATE TABLE public.food_request_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.food_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_request_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for food_requests
CREATE POLICY "NGOs can view their own requests"
ON public.food_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "NGOs can insert their own requests"
ON public.food_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "NGOs can update their own pending requests"
ON public.food_requests FOR UPDATE
USING (auth.uid() = user_id AND status IN ('pending', 'approved'));

CREATE POLICY "NGOs can delete their own pending requests"
ON public.food_requests FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all requests"
ON public.food_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all requests"
ON public.food_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Donors can view approved requests"
ON public.food_requests FOR SELECT
USING (has_role(auth.uid(), 'donor') AND status IN ('approved', 'matched', 'in_progress', 'completed'));

CREATE POLICY "Volunteers can view matched requests"
ON public.food_requests FOR SELECT
USING (has_role(auth.uid(), 'volunteer') AND status IN ('matched', 'in_progress', 'completed'));

-- RLS policies for food_request_photos
CREATE POLICY "Users can view photos of accessible requests"
ON public.food_request_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.food_requests fr 
    WHERE fr.id = request_id 
    AND (
      fr.user_id = auth.uid() 
      OR has_role(auth.uid(), 'admin')
      OR (has_role(auth.uid(), 'donor') AND fr.status IN ('approved', 'matched', 'in_progress', 'completed'))
      OR (has_role(auth.uid(), 'volunteer') AND fr.status IN ('matched', 'in_progress', 'completed'))
    )
  )
);

CREATE POLICY "NGOs can insert photos for their requests"
ON public.food_request_photos FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.food_requests fr 
    WHERE fr.id = request_id AND fr.user_id = auth.uid()
  )
);

CREATE POLICY "NGOs can delete their own photos"
ON public.food_request_photos FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for food request photos
INSERT INTO storage.buckets (id, name, public) VALUES ('food-request-photos', 'food-request-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view food request photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-request-photos');

CREATE POLICY "Authenticated users can upload food request photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-request-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'food-request-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add updated_at trigger
CREATE TRIGGER update_food_requests_updated_at
BEFORE UPDATE ON public.food_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for food_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests;