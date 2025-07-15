import { useMemo } from 'react';

interface Bundle {
  bundle_id: string;
  title: string;
  category: string;
  tier: string;
  data_json: any;
  key_insights: string[];
  features: string[];
  suggested_filters: string[];
}

export const useDynamicFilters = (bundles: Bundle[]) => {
  return useMemo(() => {
    if (!bundles || bundles.length === 0) {
      return {
        categories: [],
        tiers: [],
        features: [],
        activityTypes: [],
        healthMetrics: [],
        dataTypes: [],
        priceRanges: []
      };
    }

    // Extract unique categories
    const categories = [...new Set(bundles.map(b => b.category))].sort();
    
    // Extract unique tiers
    const tiers = [...new Set(bundles.map(b => b.tier))].sort();
    
    // Extract unique features
    const features = [...new Set(bundles.flatMap(b => b.features || []))].sort();
    
    // Extract activity types from data_json
    const activityTypes = new Set<string>();
    bundles.forEach(bundle => {
      if (bundle.data_json?.activity_type_breakdown) {
        Object.keys(bundle.data_json.activity_type_breakdown).forEach(type => {
          activityTypes.add(type);
        });
      }
    });
    
    // Extract health metrics based on bundle content
    const healthMetrics = new Set<string>();
    bundles.forEach(bundle => {
      // Check for heart rate data
      if (bundle.data_json?.avg_workout_intensity || bundle.title.toLowerCase().includes('heart')) {
        healthMetrics.add('Heart Rate');
      }
      // Check for sleep data
      if (bundle.data_json?.avg_sleep_duration || bundle.title.toLowerCase().includes('sleep')) {
        healthMetrics.add('Sleep');
      }
      // Check for steps data
      if (bundle.data_json?.avg_steps_per_day || bundle.title.toLowerCase().includes('step')) {
        healthMetrics.add('Steps');
      }
      // Check for nutrition data
      if (bundle.data_json?.avg_daily_calories || bundle.title.toLowerCase().includes('nutrition')) {
        healthMetrics.add('Nutrition');
      }
      // Check for clinical data
      if (bundle.data_json?.conditions_tracked || bundle.title.toLowerCase().includes('clinical')) {
        healthMetrics.add('Clinical Data');
      }
      // Check for VO2 Max
      if (bundle.data_json?.average_vo2_max) {
        healthMetrics.add('VO2 Max');
      }
      // Check for BMI
      if (bundle.data_json?.average_bmi) {
        healthMetrics.add('BMI');
      }
    });
    
    // Data types based on bundle analysis
    const dataTypes = new Set<string>();
    bundles.forEach(bundle => {
      if (bundle.data_json?.total_activities || bundle.data_json?.total_workouts) {
        dataTypes.add('Activity Data');
      }
      if (bundle.data_json?.total_sleep_records) {
        dataTypes.add('Sleep Data');
      }
      if (bundle.data_json?.total_nutrition_records) {
        dataTypes.add('Nutrition Data');
      }
      if (bundle.data_json?.total_clinical_records) {
        dataTypes.add('Clinical Data');
      }
      if (bundle.data_json?.regions_covered) {
        dataTypes.add('Geographic Data');
      }
    });
    
    // Price ranges based on actual bundle prices
    const prices = bundles.map(b => b.data_json?.price || 0).filter(p => p > 0);
    const priceRanges = [];
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice < 500) priceRanges.push('Under $500');
      if (prices.some(p => p >= 500 && p < 1000)) priceRanges.push('$500 - $1,000');
      if (prices.some(p => p >= 1000 && p < 2500)) priceRanges.push('$1,000 - $2,500');
      if (prices.some(p => p >= 2500 && p < 5000)) priceRanges.push('$2,500 - $5,000');
      if (maxPrice >= 5000) priceRanges.push('$5,000+');
    }
    
    return {
      categories,
      tiers,
      features,
      activityTypes: Array.from(activityTypes).sort(),
      healthMetrics: Array.from(healthMetrics).sort(),
      dataTypes: Array.from(dataTypes).sort(),
      priceRanges
    };
  }, [bundles]);
};