import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { GeoTaggedPhotoUpload, PhotoWithGeo } from './GeoTaggedPhotoUpload';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { UrgencyLevel } from './types';

interface CreateFoodRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ngoId: string;
  ngoLocation?: { latitude: number; longitude: number } | null;
  onSuccess: () => void;
}

export function CreateFoodRequestDialog({
  open,
  onOpenChange,
  ngoId,
  ngoLocation,
  onSuccess,
}: CreateFoodRequestDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState<number>(10);
  const [quantityUnit, setQuantityUnit] = useState('meals');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('normal');
  const [neededBy, setNeededBy] = useState<Date | undefined>();
  const [latitude, setLatitude] = useState<number | null>(ngoLocation?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(ngoLocation?.longitude ?? null);
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<PhotoWithGeo[]>([]);

  // Convert ngoLocation to the format LocationPicker expects
  const initialLocation = ngoLocation 
    ? { lat: ngoLocation.latitude, lng: ngoLocation.longitude }
    : null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setQuantityNeeded(10);
    setQuantityUnit('meals');
    setUrgencyLevel('normal');
    setNeededBy(undefined);
    setLatitude(ngoLocation?.latitude ?? null);
    setLongitude(ngoLocation?.longitude ?? null);
    setAddress('');
    setPhotos([]);
  };

  const handleLocationChange = (loc: { lat: number; lng: number; address?: string }) => {
    setLatitude(loc.lat);
    setLongitude(loc.lng);
    if (loc.address) {
      setAddress(loc.address);
    }
  };

  const uploadPhotos = async (requestId: string): Promise<void> => {
    if (!user || photos.length === 0) return;

    for (const photo of photos) {
      const fileExt = photo.file.name.split('.').pop();
      const fileName = `${user.id}/${requestId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('food-request-photos')
        .upload(fileName, photo.file);

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('food-request-photos')
        .getPublicUrl(fileName);

      await supabase.from('food_request_photos').insert({
        request_id: requestId,
        user_id: user.id,
        photo_url: urlData.publicUrl,
        file_name: photo.file.name,
        latitude: photo.latitude,
        longitude: photo.longitude,
        captured_at: photo.capturedAt.toISOString(),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a title for your request.',
        variant: 'destructive',
      });
      return;
    }

    if (quantityNeeded < 1) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be at least 1.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: requestData, error: requestError } = await supabase
        .from('food_requests')
        .insert({
          ngo_id: ngoId,
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          quantity_needed: quantityNeeded,
          quantity_unit: quantityUnit,
          urgency_level: urgencyLevel,
          latitude,
          longitude,
          address: address.trim() || null,
          needed_by: neededBy?.toISOString() ?? null,
        })
        .select('id')
        .single();

      if (requestError) throw requestError;

      // Upload photos
      await uploadPhotos(requestData.id);

      toast({
        title: 'Request Created',
        description: 'Your food request has been submitted for admin approval.',
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create food request.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Food Request</DialogTitle>
          <DialogDescription>
            Submit a request for food donation. Include photos and location for faster matching.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Lunch for 50 children"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your food needs, dietary restrictions, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Needed *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={10000}
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(parseInt(e.target.value) || 1)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={quantityUnit} onValueChange={setQuantityUnit} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meals">Meals</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="portions">Portions</SelectItem>
                  <SelectItem value="boxes">Boxes</SelectItem>
                  <SelectItem value="packets">Packets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Urgency & Needed By */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Urgency Level</Label>
              <Select value={urgencyLevel} onValueChange={(v) => setUrgencyLevel(v as UrgencyLevel)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Needed By</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !neededBy && 'text-muted-foreground'
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {neededBy ? format(neededBy, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={neededBy}
                    onSelect={setNeededBy}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Delivery Address</Label>
            <Input
              id="address"
              placeholder="Where should donations be delivered?"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
              maxLength={200}
            />
          </div>

          {/* Location Picker */}
          <div className="space-y-2">
            <Label>Delivery Location</Label>
            <LocationPicker
              value={latitude && longitude ? { lat: latitude, lng: longitude } : initialLocation}
              onChange={handleLocationChange}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photos (Optional)</Label>
            <GeoTaggedPhotoUpload
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
