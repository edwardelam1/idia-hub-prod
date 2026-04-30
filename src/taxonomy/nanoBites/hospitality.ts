import type { NanoBite } from '../types';
export const HOSPITALITY_BITES: NanoBite[] = [
  { id: 'hosp.ops.greet', industryId: 'tertiary.hospitality', valueChainStage: 'service',    microElement: 'Front of House', task: 'Customer greeting protocol', cadence: 'daily', automatable: false },
  { id: 'hosp.ops.turn',  industryId: 'tertiary.hospitality', valueChainStage: 'operations', microElement: 'Housekeeping',   task: 'Room turn cycle', cadence: 'daily', automatable: false },
  // ── Spatial Telemetry bites (validated by validateSpatialEvent in telemetry.ts) ──
  { id: 'hosp.ops.guest_flow_tracking', industryId: 'tertiary.hospitality', valueChainStage: 'operations',     microElement: 'Spatial AI Navigation', task: 'Execute Adaptive Monte Carlo Localization for guest floor traversal', cadence: 'daily', automatable: true,  requiresTier: 'enterprise' },
  { id: 'hosp.service.proximity_greeting', industryId: 'tertiary.hospitality', valueChainStage: 'service',     microElement: 'UWB Proximity',         task: 'Trigger guest-experience greeting via UWB tag detection',             cadence: 'event', automatable: false, requiresTier: 'pro' },
  { id: 'hosp.ops.kitchen_telemetry',   industryId: 'tertiary.hospitality', valueChainStage: 'operations',    microElement: 'Kitchen Automation',     task: 'Monitor Speed-of-Service (SoS) via kitchen display telemetry',         cadence: 'event', automatable: true,  requiresTier: 'pro' },
  { id: 'hosp.infra.spatial_audit',     industryId: 'tertiary.hospitality', valueChainStage: 'infrastructure', microElement: 'LiDAR Mapping',         task: 'Update Property Management System (PMS) via mobile LiDAR scan',       cadence: 'monthly', automatable: false, requiresTier: 'enterprise' },
];
