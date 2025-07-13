
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface PurchasedItem {
  id: string;
  name: string;
  description: string;
  price: number;
  bundleId: string; // Changed to string to support UUIDs
  bundleName: string;
  quantity?: number;
}

export interface PurchaseRecord {
  id: string;
  items: PurchasedItem[];
  bundleId?: string; // Changed to string to support UUIDs
  bundleName?: string;
  purchaseDate: string;
  totalCost: number;
  purchaseType: 'bundle' | 'ala-carte';
}

interface PurchaseHistoryContextType {
  purchaseHistory: PurchaseRecord[];
  addPurchase: (purchase: Omit<PurchaseRecord, 'id' | 'purchaseDate'>) => void;
  getPurchaseById: (id: string) => PurchaseRecord | undefined;
  getAllPurchases: () => PurchaseRecord[];
}

const PurchaseHistoryContext = createContext<PurchaseHistoryContextType | undefined>(undefined);

export const PurchaseHistoryProvider = ({ children }: { children: ReactNode }) => {
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('purchaseHistory');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPurchaseHistory(parsed);
      } catch (error) {
        console.error('Error loading purchase history:', error);
      }
    }
  }, []);

  // Save to localStorage whenever history changes
  useEffect(() => {
    localStorage.setItem('purchaseHistory', JSON.stringify(purchaseHistory));
  }, [purchaseHistory]);

  const addPurchase = (purchase: Omit<PurchaseRecord, 'id' | 'purchaseDate'>) => {
    const newPurchase: PurchaseRecord = {
      ...purchase,
      id: `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      purchaseDate: new Date().toISOString(),
    };
    
    setPurchaseHistory(prev => [newPurchase, ...prev]);
  };

  const getPurchaseById = (id: string) => {
    return purchaseHistory.find(purchase => purchase.id === id);
  };

  const getAllPurchases = () => {
    return purchaseHistory;
  };

  return (
    <PurchaseHistoryContext.Provider value={{
      purchaseHistory,
      addPurchase,
      getPurchaseById,
      getAllPurchases
    }}>
      {children}
    </PurchaseHistoryContext.Provider>
  );
};

export const usePurchaseHistory = () => {
  const context = useContext(PurchaseHistoryContext);
  if (context === undefined) {
    throw new Error('usePurchaseHistory must be used within a PurchaseHistoryProvider');
  }
  return context;
};
