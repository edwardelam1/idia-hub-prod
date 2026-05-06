// src/taxonomy/nanoBites/operations.ts

import { NanoBite } from '../types'; // Assuming this is your standard type import

export const KDS_ROUTING_TELEMETRY: NanoBite = {
  id: "nb-ops-kds-routing",
  name: "KDS Routing & Execution Velocity",
  description: "Algorithmic routing metrics for thermal processing, coursing intervals, and Back-of-House station load balancing.",
  category: "Food & Beverage Operations",
  dataVectors: [
    "Station IDs (Broiler, Garde Manger, Fry)",
    "Thermal Process Latency",
    "Fire/Hold Coursing States",
    "Ticket Velocity (TPS)",
    "Void/Comp Ratios by Station"
  ],
  valueProposition: "Enables predictive labor scheduling and menu engineering by exposing exact physiological kitchen bottlenecks."
};

export const HOUSEKEEPING_ENV_SERVICES: NanoBite = {
  id: "nb-ops-housekeeping",
  name: "Environmental Services & Cart Telemetry",
  description: "Spatial tracking of physical property turnover, chemical hazard depletion, and real-time linen par status.",
  category: "Property Management",
  dataVectors: [
    "Operator Zone Assignments",
    "Linen Par Depletion Status (%)",
    "Chemical Extraction Rates (FIFO)",
    "Room Turnover Latency",
    "Micro-Inventory Refill Frequency"
  ],
  valueProposition: "Drastically reduces capital leakage in FFE (Furniture, Fixtures, and Equipment) and optimizes high-volume turnaround compression."
};

export const CMMS_WORK_ORDERS: NanoBite = {
  id: "nb-ops-cmms",
  name: "CMMS & Preventative Maintenance",
  description: "Real-time telemetry on capital asset health, Lock-Out/Tag-Out (LOTO) protocols, and predictive engineering interventions.",
  category: "Facilities Infrastructure",
  dataVectors: [
    "Asset Diagnostic IDs",
    "LOTO (Lock-Out/Tag-Out) Status",
    "Intervention Timestamps",
    "HVAC/Plumbing Load Telemetry",
    "Engineering Spare Part Depletion"
  ],
  valueProposition: "Transforms reactive emergency maintenance into predictive asset preservation, saving vast utility and replacement costs."
};

export const LIFE_SAFETY_COMPLIANCE: NanoBite = {
  id: "nb-ops-life-safety",
  name: "Life Safety & Occupational Governance",
  description: "Immutable event ledgers for physical hazard intercepts, certification gating, and operator compliance.",
  category: "Risk & Liability",
  dataVectors: [
    "Shift Gateway Intercept Events",
    "Occupational Certification States",
    "HAZMAT Storage Anomalies",
    "Till Assignment Discrepancies",
    "Handbook Signature Audits"
  ],
  valueProposition: "Mathematically isolates the enterprise from crippling legal liabilities by enforcing strict, autonomous operational gating."
};

export const OperationsNanoBites = [
  KDS_ROUTING_TELEMETRY,
  HOUSEKEEPING_ENV_SERVICES,
  CMMS_WORK_ORDERS,
  LIFE_SAFETY_COMPLIANCE
];