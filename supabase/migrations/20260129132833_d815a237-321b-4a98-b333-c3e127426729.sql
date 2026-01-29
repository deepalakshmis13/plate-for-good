-- Add donor_id column to track which donor accepted/matched with a food request
ALTER TABLE public.food_requests 
ADD COLUMN donor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster donor queries
CREATE INDEX idx_food_requests_donor_id ON public.food_requests(donor_id);

-- Add policy for donors to update requests they want to accept
CREATE POLICY "Donors can accept approved requests"
ON public.food_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'donor') 
  AND status = 'approved'
)
WITH CHECK (
  has_role(auth.uid(), 'donor')
  AND donor_id = auth.uid()
  AND status = 'matched'
);