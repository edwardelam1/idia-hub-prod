
import { useState, useEffect } from 'react';

interface Bundle {
  id: number;
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
}

export const useBundleData = (bundleId?: string): Bundle | null => {
  const [bundle, setBundle] = useState<Bundle | null>(null);

  useEffect(() => {
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
  }, [bundleId]);

  return bundle;
};
