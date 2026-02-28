import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Activity } from 'lucide-react';

interface HealthDataInputProps {
  onDataSubmitted?: () => void;
}

const HealthDataInput: React.FC<HealthDataInputProps> = ({ onDataSubmitted }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    activity_type: '',
    step_count: '',
    heart_rate: '',
    duration_minutes: '',
    distance_meters: '',
    calories_burned: '',
    device_type: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!isAuthenticated) {
        toast({ title: "Authentication Required", description: "Please sign in to submit health data.", variant: "destructive" });
        return;
      }

      if (!formData.activity_type || !formData.step_count) {
        toast({ title: "Missing Information", description: "Activity type and step count are required.", variant: "destructive" });
        return;
      }

      // Future: POST to /api/v1/health/submit
      await new Promise(resolve => setTimeout(resolve, 800));

      toast({ title: "Health Data Submitted", description: "Your health data has been recorded successfully!" });

      setFormData({ activity_type: '', step_count: '', heart_rate: '', duration_minutes: '', distance_meters: '', calories_burned: '', device_type: '' });
      onDataSubmitted?.();
    } catch (error) {
      console.error('Error submitting health data:', error);
      toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          Record Health Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Heart className="h-4 w-4" />
          <AlertDescription>
            Record your real health and activity data to contribute to the data marketplace and earn rewards.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="activity_type">Activity Type *</Label>
              <Select value={formData.activity_type} onValueChange={(value) => handleInputChange('activity_type', value)}>
                <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Walking">Walking</SelectItem>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Cycling">Cycling</SelectItem>
                  <SelectItem value="Swimming">Swimming</SelectItem>
                  <SelectItem value="Hiking">Hiking</SelectItem>
                  <SelectItem value="Workout">Workout</SelectItem>
                  <SelectItem value="Yoga">Yoga</SelectItem>
                  <SelectItem value="Dancing">Dancing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="step_count">Steps Count *</Label>
              <Input id="step_count" type="number" placeholder="e.g., 8000" value={formData.step_count} onChange={(e) => handleInputChange('step_count', e.target.value)} min="0" max="50000" />
            </div>
            <div>
              <Label htmlFor="heart_rate">Heart Rate (BPM)</Label>
              <Input id="heart_rate" type="number" placeholder="e.g., 120" value={formData.heart_rate} onChange={(e) => handleInputChange('heart_rate', e.target.value)} min="30" max="220" />
            </div>
            <div>
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input id="duration_minutes" type="number" placeholder="e.g., 45" value={formData.duration_minutes} onChange={(e) => handleInputChange('duration_minutes', e.target.value)} min="1" max="1440" />
            </div>
            <div>
              <Label htmlFor="distance_meters">Distance (meters)</Label>
              <Input id="distance_meters" type="number" step="0.1" placeholder="e.g., 5000" value={formData.distance_meters} onChange={(e) => handleInputChange('distance_meters', e.target.value)} min="0" />
            </div>
            <div>
              <Label htmlFor="calories_burned">Calories Burned</Label>
              <Input id="calories_burned" type="number" placeholder="e.g., 300" value={formData.calories_burned} onChange={(e) => handleInputChange('calories_burned', e.target.value)} min="0" max="2000" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="device_type">Device/Source</Label>
              <Select value={formData.device_type} onValueChange={(value) => handleInputChange('device_type', value)}>
                <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                  <SelectItem value="Apple Watch">Apple Watch</SelectItem>
                  <SelectItem value="Fitbit">Fitbit</SelectItem>
                  <SelectItem value="Garmin">Garmin</SelectItem>
                  <SelectItem value="Samsung Health">Samsung Health</SelectItem>
                  <SelectItem value="Google Fit">Google Fit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !formData.activity_type || !formData.step_count}>
            {isSubmitting ? 'Submitting...' : 'Record Activity'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default HealthDataInput;
