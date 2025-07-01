import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ArrowLeft, Search, Download, Share, Save, Filter, Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useResponsive } from '@/hooks/useResponsive';
import { getMaskedDataWarning } from '@/utils/dataAnonymizer';
import DataViewerFilters from './DataViewerFilters';
import SavedSearches from './SavedSearches';
import ContactLists from './ContactLists';

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

const DataViewer = () => {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showContactLists, setShowContactLists] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DataRecord[]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);

  const itemsPerPage = isMobile ? 20 : 50;

  useEffect(() => {
    loadBundleData();
    generateBundleSpecificData();
  }, [bundleId]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [dataRecords, filters, searchTerm]);

  const loadBundleData = () => {
    const bundleMap: { [key: string]: Bundle } = {
      '1': {
        id: 1,
        name: 'Q2 2025 Emerging Growth Index: Kentucky',
        tier: 'Enterprise',
        contacts: 1847,
        features: ['Intent Signals', 'Advanced Hiring Trends', 'Geographic Targeting', 'Funding Status'],
        category: 'Venture Capital & Private Equity',
        description: 'Premier dataset of private companies in Kentucky with new capital and hiring velocity'
      },
      '2': {
        id: 2,
        name: 'CRM Competitive Displacement Opportunity Report',
        tier: 'Professional',
        contacts: 892,
        features: ['Technographics', 'Intent Signals', 'Company Size Filtering', 'Platform Migration Data'],
        category: 'SaaS & Technology',
        description: 'Companies that recently removed competing CRM platforms'
      },
      '3': {
        id: 3,
        name: 'Louisville Commercial Corridor Velocity Analysis',
        tier: 'Enterprise',
        contacts: 2456,
        features: ['Advanced Time-Series Analysis', 'Geographic Targeting', 'Merchant Categories', 'Transaction Velocity'],
        category: 'Commercial Real Estate',
        description: 'Transaction growth analysis across Louisville commercial corridors'
      },
      '4': {
        id: 4,
        name: 'Consumer Beverage Trends: Cafe vs. Grocery Spend',
        tier: 'Professional',
        contacts: 1234,
        features: ['Anonymized Merchant IDs', 'Category Comparison', 'Trend Analysis', 'Channel Strategy'],
        category: 'Consumer Packaged Goods',
        description: 'Consumer spending velocity for beverage products across channels'
      },
      '5': {
        id: 5,
        name: 'Pro-Social Behavior and Local Economic Impact Study',
        tier: 'Analyst',
        contacts: 3421,
        features: ['IDIA Life Integration', 'Time-Series Analysis', 'Geographic Correlation', 'Community Metrics'],
        category: 'Academic & Research',
        description: 'Community engagement correlation with local business spending'
      },
      '6': {
        id: 6,
        name: 'Urban Wellness Dynamics: Aggregated Activity & Health Trends',
        tier: 'Enterprise',
        contacts: 5670,
        features: ['IDIA Synapse Engine™', 'Anonymized Health Data', 'Urban Zone Analysis', 'Activity Pattern Recognition'],
        category: 'Health & Fitness',
        description: 'Comprehensive anonymized view of urban population activity and wellness trends'
      }
    };

    const currentBundle = bundleMap[bundleId || '1'];
    setBundle(currentBundle);
  };

  const generateBundleSpecificData = () => {
    const currentBundleId = bundleId || '1';
    const bundleIdNumber = parseInt(currentBundleId);
    const mockData: DataRecord[] = [];
    let headers: string[] = [];

    switch (bundleIdNumber) {
      case 1: // VC Bundle - Kentucky Emerging Growth
        headers = ['Company', 'Funding Round', 'Amount Raised', 'Hiring Velocity', 'Industry', 'Location', 'Employee Growth', 'Founded', 'Revenue Stage'];
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

      case 6: // Urban Wellness Bundle - Health & Fitness Data (REAL DATA PROVIDED)
        headers = ['Urban Zone', 'Avg Daily Steps', 'Active Calories', 'Popular Activity', 'Peak Activity Time', 'Sleep Duration', 'Heart Rate Zone', 'Workout Frequency'];
        
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
          { urbanZone: 'UrbanZone7', avgDailySteps: '5,168', activeCalories: '749 kcal', popularActivity: 'Walking', peakActivityTime: '8:00-10:00 PM', sleepDuration: '5.9 hours', heartRateZone: 'Cardio (60-70%)', workoutFrequency: '3-4 times/week' }
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
        mockData.push({
          id: 'default-1',
          dataPoint: 'Sample Data',
          value: 'Sample Value',
          category: 'Sample Category'
        });
        break;
    }

    setTableHeaders(headers);
    setDataRecords(mockData);
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...dataRecords];

    if (searchTerm) {
      filtered = filtered.filter(record =>
        Object.values(record).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply additional filters based on bundle type
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filtered = filtered.filter(record => 
          String(record[key]) === filters[key]
        );
      }
    });

    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting ${selectedRecords.length || filteredRecords.length} records as ${format}`);
  };

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  if (!bundle) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const FilterSidebar = () => (
    <div className={`${isMobile ? 'h-full' : 'w-80'} space-y-4`}>
      {!isMobile && (
        <Button
          variant="outline"
          onClick={() => navigate('/marketplace')}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Button>
      )}

      <DataViewerFilters
        filters={filters}
        onFiltersChange={setFilters}
        bundle={bundle}
      />
    </div>
  );

  const MobileTable = () => (
    <div className="space-y-3">
      {paginatedRecords.map((record) => (
        <Card key={record.id} className="p-4">
          <div className="space-y-2">
            {Object.entries(record).map(([key, value]) => {
              if (key === 'id') return null;
              return (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-xs text-gray-900">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );

  const DesktopTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          {tableHeaders.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedRecords.map((record) => (
          <TableRow key={record.id}>
            {tableHeaders.map((header) => {
              const key = header.toLowerCase().replace(/\s+/g, '');
              const camelCaseKey = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, '');
              const value = record[camelCaseKey] || record[key] || record[header.toLowerCase().replace(/\s+/g, '')];
              return (
                <TableCell key={header}>
                  {String(value || '')}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'p-2' : 'p-6'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-sm truncate mx-2">{bundle.name}</h1>
          <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-sm p-0">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <div className={`flex ${isMobile ? 'flex-col' : 'gap-6'}`}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-80">
            <FilterSidebar />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Header */}
          {!isMobile && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Filter className="mr-2 h-5 w-5" />
                      {bundle.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {bundle.tier}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">
                        {bundle.category}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {filteredRecords.length} of {dataRecords.length} records
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowSavedSearches(true)}>
                      <Share className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="outline" onClick={() => setShowContactLists(true)}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button onClick={() => handleExport('csv')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Data Privacy Warning */}
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className={`${isMobile ? 'p-3' : 'pt-6'}`}>
              <p className={`text-purple-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {getMaskedDataWarning()}
              </p>
            </CardContent>
          </Card>

          {/* Search Bar */}
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'pt-6'}>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search dataset records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isMobile ? 'text-sm' : ''}`}
                />
              </div>
              {isMobile && (
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-600">
                    {filteredRecords.length} results
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setShowSavedSearches(true)}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'pt-6'}>
              {isMobile ? <MobileTable /> : <DesktopTable />}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <SavedSearches
        isOpen={showSavedSearches}
        onClose={() => setShowSavedSearches(false)}
        currentFilters={filters}
        searchTerm={searchTerm}
      />

      <ContactLists
        isOpen={showContactLists}
        onClose={() => setShowContactLists(false)}
        selectedContacts={selectedRecords}
        allContacts={filteredRecords}
      />
    </div>
  );
};

export default DataViewer;
