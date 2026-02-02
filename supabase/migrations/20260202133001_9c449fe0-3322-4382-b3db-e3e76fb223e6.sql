-- Add volunteer_id column to food_requests table
ALTER TABLE public.food_requests
ADD COLUMN volunteer_id uuid NULL;

-- Add RLS policy for volunteers to update requests they've accepted
CREATE POLICY "Volunteers can update their accepted requests"
ON public.food_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'volunteer'::app_role) 
  AND status = 'matched'::food_request_status
)
WITH CHECK (
  has_role(auth.uid(), 'volunteer'::app_role) 
  AND volunteer_id = auth.uid() 
  AND status = 'in_progress'::food_request_status
);