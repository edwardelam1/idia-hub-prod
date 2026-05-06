import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for manufacturing-extended
export const MANUFACTURING_EXTENDED_BITES: NanoBite[] = [
  // secondary.manufacturing.assembly
  { id: 'mfg.asm.1', industryId: 'secondary.manufacturing.assembly', valueChainStage: 'operations', microElement: "Work Order", task: "Work-order release", cadence: 'daily', automatable: true },
  { id: 'mfg.asm.2', industryId: 'secondary.manufacturing.assembly', valueChainStage: 'operations', microElement: "BOM", task: "BOM consumption", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.asm.3', industryId: 'secondary.manufacturing.assembly', valueChainStage: 'operations', microElement: "OEE", task: "OEE tracking", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.asm.4', industryId: 'secondary.manufacturing.assembly', valueChainStage: 'operations', microElement: "Scrap", task: "Scrap & rework log", cadence: 'daily', automatable: true },
  { id: 'mfg.asm.5', industryId: 'secondary.manufacturing.assembly', valueChainStage: 'outbound_logistics', microElement: "Finish Move", task: "Finished-goods move", cadence: 'daily', automatable: true },
  // secondary.manufacturing.processing
  { id: 'mfg.proc.1', industryId: 'secondary.manufacturing.processing', valueChainStage: 'operations', microElement: "Batch", task: "Batch-process record", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.proc.2', industryId: 'secondary.manufacturing.processing', valueChainStage: 'operations', microElement: "In-Proc QA", task: "In-process QA", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.proc.3', industryId: 'secondary.manufacturing.processing', valueChainStage: 'inbound_logistics', microElement: "Raw Lot", task: "Raw-lot traceability", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.proc.4', industryId: 'secondary.manufacturing.processing', valueChainStage: 'operations', microElement: "Yield", task: "Yield variance", cadence: 'daily', automatable: true },
  { id: 'mfg.proc.5', industryId: 'secondary.manufacturing.processing', valueChainStage: 'infrastructure', microElement: "MSDS", task: "SDS document control", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  // secondary.manufacturing.packaging
  { id: 'mfg.pkg.1', industryId: 'secondary.manufacturing.packaging', valueChainStage: 'operations', microElement: "Line Speed", task: "Line-speed monitor", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.pkg.2', industryId: 'secondary.manufacturing.packaging', valueChainStage: 'operations', microElement: "Label Verify", task: "Label-verify scan", cadence: 'daily', automatable: true },
  { id: 'mfg.pkg.3', industryId: 'secondary.manufacturing.packaging', valueChainStage: 'operations', microElement: "Changeover", task: "Changeover SMED", cadence: 'daily', automatable: true },
  { id: 'mfg.pkg.4', industryId: 'secondary.manufacturing.packaging', valueChainStage: 'outbound_logistics', microElement: "Pallet Build", task: "Pallet build & SSCC", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.pkg.5', industryId: 'secondary.manufacturing.packaging', valueChainStage: 'operations', microElement: "Reject", task: "Reject line capture", cadence: 'daily', automatable: true },
  // secondary.manufacturing.quality_control
  { id: 'mfg.qc.1', industryId: 'secondary.manufacturing.quality_control', valueChainStage: 'operations', microElement: "SPC", task: "SPC chart capture", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.qc.2', industryId: 'secondary.manufacturing.quality_control', valueChainStage: 'operations', microElement: "NCR", task: "Non-conformance report", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.qc.3', industryId: 'secondary.manufacturing.quality_control', valueChainStage: 'operations', microElement: "CAPA", task: "CAPA workflow", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'mfg.qc.4', industryId: 'secondary.manufacturing.quality_control', valueChainStage: 'operations', microElement: "Calibration", task: "Gauge calibration log", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.qc.5', industryId: 'secondary.manufacturing.quality_control', valueChainStage: 'service', microElement: "Cert", task: "Certificate of analysis", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // secondary.manufacturing.textile
  { id: 'mfg.tex.1', industryId: 'secondary.manufacturing.textile', valueChainStage: 'operations', microElement: "Loom", task: "Loom run-time tracking", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.tex.2', industryId: 'secondary.manufacturing.textile', valueChainStage: 'operations', microElement: "Dye Lot", task: "Dye-lot record", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mfg.tex.3', industryId: 'secondary.manufacturing.textile', valueChainStage: 'inbound_logistics', microElement: "Yarn", task: "Yarn lot intake", cadence: 'weekly', automatable: true },
  { id: 'mfg.tex.4', industryId: 'secondary.manufacturing.textile', valueChainStage: 'operations', microElement: "Cut Plan", task: "Cut-plan optimization", cadence: 'daily', automatable: true },
  { id: 'mfg.tex.5', industryId: 'secondary.manufacturing.textile', valueChainStage: 'operations', microElement: "Defect", task: "Fabric defect map", cadence: 'daily', automatable: true },
];
