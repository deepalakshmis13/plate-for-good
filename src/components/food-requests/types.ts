export type FoodRequestStatus = 'pending' | 'approved' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

export interface FoodRequest {
  id: string;
  ngo_id: string;
  user_id: string;
  title: string;
  description: string | null;
  quantity_needed: number;
  quantity_unit: string;
  urgency_level: UrgencyLevel;
  status: FoodRequestStatus;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  needed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodRequestPhoto {
  id: string;
  request_id: string;
  user_id: string;
  photo_url: string;
  file_name: string;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  uploaded_at: string;
}

export interface CreateFoodRequestFormData {
  title: string;
  description: string;
  quantity_needed: number;
  quantity_unit: string;
  urgency_level: UrgencyLevel;
  latitude: number | null;
  longitude: number | null;
  address: string;
  needed_by: Date | null;
}
