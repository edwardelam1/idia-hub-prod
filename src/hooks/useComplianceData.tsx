
import { useState } from 'react';

interface ComplianceFramework {
  name: string;
  score: number;
  lastUpdated: string;
  trend: Array<{
    month: string;
    score: number;
  }>;
}

interface Regulation {
  id: string;
  name: string;
  description: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  requirementsMet: number;
  totalRequirements: number;
  nextReview: string;
}

interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  impact: string;
  likelihood: string;
  owner: string;
  dueDate: string;
  mitigation?: string;
}

interface AuditLog {
  id: string;
  activity: string;
  type: 'security' | 'privacy' | 'data' | 'general';
  user: string;
  timestamp: string;
  status: 'completed' | 'in-progress' | 'scheduled';
  details?: string;
}

interface ComplianceReport {
  id: string;
  name: string;
  type: string;
  format: string;
  generatedDate: string;
}

export const useComplianceData = () => {
  const [complianceOverview] = useState<ComplianceFramework[]>([
    {
      name: 'GDPR',
      score: 92,
      lastUpdated: '2024-01-15',
      trend: [
        { month: 'Jan', score: 88 },
        { month: 'Feb', score: 89 },
        { month: 'Mar', score: 90 },
        { month: 'Apr', score: 91 },
        { month: 'May', score: 91 },
        { month: 'Jun', score: 92 }
      ]
    },
    {
      name: 'HIPAA',
      score: 87,
      lastUpdated: '2024-01-12',
      trend: [
        { month: 'Jan', score: 85 },
        { month: 'Feb', score: 85 },
        { month: 'Mar', score: 86 },
        { month: 'Apr', score: 87 },
        { month: 'May', score: 87 },
        { month: 'Jun', score: 87 }
      ]
    },
    {
      name: 'SOC 2',
      score: 94,
      lastUpdated: '2024-01-10',
      trend: [
        { month: 'Jan', score: 92 },
        { month: 'Feb', score: 93 },
        { month: 'Mar', score: 93 },
        { month: 'Apr', score: 94 },
        { month: 'May', score: 94 },
        { month: 'Jun', score: 94 }
      ]
    },
    {
      name: 'ISO 27001',
      score: 89,
      lastUpdated: '2024-01-08',
      trend: [
        { month: 'Jan', score: 86 },
        { month: 'Feb', score: 87 },
        { month: 'Mar', score: 88 },
        { month: 'Apr', score: 88 },
        { month: 'May', score: 89 },
        { month: 'Jun', score: 89 }
      ]
    }
  ]);

  const [regulations] = useState<Regulation[]>([
    {
      id: '1',
      name: 'GDPR',
      description: 'General Data Protection Regulation compliance for EU data subjects',
      status: 'compliant',
      requirementsMet: 47,
      totalRequirements: 50,
      nextReview: '2024-02-15'
    },
    {
      id: '2',
      name: 'HIPAA',
      description: 'Health Insurance Portability and Accountability Act',
      status: 'compliant',
      requirementsMet: 34,
      totalRequirements: 38,
      nextReview: '2024-02-20'
    },
    {
      id: '3',
      name: 'SOC 2',
      description: 'Service Organization Control 2 Type II compliance',
      status: 'compliant',
      requirementsMet: 28,
      totalRequirements: 30,
      nextReview: '2024-03-01'
    },
    {
      id: '4',
      name: 'ISO 27001',
      description: 'Information Security Management System standard',
      status: 'partial',
      requirementsMet: 112,
      totalRequirements: 125,
      nextReview: '2024-02-28'
    },
    {
      id: '5',
      name: 'CCPA',
      description: 'California Consumer Privacy Act compliance',
      status: 'compliant',
      requirementsMet: 23,
      totalRequirements: 25,
      nextReview: '2024-03-15'
    },
    {
      id: '6',
      name: 'PCI DSS',
      description: 'Payment Card Industry Data Security Standard',
      status: 'partial',
      requirementsMet: 267,
      totalRequirements: 300,
      nextReview: '2024-02-10'
    }
  ]);

  const [riskAssessments] = useState<RiskAssessment[]>([
    {
      id: '1',
      title: 'Data Breach Risk',
      description: 'Potential unauthorized access to patient health data',
      severity: 'critical',
      category: 'Security',
      impact: 'High',
      likelihood: 'Medium',
      owner: 'Security Team',
      dueDate: '2024-02-01',
      mitigation: 'Implement additional encryption and access controls for patient data'
    },
    {
      id: '2',
      title: 'Third-party Vendor Risk',
      description: 'Compliance risks from external data processors',
      severity: 'high',
      category: 'Vendor Management',
      impact: 'Medium',
      likelihood: 'High',
      owner: 'Compliance Team',
      dueDate: '2024-02-15',
      mitigation: 'Review and update vendor agreements with stricter compliance requirements'
    },
    {
      id: '3',
      title: 'Employee Training Gap',
      description: 'Insufficient privacy training for new employees',
      severity: 'medium',
      category: 'Training',
      impact: 'Medium',
      likelihood: 'Medium',
      owner: 'HR Team',
      dueDate: '2024-03-01',
      mitigation: 'Develop comprehensive privacy training program for all staff'
    },
    {
      id: '4',
      title: 'Data Retention Policy',
      description: 'Unclear data retention policies for different data types',
      severity: 'medium',
      category: 'Policy',
      impact: 'Low',
      likelihood: 'High',
      owner: 'Legal Team',
      dueDate: '2024-02-20'
    },
    {
      id: '5',
      title: 'Cross-border Data Transfer',
      description: 'GDPR compliance risk for international data transfers',
      severity: 'high',
      category: 'Privacy',
      impact: 'High',
      likelihood: 'Medium',
      owner: 'Privacy Team',
      dueDate: '2024-01-30',
      mitigation: 'Implement Standard Contractual Clauses for all international transfers'
    }
  ]);

  const [auditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      activity: 'GDPR Data Subject Access Request processed',
      type: 'privacy',
      user: 'John Smith',
      timestamp: '2024-01-15 14:30',
      status: 'completed'
    },
    {
      id: '2',
      activity: 'Security vulnerability assessment completed',
      type: 'security',
      user: 'Security Team',
      timestamp: '2024-01-14 09:15',
      status: 'completed'
    },
    {
      id: '3',
      activity: 'Data retention policy review scheduled',
      type: 'data',
      user: 'Compliance Officer',
      timestamp: '2024-01-13 16:45',
      status: 'scheduled'
    },
    {
      id: '4',
      activity: 'Employee privacy training session conducted',
      type: 'general',
      user: 'HR Team',
      timestamp: '2024-01-12 11:00',
      status: 'completed'
    },
    {
      id: '5',
      activity: 'Third-party vendor security assessment',
      type: 'security',
      user: 'Vendor Manager',
      timestamp: '2024-01-11 13:20',
      status: 'in-progress'
    }
  ]);

  const [reports] = useState<ComplianceReport[]>([
    {
      id: '1',
      name: 'GDPR Compliance Report Q4 2023',
      type: 'Regulatory',
      format: 'PDF',
      generatedDate: '2024-01-05'
    },
    {
      id: '2',
      name: 'SOC 2 Type II Report',
      type: 'Audit',
      format: 'PDF',
      generatedDate: '2023-12-15'
    },
    {
      id: '3',
      name: 'Risk Assessment Summary',
      type: 'Risk',
      format: 'Excel',
      generatedDate: '2024-01-10'
    },
    {
      id: '4',
      name: 'Data Processing Activities Record',
      type: 'Privacy',
      format: 'PDF',
      generatedDate: '2024-01-03'
    }
  ]);

  const generateReport = () => {
    console.log('Generating new compliance report');
    // Simulate report generation
  };

  const scheduleAudit = () => {
    console.log('Scheduling new audit');
    // Simulate audit scheduling
  };

  return {
    complianceOverview,
    auditLogs,
    riskAssessments,
    regulations,
    reports,
    generateReport,
    scheduleAudit
  };
};
