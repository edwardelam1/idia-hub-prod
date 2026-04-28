export interface MenuItem {
  id: string;
  name: string;
  description: string;
  base_price: number;
  cost_price: number;
  category: string;
  is_active: boolean;
  is_locked: boolean;
  business_id: string;
  recipe_id?: string;
  menu_status: string;
  preparation_time?: number;
  allergen_info?: string[];
  image_url?: string | null;
}

export const getMarginPercentage = (basePrice: number, costPrice: number) => {
  if (costPrice === 0) return 0;
  return ((basePrice - costPrice) / basePrice * 100);
};

export const getProfitability = (margin: number) => {
  if (margin >= 70) return { label: 'Excellent', color: 'default' };
  if (margin >= 50) return { label: 'Good', color: 'secondary' };
  if (margin >= 30) return { label: 'Fair', color: 'outline' };
  return { label: 'Poor', color: 'destructive' };
};
