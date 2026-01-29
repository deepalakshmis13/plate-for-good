import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, MapPin, Loader2 } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';

interface PhotoWithGeo {
  file: File;
  preview: string;
  latitude: number | null;
  longitude: number | null;
  capturedAt: Date;
}

interface GeoTaggedPhotoUploadProps {
  photos: PhotoWithGeo[];
  onPhotosChange: (photos: PhotoWithGeo[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function GeoTaggedPhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
}: GeoTaggedPhotoUploadProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { location, loading: locationLoading, refresh } = useUserLocation(false);

  // Request location on mount
  useEffect(() => {
    refresh();
  }, []);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || photos.length >= maxPhotos) return;

    setIsCapturing(true);
    
    // Try to get current location for geo-tagging
    let currentLocation = location;
    if (!currentLocation) {
      refresh();
      currentLocation = location;
    }

    const newPhotos: PhotoWithGeo[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (photos.length + newPhotos.length >= maxPhotos) break;

      const preview = URL.createObjectURL(file);
      
      newPhotos.push({
        file,
        preview,
        latitude: currentLocation?.lat ?? null,
        longitude: currentLocation?.lng ?? null,
        capturedAt: new Date(),
      });
    }

    onPhotosChange([...photos, ...newPhotos]);
    setIsCapturing(false);
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Photos ({photos.length}/{maxPhotos})
        </span>
        {locationLoading && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Getting location...
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={disabled || photos.length >= maxPhotos}
      />

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={photo.preview}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removePhoto(index)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
                {photo.latitude && photo.longitude && (
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-background/80 rounded px-1.5 py-0.5">
                    <MapPin className="h-3 w-3 text-success" />
                    <span className="text-xs">Geo-tagged</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      {photos.length < maxPhotos && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCameraCapture}
            disabled={disabled || isCapturing}
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleFileUpload}
            disabled={disabled || isCapturing}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Photos will be automatically geo-tagged with your current location for verification purposes.
      </p>
    </div>
  );
}

export type { PhotoWithGeo };
