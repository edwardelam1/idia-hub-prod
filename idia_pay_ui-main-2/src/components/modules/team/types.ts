export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'employee';
  status: 'active' | 'inactive' | 'pending';
  hourly_rate?: number;
  assigned_locations: string[];
  permissions: Record<string, boolean>;
  last_login?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  key: string;
  label: string;
  description: string;
  category: 'screens' | 'functions' | 'data';
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  isCustom?: boolean;
}

export const DEFAULT_PERMISSIONS: Permission[] = [
  // Screen Access
  { id: 's1', key: 'screen_overview', label: 'View Overview Dashboard', description: 'Access the main overview/dashboard screen', category: 'screens' },
  { id: 's2', key: 'screen_pos', label: 'Access POS Terminal', description: 'Access the Point-of-Sale module', category: 'screens' },
  { id: 's3', key: 'screen_team', label: 'Access Team Management', description: 'Access the team management screen', category: 'screens' },
  { id: 's4', key: 'screen_menu', label: 'Access Menu Management', description: 'Access the menu management screen', category: 'screens' },
  { id: 's5', key: 'screen_recipes', label: 'Access Recipe Management', description: 'Access the recipe management screen', category: 'screens' },
  { id: 's6', key: 'screen_inventory', label: 'Access Inventory Management', description: 'Access the inventory management screen', category: 'screens' },
  { id: 's7', key: 'screen_reports', label: 'Access Reports & Analytics', description: 'Access the reports and analytics screen', category: 'screens' },
  { id: 's8', key: 'screen_xr', label: 'Access XR Management', description: 'Access the XR management screen', category: 'screens' },
  { id: 's9', key: 'screen_affiliates', label: 'Access Affiliate Management', description: 'Access the affiliate management screen', category: 'screens' },
  { id: 's10', key: 'screen_tax', label: 'Access Tax Center', description: 'Access the tax center screen', category: 'screens' },
  { id: 's11', key: 'screen_settings', label: 'Access Settings', description: 'Access system settings screens', category: 'screens' },
  { id: 's12', key: 'screen_timesheets', label: 'Access Timesheets', description: 'Access the timesheets module', category: 'screens' },
  { id: 's13', key: 'screen_timecard', label: 'Access Time Card', description: 'Access the personal time card', category: 'screens' },

  // Function Access
  { id: 'f1', key: 'fn_process_sale', label: 'Process POS Sales', description: 'Complete sales transactions at the POS', category: 'functions' },
  { id: 'f2', key: 'fn_issue_refund', label: 'Issue POS Refunds', description: 'Issue refunds on completed transactions', category: 'functions' },
  { id: 'f3', key: 'fn_void_transaction', label: 'Void POS Transactions', description: 'Void/cancel completed POS transactions', category: 'functions' },
  { id: 'f4', key: 'fn_apply_discount', label: 'Apply Discounts at POS', description: 'Apply discount overrides during checkout', category: 'functions' },
  { id: 'f5', key: 'fn_manage_menu_items', label: 'Add/Edit/Delete Menu Items', description: 'Create, modify, or remove menu items', category: 'functions' },
  { id: 'f6', key: 'fn_manage_recipes', label: 'Add/Edit/Delete Recipes', description: 'Create, modify, or remove recipes', category: 'functions' },
  { id: 'f7', key: 'fn_manage_inventory', label: 'Add/Edit Inventory Items', description: 'Create or modify inventory items', category: 'functions' },
  { id: 'f8', key: 'fn_record_transaction', label: 'Record Inventory Transactions', description: 'Log inventory receiving, adjustments, and waste', category: 'functions' },
  { id: 'f9', key: 'fn_transfer_inventory', label: 'Transfer Inventory Between Locations', description: 'Move inventory between business locations', category: 'functions' },
  { id: 'f10', key: 'fn_manage_team', label: 'Add/Edit/Remove Team Members', description: 'Manage team member accounts and roles', category: 'functions' },
  { id: 'f11', key: 'fn_manage_permissions', label: 'Create/Edit Permission Templates', description: 'Create and modify permission templates', category: 'functions' },
  { id: 'f12', key: 'fn_process_payroll', label: 'Process Payroll', description: 'Run and approve payroll processing', category: 'functions' },
  { id: 'f13', key: 'fn_global_menu_update', label: 'Push Global Menu Updates', description: 'Push menu changes across all locations', category: 'functions' },

  // Data Access
  { id: 'd1', key: 'data_view_reports', label: 'View Report Data', description: 'Access and view report analytics data', category: 'data' },
  { id: 'd2', key: 'data_export', label: 'Export/Download Data', description: 'Download data exports (CSV, PDF, etc.)', category: 'data' },
  { id: 'd3', key: 'data_view_financials', label: 'View Financial Data & GL', description: 'Access financial statements and general ledger', category: 'data' },
  { id: 'd4', key: 'data_view_tax', label: 'View Tax Reports', description: 'Access tax reports and 1099-K data', category: 'data' },
  { id: 'd5', key: 'data_manage_settings', label: 'Modify Business Settings', description: 'Change business profile, locations, payment config', category: 'data' },
];

const allTrue = Object.fromEntries(DEFAULT_PERMISSIONS.map(p => [p.key, true]));
const allFalse = Object.fromEntries(DEFAULT_PERMISSIONS.map(p => [p.key, false]));

export const DEFAULT_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Store Manager',
    description: 'Full access to all screens, functions, and data',
    permissions: { ...allTrue },
  },
  {
    id: 'tpl-2',
    name: 'Cashier',
    description: 'POS operations, time card, and basic sales functions',
    permissions: {
      ...allFalse,
      screen_pos: true,
      screen_timecard: true,
      fn_process_sale: true,
      fn_issue_refund: true,
      fn_apply_discount: true,
    },
  },
  {
    id: 'tpl-3',
    name: 'Inventory Specialist',
    description: 'Inventory management with reporting access',
    permissions: {
      ...allFalse,
      screen_overview: true,
      screen_pos: true,
      screen_inventory: true,
      screen_timecard: true,
      fn_process_sale: true,
      fn_manage_inventory: true,
      fn_record_transaction: true,
      fn_transfer_inventory: true,
      data_view_reports: true,
    },
  },
];
