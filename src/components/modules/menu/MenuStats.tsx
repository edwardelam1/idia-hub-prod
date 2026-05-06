import { MenuItem, getMarginPercentage } from "./menuData";

interface MenuStatsProps {
  menuItems: MenuItem[];
  categoriesCount: number;
}

export const MenuStats = ({ menuItems, categoriesCount }: MenuStatsProps) => {
  const avgMargin = menuItems.length > 0 
    ? Math.round(menuItems.reduce((sum, item) => sum + getMarginPercentage(item.base_price, item.cost_price), 0) / menuItems.length)
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="text-center">
        <div className="text-lg font-bold">{menuItems.length}</div>
        <div className="text-xs text-muted-foreground">Total Items</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold">{menuItems.filter(item => item.is_active).length}</div>
        <div className="text-xs text-muted-foreground">Active</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold">{categoriesCount}</div>
        <div className="text-xs text-muted-foreground">Categories</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold">{avgMargin}%</div>
        <div className="text-xs text-muted-foreground">Avg Margin</div>
      </div>
    </div>
  );
};
