import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, AlertTriangle, CheckCircle2, Trash2, User, Phone } from 'lucide-react';
import { format } from 'date-fns';
import type { FoodRequest, FoodRequestStatus, UrgencyLevel } from './types';

interface FoodRequestCardProps {
  request: FoodRequest;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const statusConfig: Record<FoodRequestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending Review', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  matched: { label: 'Matched', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const urgencyConfig: Record<UrgencyLevel, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
  high: { label: 'High', className: 'bg-warning/10 text-warning' },
  critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive' },
};

export function FoodRequestCard({ request, onDelete, showActions = true }: FoodRequestCardProps) {
  const status = statusConfig[request.status];
  const urgency = urgencyConfig[request.urgency_level];
  const showVolunteerInfo = request.volunteer_info && ['in_progress', 'completed'].includes(request.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{request.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Created {format(new Date(request.created_at), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className={`text-xs px-2 py-0.5 rounded-full ${urgency.className}`}>
              {urgency.label === 'Critical' && <AlertTriangle className="h-3 w-3 inline mr-1" />}
              {urgency.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {request.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="font-medium">{request.quantity_needed}</span>
            <span className="text-muted-foreground">{request.quantity_unit}</span>
          </div>

          {request.needed_by && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              Needed by {format(new Date(request.needed_by), 'MMM d')}
            </div>
          )}

          {request.latitude && request.longitude && (
            <div className="flex items-center gap-1 text-success">
              <MapPin className="h-3 w-3" />
              Location set
            </div>
          )}
        </div>

        {request.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {request.address}
          </p>
        )}

        {/* Volunteer Contact Info */}
        {showVolunteerInfo && (
          <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-xs font-medium text-primary mb-2">Volunteer Contact</p>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>{request.volunteer_info!.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <a 
                  href={`tel:${request.volunteer_info!.phone_number}`}
                  className="text-primary hover:underline"
                >
                  {request.volunteer_info!.phone_number}
                </a>
              </div>
            </div>
          </div>
        )}

        {showActions && request.status === 'pending' && onDelete && (
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(request.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}

        {request.status === 'completed' && (
          <div className="flex items-center gap-1 text-success text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Request fulfilled
          </div>
        )}
      </CardContent>
    </Card>
  );
}
