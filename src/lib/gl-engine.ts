import { supabase } from "@/integrations/supabase/client";

export type GLTransactionType = 
  | 'PO_Receipt'
  | 'PO_Receipt_Accrual'
  | 'Invoice_Match'
  | 'Production_Run'
  | 'POS_Sale'
  | 'Inventory_Depletion'
  | 'Wastage'
  | 'Adjustment'
  | 'Transfer';

interface JournalEntryInput {
  businessId: string;
  transactionType: GLTransactionType;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  referenceId?: string;
  referenceType?: string;
  productId?: string;
}

// GL Account mappings per transaction type
export const GL_ACCOUNTS: Record<GLTransactionType, { debit: string; credit: string }> = {
  'PO_Receipt':           { debit: 'Inventory Asset',    credit: 'Accounts Payable' },
  'PO_Receipt_Accrual':   { debit: 'Inventory Asset',    credit: 'Accrued Liabilities (AP Clearing)' },
  'Invoice_Match':        { debit: 'Accrued Liabilities (AP Clearing)', credit: 'Accounts Payable' },
  'Production_Run':       { debit: 'WIP Inventory',      credit: 'Raw Materials' },
  'POS_Sale':             { debit: 'Cash / Tender',      credit: 'Sales Revenue' },
  'Inventory_Depletion':  { debit: 'COGS Expense',       credit: 'Finished Goods' },
  'Wastage':              { debit: 'Spoilage Expense',   credit: 'Inventory Asset' },
  'Adjustment':           { debit: 'Inventory Asset',    credit: 'Adjustment Variance' },
  'Transfer':             { debit: 'Inventory Asset (To)', credit: 'Inventory Asset (From)' },
};

/**
 * Create a journal entry in the GL
 */
export const createJournalEntry = async (entry: JournalEntryInput): Promise<boolean> => {
  const { error } = await supabase
    .from('gl_journal_entries' as any)
    .insert({
      business_id: entry.businessId,
      transaction_type: entry.transactionType,
      description: entry.description,
      debit_account: entry.debitAccount,
      credit_account: entry.creditAccount,
      amount: entry.amount,
      reference_id: entry.referenceId || null,
      reference_type: entry.referenceType || null,
      product_id: entry.productId || null,
    });

  if (error) {
    console.error('GL Journal Entry Error:', error);
    return false;
  }
  return true;
};

/**
 * Auto-generate journal entry for a transaction type
 */
export const autoJournalEntry = async (
  businessId: string,
  type: GLTransactionType,
  amount: number,
  description: string,
  productId?: string,
  referenceId?: string,
  referenceType?: string
): Promise<boolean> => {
  const accounts = GL_ACCOUNTS[type];
  return createJournalEntry({
    businessId,
    transactionType: type,
    description,
    debitAccount: accounts.debit,
    creditAccount: accounts.credit,
    amount,
    referenceId,
    referenceType,
    productId,
  });
};

/**
 * Fetch journal entries for a business
 */
export const fetchJournalEntries = async (businessId: string, limit = 100) => {
  const { data, error } = await supabase
    .from('gl_journal_entries' as any)
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching GL entries:', error);
    return [];
  }
  return data || [];
};
