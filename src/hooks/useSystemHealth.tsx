import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

interface SystemHealthMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  errorRate: number;
  activeConnections: number;
  processedRequests: number;
  databaseConnections: number;
  cacheHitRate: number;
  responseTime: number;
  throughput: number;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime: number;
  errorCount: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
  status: string;
  category: string;
}

export const useSystemHealth = () => {
  const [metrics, setMetrics] = useState<SystemHealthMetrics>({
    uptime: 99.8,
    cpuUsage: 12,
    memoryUsage: 34,
    diskUsage: 45,
    networkLatency: 23,
    errorRate: 0.02,
    activeConnections: 847,
    processedRequests: 15420,
    databaseConnections: 23,
    cacheHitRate: 94.2,
    responseTime: 145,
    throughput: 1250
  });

  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Health Data Processor', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 120, errorCount: 0 },
    { name: 'AI Data Curator', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 180, errorCount: 0 },
    { name: 'Security Agents', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 95, errorCount: 0 },
    { name: 'Bundle Generator', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 250, errorCount: 0 },
    { name: 'Best Friend AI', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 200, errorCount: 1 },
    { name: 'Nightly Data Processor', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 180, errorCount: 0 }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveMetrics = async () => {
    try {
      const healthData = await fetchApi('/api/v1/health/metrics');

      // Update metrics based on mock API data
      const activityLevel = (healthData.total_records + healthData.today_records) / 10;
      setMetrics(prev => ({
        ...prev,
        cpuUsage: Math.min(95, Math.round(15 + activityLevel * 2)),
        memoryUsage: Math.min(90, Math.round(30 + activityLevel * 1.5)),
        activeConnections: healthData.total_records * 3 + 800,
        processedRequests: healthData.total_records * 12 + 15000,
        throughput: healthData.today_records * 25 + 1000,
      }));

      // Update service statuses with random variation
      setServices(prev => prev.map(service => ({
        ...service,
        lastCheck: new Date().toISOString(),
        responseTime: Math.round(100 + Math.random() * 150),
        status: Math.random() > 0.9 ? 'degraded' : 'healthy' as 'healthy' | 'degraded' | 'down',
      })));

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching live metrics:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return { metrics, services, auditLogs, isLoading, refetch: fetchLiveMetrics };
};
