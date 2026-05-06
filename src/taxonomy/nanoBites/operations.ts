// src/taxonomy/nanoBites/operations.ts

import { NanoBite } from '../types';

export const KDS_ROUTING_TELEMETRY: NanoBite = {
  id: "nb-ops-kds-routing",
  industryId: "tertiary.hospitality",
  valueChainStage: "operations",
  microElement: "KDS",
  task: "KDS routing & execution velocity",
  cadence: "daily",
  automatable: true,
  requiresTier: "pro"
};

export const HOUSEKEEPING_ENV_SERVICES: NanoBite = {
  id: "nb-ops-housekeeping",
  industryId: "tertiary.hospitality",
  valueChainStage: "operations",
  microElement: "Housekeeping",
  task: "Environmental services & cart telemetry",
  cadence: "daily",
  automatable: true
};

export const CMMS_WORK_ORDERS: NanoBite = {
  id: "nb-ops-cmms",
  industryId: "tertiary.hospitality", // or specific infrastructure industryId
  valueChainStage: "infrastructure",
  microElement: "CMMS",
  task: "Work orders & preventative maintenance",
  cadence: "daily",
  automatable: true,
  requiresTier: "pro"
};

export const LIFE_SAFETY_COMPLIANCE: NanoBite = {
  id: "nb-ops-life-safety",
  industryId: "tertiary.hospitality",
  valueChainStage: "infrastructure",
  microElement: "Life Safety",
  task: "Safety & occupational governance",
  cadence: "event",
  automatable: true,
  requiresTier: "basic"
};

export const OperationsNanoBites: NanoBite[] = [
  KDS_ROUTING_TELEMETRY,
  HOUSEKEEPING_ENV_SERVICES,
  CMMS_WORK_ORDERS,
  LIFE_SAFETY_COMPLIANCE
];