import { useState, useEffect } from 'react';

interface DataRecord {
  id: string;
  [key: string]: any;
}

interface Bundle {
  id: number;
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
}

interface UseDataGenerationReturn {
  dataRecords: DataRecord[];
  tableHeaders: string[];
  headerToKeyMapping: { [key: string]: string };
}

export const useDataGeneration = (bundle: Bundle | null, bundleId?: string): UseDataGenerationReturn => {
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [headerToKeyMapping, setHeaderToKeyMapping] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!bundle || !bundleId) return;

    const currentBundleId = bundleId || '1';
    const bundleIdNumber = parseInt(currentBundleId);
    const mockData: DataRecord[] = [];
    let headers: string[] = [];
    let headerMapping: { [key: string]: string } = {};

    switch (bundleIdNumber) {
      case 1: // VC Bundle - Kentucky Emerging Growth
        headers = ['Company', 'Funding Round', 'Amount Raised', 'Hiring Velocity', 'Industry', 'Location', 'Employee Growth', 'Founded', 'Revenue Stage'];
        headerMapping = {
          'Company': 'company',
          'Funding Round': 'fundingRound',
          'Amount Raised': 'amountRaised',
          'Hiring Velocity': 'hiringVelocity',
          'Industry': 'industry',
          'Location': 'location',
          'Employee Growth': 'employeeGrowth',
          'Founded': 'founded',
          'Revenue Stage': 'revenueStage'
        };
        
        const industries = ['FinTech', 'HealthTech', 'AI/ML', 'SaaS', 'E-commerce', 'BioTech', 'AgTech', 'EdTech'];
        const locations = ['Louisville', 'Lexington', 'Bowling Green', 'Covington', 'Frankfort', 'Henderson', 'Owensboro', 'Paducah'];
        const fundingRounds = ['Series A', 'Series B', 'Seed', 'Pre-Series A', 'Series C', 'Bridge Round'];
        const revenueStages = ['Pre-Revenue', 'Early Revenue', 'Growth Stage', 'Scale-Up'];
        
        for (let i = 0; i < 200; i++) {
          const founded = 2015 + (i % 9);
          const employeeGrowth = 50 + Math.floor(Math.random() * 300);
          mockData.push({
            id: `vc-${i}`,
            company: `Kentucky Growth Co ${String(i + 1).padStart(3, '0')}`,
            fundingRound: fundingRounds[i % fundingRounds.length],
            amountRaised: `$${(Math.random() * 8 + 0.5).toFixed(1)}M`,
            hiringVelocity: `+${Math.floor(Math.random() * 75 + 15)} employees`,
            industry: industries[i % industries.length],
            location: `${locations[i % locations.length]}, KY`,
            employeeGrowth: `${employeeGrowth}%`,
            founded: founded.toString(),
            revenueStage: revenueStages[i % revenueStages.length]
          });
        }
        break;

      case 2: // CRM Bundle - Platform Migration
        headers = ['Company', 'Previous CRM', 'Migration Date', 'Company Size', 'Industry', 'Migration Reason', 'Decision Timeline', 'Budget Range'];
        headerMapping = {
          'Company': 'company',
          'Previous CRM': 'previousCrm',
          'Migration Date': 'migrationDate',
          'Company Size': 'companySize',
          'Industry': 'industry',
          'Migration Reason': 'migrationReason',
          'Decision Timeline': 'decisionTimeline',
          'Budget Range': 'budgetRange'
        };
        const crmPlatforms = ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho CRM', 'Microsoft Dynamics', 'Freshworks', 'Monday.com'];
        const companySizes = ['51-200', '201-500', '501-1000', '1000-2500', '2500+'];
        const migrationReasons = ['Cost Reduction', 'Feature Limitations', 'Integration Issues', 'User Experience', 'Scalability', 'Support Issues'];
        const timelines = ['1-3 months', '3-6 months', '6-12 months', 'Immediate'];
        const budgets = ['$10K-25K', '$25K-50K', '$50K-100K', '$100K+'];
        const crmIndustries = ['Technology', 'SaaS', 'Professional Services', 'Manufacturing', 'Healthcare', 'Financial Services'];
        
        for (let i = 0; i < 200; i++) {
          const quarter = Math.floor(Math.random() * 4) + 1;
          const year = Math.random() > 0.7 ? 2025 : 2024;
          mockData.push({
            id: `crm-${i}`,
            company: `TechCorp ${String(i + 1).padStart(3, '0')}`,
            previousCrm: crmPlatforms[i % crmPlatforms.length],
            migrationDate: `Q${quarter} ${year}`,
            companySize: companySizes[i % companySizes.length],
            industry: crmIndustries[i % crmIndustries.length],
            migrationReason: migrationReasons[i % migrationReasons.length],
            decisionTimeline: timelines[i % timelines.length],
            budgetRange: budgets[i % budgets.length]
          });
        }
        break;

      case 3: // Real Estate Bundle - Louisville Corridors
        headers = ['Corridor', 'Transaction Volume', 'Growth Rate', 'Merchant Category', 'Avg Transaction', 'Peak Hours', 'Foot Traffic', 'Lease Rates'];
        headerMapping = {
          'Corridor': 'corridor',
          'Transaction Volume': 'transactionVolume',
          'Growth Rate': 'growthRate',
          'Merchant Category': 'merchantCategory',
          'Avg Transaction': 'avgTransaction',
          'Peak Hours': 'peakHours',
          'Foot Traffic': 'footTraffic',
          'Lease Rates': 'leaseRates'
        };
        const corridors = ['Downtown Core', 'Highlands District', 'Bardstown Road', 'Frankfort Avenue', 'Shelbyville Road', 'Preston Highway', 'Dixie Highway'];
        const categories = ['Restaurant', 'Retail', 'Professional Services', 'Entertainment', 'Healthcare', 'Fitness', 'Beauty/Wellness'];
        const peakHours = ['11am-2pm', '5pm-8pm', '7pm-10pm', '12pm-3pm', '6pm-9pm'];
        
        for (let i = 0; i < 200; i++) {
          const volume = Math.floor(Math.random() * 800 + 200);
          const growth = Math.floor(Math.random() * 45 + 5);
          const avgTransaction = Math.floor(Math.random() * 150 + 25);
          const footTraffic = Math.floor(Math.random() * 5000 + 1000);
          const leaseRate = Math.floor(Math.random() * 25 + 12);
          
          mockData.push({
            id: `re-${i}`,
            corridor: corridors[i % corridors.length],
            transactionVolume: `${volume}k`,
            growthRate: `+${growth}%`,
            merchantCategory: categories[i % categories.length],
            avgTransaction: `$${avgTransaction}`,
            peakHours: peakHours[i % peakHours.length],
            footTraffic: `${footTraffic.toLocaleString()}/month`,
            leaseRates: `$${leaseRate}/sq ft`
          });
        }
        break;

      case 4: // CPG Bundle - Beverage Trends
        headers = ['Product Category', 'Cafe Sales', 'Grocery Sales', 'Growth Trend', 'Price Point', 'Regional Preference', 'Market Share', 'Seasonal Factor'];
        headerMapping = {
          'Product Category': 'productCategory',
          'Cafe Sales': 'cafeSales',
          'Grocery Sales': 'grocerySales',
          'Growth Trend': 'growthTrend',
          'Price Point': 'pricePoint',
          'Regional Preference': 'regionalPreference',
          'Market Share': 'marketShare',
          'Seasonal Factor': 'seasonalFactor'
        };
        const beverageCategories = ['Specialty Coffee', 'Premium Tea', 'Energy Drinks', 'Smoothies', 'Kombucha', 'Cold Brew', 'Functional Beverages', 'Plant-Based Drinks'];
        const pricePoints = ['Premium ($4-6)', 'Mid-tier ($2-4)', 'Value ($1-2)', 'Ultra-Premium ($6+)'];
        const regionalPrefs = ['Urban Heavy', 'Suburban Focused', 'Mixed Demographics', 'College Towns'];
        
        for (let i = 0; i < 200; i++) {
          const cafeSales = Math.floor(Math.random() * 300 + 50);
          const grocerySales = Math.floor(Math.random() * 200 + 30);
          const growthTrend = Math.random() > 0.3 ? '+' : '-';
          const growthPercent = Math.floor(Math.random() * 35 + 5);
          const marketShare = (Math.random() * 15 + 1).toFixed(1);
          const seasonalFactor = (Math.random() * 2 + 0.5).toFixed(1);
          
          mockData.push({
            id: `cpg-${i}`,
            productCategory: beverageCategories[i % beverageCategories.length],
            cafeSales: `$${cafeSales}k`,
            grocerySales: `$${grocerySales}k`,
            growthTrend: `${growthTrend}${growthPercent}%`,
            pricePoint: pricePoints[i % pricePoints.length],
            regionalPreference: regionalPrefs[i % regionalPrefs.length],
            marketShare: `${marketShare}%`,
            seasonalFactor: `${seasonalFactor}x`
          });
        }
        break;

      case 5: // Academic Bundle - Pro-Social Behavior
        headers = ['Metro Area', 'Community Actions', 'Local Spend Impact', 'Correlation Score', 'Population', 'Engagement Type', 'Economic Multiplier', 'Study Period'];
        headerMapping = {
          'Metro Area': 'metroArea',
          'Community Actions': 'communityActions',
          'Local Spend Impact': 'localSpendImpact',
          'Correlation Score': 'correlationScore',
          'Population': 'population',
          'Engagement Type': 'engagementType',
          'Economic Multiplier': 'economicMultiplier',
          'Study Period': 'studyPeriod'
        };
        const metroAreas = ['Louisville Metro', 'Lexington-Fayette', 'Bowling Green', 'Owensboro', 'Covington-Newport', 'Paducah', 'Henderson', 'Frankfort'];
        const engagementTypes = ['Volunteer Events', 'Community Clean-up', 'Local Fundraising', 'Neighborhood Watch', 'Youth Mentoring', 'Senior Support'];
        const studyPeriods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025'];
        
        for (let i = 0; i < 200; i++) {
          const actions = Math.floor(Math.random() * 800 + 100);
          const impact = Math.floor(Math.random() * 80 + 10);
          const correlation = (0.4 + Math.random() * 0.5).toFixed(2);
          const population = Math.floor(Math.random() * 300 + 50);
          const multiplier = (1.2 + Math.random() * 2.0).toFixed(1);
          
          mockData.push({
            id: `academic-${i}`,
            metroArea: metroAreas[i % metroAreas.length],
            communityActions: actions.toLocaleString(),
            localSpendImpact: `+$${impact}k`,
            correlationScore: correlation,
            population: `${population}k`,
            engagementType: engagementTypes[i % engagementTypes.length],
            economicMultiplier: `${multiplier}x`,
            studyPeriod: studyPeriods[i % studyPeriods.length]
          });
        }
        break;

      case 6: // Urban Wellness Bundle - Using REAL data
        headers = ['Urban Zone', 'Avg Daily Steps', 'Active Calories', 'Popular Activity', 'Peak Activity Time', 'Sleep Duration', 'Heart Rate Zone', 'Workout Frequency'];
        headerMapping = {
          'Urban Zone': 'urbanZone',
          'Avg Daily Steps': 'avgDailySteps',
          'Active Calories': 'activeCalories',
          'Popular Activity': 'popularActivity',
          'Peak Activity Time': 'peakActivityTime',
          'Sleep Duration': 'sleepDuration',
          'Heart Rate Zone': 'heartRateZone',
          'Workout Frequency': 'workoutFrequency'
        };
        
        // Using the REAL data provided by the user
        const realWellnessData = [
          { urbanZone: 'UrbanZone9', avgDailySteps: '7,957', activeCalories: '857 kcal', popularActivity: 'Yoga', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.7 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '6,134', activeCalories: '710 kcal', popularActivity: 'Walking', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '11,709', activeCalories: '233 kcal', popularActivity: 'Yoga', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.5 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '5,818', activeCalories: '202 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone5', avgDailySteps: '11,942', activeCalories: '462 kcal', popularActivity: 'Swimming', peakActivityTime: '12:00-1:00 PM', sleepDuration: '5.9 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '9,954', activeCalories: '886 kcal', popularActivity: 'Cycling', peakActivityTime: '6:00-8:00 AM', sleepDuration: '9.0 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '14,389', activeCalories: '492 kcal', popularActivity: 'Strength Training', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.0 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone8', avgDailySteps: '11,090', activeCalories: '803 kcal', popularActivity: 'Swimming', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.3 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '14,519', activeCalories: '533 kcal', popularActivity: 'Yoga', peakActivityTime: '5:00-7:00 PM', sleepDuration: '7.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '5,071', activeCalories: '689 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.4 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '6,725', activeCalories: '808 kcal', popularActivity: 'Yoga', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.4 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '5,101', activeCalories: '642 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.1 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone9', avgDailySteps: '4,270', activeCalories: '513 kcal', popularActivity: 'Cycling', peakActivityTime: '5:00-7:00 PM', sleepDuration: '7.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone9', avgDailySteps: '6,316', activeCalories: '756 kcal', popularActivity: 'Walking', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.0 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '6,582', activeCalories: '698 kcal', popularActivity: 'Yoga', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.7 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '4,638', activeCalories: '759 kcal', popularActivity: 'Running', peakActivityTime: '8:00-10:00 PM', sleepDuration: '9.0 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '12,409', activeCalories: '797 kcal', popularActivity: 'Yoga', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.5 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '4,585', activeCalories: '896 kcal', popularActivity: 'Yoga', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.6 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone4', avgDailySteps: '5,687', activeCalories: '911 kcal', popularActivity: 'Cycling', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.4 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone5', avgDailySteps: '10,962', activeCalories: '270 kcal', popularActivity: 'Yoga', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone9', avgDailySteps: '7,184', activeCalories: '719 kcal', popularActivity: 'Walking', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.1 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '3,968', activeCalories: '457 kcal', popularActivity: 'Walking', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.2 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '11,732', activeCalories: '597 kcal', popularActivity: 'Swimming', peakActivityTime: '12:00-1:00 PM', sleepDuration: '5.5 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone5', avgDailySteps: '10,461', activeCalories: '306 kcal', popularActivity: 'Cycling', peakActivityTime: '5:00-7:00 PM', sleepDuration: '5.8 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '10,635', activeCalories: '877 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.5 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '9,281', activeCalories: '708 kcal', popularActivity: 'Swimming', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '14,597', activeCalories: '347 kcal', popularActivity: 'Strength Training', peakActivityTime: '5:00-7:00 PM', sleepDuration: '8.0 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '13,697', activeCalories: '767 kcal', popularActivity: 'Cycling', peakActivityTime: '5:00-7:00 PM', sleepDuration: '6.6 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone4', avgDailySteps: '3,632', activeCalories: '467 kcal', popularActivity: 'Walking', peakActivityTime: '6:00-8:00 AM', sleepDuration: '5.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '13,374', activeCalories: '282 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.8 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '5,168', activeCalories: '749 kcal', popularActivity: 'Walking', peakActivityTime: '8:00-10:00 PM', sleepDuration: '5.9 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone5', avgDailySteps: '14,924', activeCalories: '832 kcal', popularActivity: 'Swimming', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.5 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone4', avgDailySteps: '8,237', activeCalories: '665 kcal', popularActivity: 'Yoga', peakActivityTime: '8:00-10:00 PM', sleepDuration: '8.7 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '4,854', activeCalories: '561 kcal', popularActivity: 'Cycling', peakActivityTime: '6:00-8:00 AM', sleepDuration: '5.5 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '4,263', activeCalories: '637 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '4,036', activeCalories: '853 kcal', popularActivity: 'Swimming', peakActivityTime: '6:00-8:00 AM', sleepDuration: '9.0 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone9', avgDailySteps: '4,510', activeCalories: '420 kcal', popularActivity: 'Yoga', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.1 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone5', avgDailySteps: '7,130', activeCalories: '436 kcal', popularActivity: 'Swimming', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.8 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '6,351', activeCalories: '874 kcal', popularActivity: 'Swimming', peakActivityTime: '6:00-8:00 AM', sleepDuration: '8.3 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '10,432', activeCalories: '834 kcal', popularActivity: 'Strength Training', peakActivityTime: '5:00-7:00 PM', sleepDuration: '5.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '11,313', activeCalories: '736 kcal', popularActivity: 'Strength Training', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.2 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone5', avgDailySteps: '8,864', activeCalories: '511 kcal', popularActivity: 'Swimming', peakActivityTime: '6:00-8:00 AM', sleepDuration: '8.6 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '9,792', activeCalories: '752 kcal', popularActivity: 'Running', peakActivityTime: '5:00-7:00 PM', sleepDuration: '5.7 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone5', avgDailySteps: '6,952', activeCalories: '618 kcal', popularActivity: 'Walking', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.8 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '10,821', activeCalories: '319 kcal', popularActivity: 'Running', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.2 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '8,906', activeCalories: '448 kcal', popularActivity: 'Cycling', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '5,463', activeCalories: '380 kcal', popularActivity: 'Strength Training', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.3 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '12,424', activeCalories: '790 kcal', popularActivity: 'Running', peakActivityTime: '5:00-7:00 PM', sleepDuration: '7.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '13,371', activeCalories: '807 kcal', popularActivity: 'Yoga', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.6 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '5,032', activeCalories: '481 kcal', popularActivity: 'Running', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.9 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '12,063', activeCalories: '345 kcal', popularActivity: 'Cycling', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.5 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '4,527', activeCalories: '519 kcal', popularActivity: 'Walking', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.5 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '5,168', activeCalories: '726 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.3 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '11,691', activeCalories: '606 kcal', popularActivity: 'Strength Training', peakActivityTime: '8:00-10:00 PM', sleepDuration: '5.5 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '7,367', activeCalories: '627 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.9 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '14,316', activeCalories: '495 kcal', popularActivity: 'Strength Training', peakActivityTime: '6:00-8:00 AM', sleepDuration: '9.0 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '10,077', activeCalories: '473 kcal', popularActivity: 'Cycling', peakActivityTime: '5:00-7:00 PM', sleepDuration: '6.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '14,211', activeCalories: '812 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '8,151', activeCalories: '381 kcal', popularActivity: 'Walking', peakActivityTime: '8:00-10:00 PM', sleepDuration: '9.0 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone8', avgDailySteps: '7,890', activeCalories: '812 kcal', popularActivity: 'Walking', peakActivityTime: '6:00-8:00 AM', sleepDuration: '8.4 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '12,543', activeCalories: '300 kcal', popularActivity: 'Cycling', peakActivityTime: '6:00-8:00 AM', sleepDuration: '5.9 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '5,147', activeCalories: '944 kcal', popularActivity: 'Strength Training', peakActivityTime: '8:00-10:00 PM', sleepDuration: '8.5 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '8,248', activeCalories: '370 kcal', popularActivity: 'Running', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.0 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '9,573', activeCalories: '768 kcal', popularActivity: 'Running', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.6 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '8,917', activeCalories: '460 kcal', popularActivity: 'Walking', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.4 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '4,530', activeCalories: '261 kcal', popularActivity: 'Cycling', peakActivityTime: '5:00-7:00 PM', sleepDuration: '6.2 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '8,041', activeCalories: '428 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.6 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '14,192', activeCalories: '515 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.3 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '4,354', activeCalories: '466 kcal', popularActivity: 'Swimming', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.2 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '6,356', activeCalories: '752 kcal', popularActivity: 'Yoga', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.6 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '8,157', activeCalories: '250 kcal', popularActivity: 'Walking', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.5 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone8', avgDailySteps: '5,742', activeCalories: '738 kcal', popularActivity: 'Running', peakActivityTime: '5:00-7:00 PM', sleepDuration: '7.6 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '8,761', activeCalories: '424 kcal', popularActivity: 'Walking', peakActivityTime: '5:00-7:00 PM', sleepDuration: '8.7 hours', heartRateZone: 'Rarely', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone4', avgDailySteps: '11,717', activeCalories: '329 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.4 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '14,113', activeCalories: '986 kcal', popularActivity: 'Yoga', peakActivityTime: '5:00-7:00 PM', sleepDuration: '6.4 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '7,339', activeCalories: '549 kcal', popularActivity: 'Swimming', peakActivityTime: '6:00-8:00 AM', sleepDuration: '5.9 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone4', avgDailySteps: '13,178', activeCalories: '475 kcal', popularActivity: 'Yoga', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.5 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone9', avgDailySteps: '7,282', activeCalories: '878 kcal', popularActivity: 'Walking', peakActivityTime: '5:00-7:00 PM', sleepDuration: '8.4 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone8', avgDailySteps: '13,882', activeCalories: '984 kcal', popularActivity: 'Strength Training', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.1 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone9', avgDailySteps: '8,011', activeCalories: '736 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.8 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '6,058', activeCalories: '962 kcal', popularActivity: 'Swimming', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.3 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone10', avgDailySteps: '6,235', activeCalories: '357 kcal', popularActivity: 'Swimming', peakActivityTime: '8:00-10:00 PM', sleepDuration: '7.9 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone4', avgDailySteps: '5,624', activeCalories: '450 kcal', popularActivity: 'Cycling', peakActivityTime: '6:00-8:00 AM', sleepDuration: '6.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '10,095', activeCalories: '947 kcal', popularActivity: 'Yoga', peakActivityTime: '6:00-8:00 AM', sleepDuration: '8.8 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '4,833', activeCalories: '667 kcal', popularActivity: 'Cycling', peakActivityTime: '6:00-8:00 AM', sleepDuration: '8.6 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '13,381', activeCalories: '667 kcal', popularActivity: 'Strength Training', peakActivityTime: '5:00-7:00 PM', sleepDuration: '7.1 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Rarely' },
          { urbanZone: 'UrbanZone3', avgDailySteps: '11,860', activeCalories: '560 kcal', popularActivity: 'Yoga', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.8 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone8', avgDailySteps: '10,121', activeCalories: '816 kcal', popularActivity: 'Walking', peakActivityTime: '8:00-10:00 PM', sleepDuration: '8.2 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone8', avgDailySteps: '8,081', activeCalories: '400 kcal', popularActivity: 'Yoga', peakActivityTime: '5:00-7:00 PM', sleepDuration: '7.6 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '8,185', activeCalories: '713 kcal', popularActivity: 'Strength Training', peakActivityTime: '5:00-7:00 PM', sleepDuration: '5.6 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone7', avgDailySteps: '14,792', activeCalories: '930 kcal', popularActivity: 'Walking', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.6 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '5,707', activeCalories: '263 kcal', popularActivity: 'Walking', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.1 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone4', avgDailySteps: '13,398', activeCalories: '817 kcal', popularActivity: 'Yoga', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.2 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '8,399', activeCalories: '454 kcal', popularActivity: 'Strength Training', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.7 hours', heartRateZone: 'Fat Burn (50-60%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '3,428', activeCalories: '854 kcal', popularActivity: 'Walking', peakActivityTime: '12:00-1:00 PM', sleepDuration: '7.4 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '13,215', activeCalories: '695 kcal', popularActivity: 'Cycling', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.8 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone6', avgDailySteps: '13,482', activeCalories: '936 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '8.7 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone9', avgDailySteps: '14,447', activeCalories: '929 kcal', popularActivity: 'Strength Training', peakActivityTime: '6:00-8:00 AM', sleepDuration: '7.7 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '3-4 times/week' },
          { urbanZone: 'UrbanZone1', avgDailySteps: '9,688', activeCalories: '423 kcal', popularActivity: 'Strength Training', peakActivityTime: '8:00-10:00 PM', sleepDuration: '6.2 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: '1-2 times/week' },
          { urbanZone: 'UrbanZone2', avgDailySteps: '14,470', activeCalories: '341 kcal', popularActivity: 'Cycling', peakActivityTime: '12:00-1:00 PM', sleepDuration: '6.2 hours', heartRateZone: 'Peak (70-85%)', workoutFrequency: 'Daily' }
        ];

        realWellnessData.forEach((record, index) => {
          mockData.push({
            id: `wellness-${index}`,
            urbanZone: record.urbanZone,
            avgDailySteps: record.avgDailySteps,
            activeCalories: record.activeCalories,
            popularActivity: record.popularActivity,
            peakActivityTime: record.peakActivityTime,
            sleepDuration: record.sleepDuration,
            heartRateZone: record.heartRateZone,
            workoutFrequency: record.workoutFrequency
          });
        });
        break;

      default:
        headers = ['Data Point', 'Value', 'Category'];
        headerMapping = {
          'Data Point': 'dataPoint',
          'Value': 'value',
          'Category': 'category'
        };
        mockData.push({
          id: 'default-1',
          dataPoint: 'Sample Data',
          value: 'Sample Value',
          category: 'Sample Category'
        });
        break;
    }

    setTableHeaders(headers);
    setHeaderToKeyMapping(headerMapping);
    setDataRecords(mockData);
  }, [bundle, bundleId]);

  return { dataRecords, tableHeaders, headerToKeyMapping };
};
