
import { useState } from 'react';

interface BillingHistory {
  month: string;
  usage: number;
  limit: number;
  cost: number;
}

interface SubscriptionPlan {
  name: string;
  cost: number;
  description: string;
  features: string[];
  limits: {
    credits: number;
    apiCalls: number;
    dataExport: number;
    teamMembers: number;
  };
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

export const useBillingData = () => {
  const [currentUsage] = useState({
    used: 8450,
    limit: 15000
  });

  const [billingHistory] = useState<BillingHistory[]>([
    { month: 'Jan', usage: 12450, limit: 15000, cost: 299 },
    { month: 'Feb', usage: 13200, limit: 15000, cost: 299 },
    { month: 'Mar', usage: 11800, limit: 15000, cost: 299 },
    { month: 'Apr', usage: 14100, limit: 15000, cost: 299 },
    { month: 'May', usage: 9800, limit: 15000, cost: 299 },
    { month: 'Jun', usage: 8450, limit: 15000, cost: 299 }
  ]);

  const [subscriptionPlan] = useState<SubscriptionPlan>({
    name: 'Professional',
    cost: 299,
    description: 'Perfect for growing teams and advanced data needs',
    features: [
      'Advanced AI analytics',
      'Priority support',
      'Custom integrations',
      'Advanced security features',
      'Compliance reporting',
      'API access',
      'Team collaboration tools'
    ],
    limits: {
      credits: 15000,
      apiCalls: 100000,
      dataExport: 50,
      teamMembers: 25
    }
  });

  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      brand: 'Visa',
      last4: '4242',
      expiry: '12/25',
      isDefault: true
    },
    {
      id: '2',
      brand: 'Mastercard',
      last4: '8888',
      expiry: '08/26',
      isDefault: false
    }
  ]);

  const [invoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'INV-2024-001',
      date: '2024-01-01',
      period: 'January 2024',
      amount: 299,
      status: 'paid'
    },
    {
      id: '2',
      number: 'INV-2024-002',
      date: '2024-02-01',
      period: 'February 2024',
      amount: 299,
      status: 'paid'
    },
    {
      id: '3',
      number: 'INV-2024-003',
      date: '2024-03-01',
      period: 'March 2024',
      amount: 299,
      status: 'paid'
    },
    {
      id: '4',
      number: 'INV-2024-004',
      date: '2024-04-01',
      period: 'April 2024',
      amount: 299,
      status: 'paid'
    }
  ]);

  const [usageBreakdown] = useState([
    { name: 'Data Processing', value: 3200 },
    { name: 'AI Analytics', value: 2100 },
    { name: 'API Calls', value: 1800 },
    { name: 'Data Export', value: 950 },
    { name: 'Storage', value: 400 }
  ]);

  const downloadInvoice = (invoiceId: string) => {
    console.log(`Downloading invoice ${invoiceId}`);
    // Simulate invoice download
  };

  const updatePaymentMethod = (methodId: string) => {
    console.log(`Updating payment method ${methodId}`);
    // Simulate payment method update
  };

  return {
    currentUsage,
    billingHistory,
    subscriptionPlan,
    paymentMethods,
    invoices,
    usageBreakdown,
    downloadInvoice,
    updatePaymentMethod
  };
};
