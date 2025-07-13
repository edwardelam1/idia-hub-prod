// Data transformation utilities for health data display

// Map database activity types to user-friendly display names
export const transformActivityType = (activityType: string): string => {
  const activityMapping: { [key: string]: string } = {
    'daily_activity': 'Daily Activity',
    'health_metrics': 'Health Metrics',
    'Daily Activity': 'Daily Activity',
    'Run': 'Running',
    'Bike': 'Cycling',
    'Walk': 'Walking',
    'Swim': 'Swimming',
    'Hike': 'Hiking',
    'TrailRun': 'Trail Running',
    'Workout': 'Workout',
    'Exercise': 'Exercise'
  };
  
  return activityMapping[activityType] || activityType;
};

// Map database device types to user-friendly display names
export const transformDeviceType = (deviceType: string): string => {
  const deviceMapping: { [key: string]: string } = {
    'Health App': 'iPhone Health',
    'iPhone Health App': 'iPhone Health',
    'mobile_app': 'Mobile App',
    'iPhone': 'iPhone',
    'Apple Watch': 'Apple Watch',
    'Garmin': 'Garmin',
    'Fitbit': 'Fitbit',
    'Strava': 'Strava'
  };
  
  return deviceMapping[deviceType] || deviceType;
};

// Generate realistic activity types for bundles
export const getRealisticActivityTypes = (): string[] => {
  return ['Run', 'Walk', 'Bike', 'Swim', 'Hike', 'Workout', 'TrailRun', 'Exercise'];
};

// Generate realistic device types for bundles
export const getRealisticDeviceTypes = (): string[] => {
  return ['iPhone', 'Apple Watch', 'Garmin', 'Fitbit', 'Strava'];
};

// Map display values back to database values for filtering
export const reverseTransformActivityType = (displayType: string): string => {
  const reverseMapping: { [key: string]: string } = {
    'Daily Activity': 'Daily Activity',
    'Health Metrics': 'health_metrics',
    'Running': 'Run',
    'Cycling': 'Bike',
    'Walking': 'Walk',
    'Swimming': 'Swim',
    'Hiking': 'Hike',
    'Trail Running': 'TrailRun',
    'Workout': 'Workout',
    'Exercise': 'Exercise'
  };
  
  return reverseMapping[displayType] || displayType;
};

export const reverseTransformDeviceType = (displayType: string): string => {
  const reverseMapping: { [key: string]: string } = {
    'iPhone Health': 'Health App',
    'Mobile App': 'mobile_app',
    'iPhone': 'iPhone',
    'Apple Watch': 'Apple Watch',
    'Garmin': 'Garmin',
    'Fitbit': 'Fitbit',
    'Strava': 'Strava'
  };
  
  return reverseMapping[displayType] || displayType;
};