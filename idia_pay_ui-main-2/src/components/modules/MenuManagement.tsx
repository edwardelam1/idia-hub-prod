import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Utensils, Search, Package, Lock, Unlock, Trash2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { MenuItem } from "./menu/menuData";
import { MenuHistoryPanel } from "./menu/MenuHistoryPanel";

export const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const businessId = await getBusinessId();
      const { data, error } = await supabase
        .from('menu_items' as any)
        .select('*')
        .eq('business_id', businessId);

      if (error) {
        console.error('Error loading menu items:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const items: MenuItem[] = (data as any[]).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          base_price: Number(item.base_price) || 0,
          cost_price: Number(item.cost_price) || 0,
          category: item.category || 'Main Course',
          is_active: item.is_active ?? true,
          is_locked: item.is_locked ?? false,
          business_id: item.business_id,
          recipe_id: item.recipe_id,
          menu_status: item.menu_status || 'available',
          preparation_time: item.preparation_time,
          allergen_info: item.allergen_info || [],
          image_url: item.image_url || null,
        }));

        setMenuItems(items);
        const uniqueCategories = [...new Set(items.map(item => item.category))];
        setCategories(uniqueCategories);
        if (uniqueCategories.length > 0 && expandedCategories.length === 0) {
          setExpandedCategories([uniqueCategories[0]]);
        }
      }
    } catch (err) {
      console.error('Error loading menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const logMenuHistory = async (itemName: string, action: string, menuItemId?: string) => {
    const businessId = await getBusinessId();
    await supabase.from('menu_history' as any).insert({
      business_id: businessId,
      menu_item_id: menuItemId || null,
      item_name: itemName,
      action,
      performed_by: 'System',
    } as any);
  };

  const toggleItemLock = async (item: MenuItem) => {
    const newLocked = !item.is_locked;
    const { error } = await supabase
      .from('menu_items' as any)
      .update({ is_locked: newLocked } as any)
      .eq('id', item.id);

    if (!error) {
      setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_locked: newLocked } : m));
      toast({
        title: `Item ${newLocked ? 'Locked' : 'Unlocked'}`,
        description: `${item.name} has been ${newLocked ? 'locked' : 'unlocked'}`,
      });
    }
  };

  const toggleItemActive = async (item: MenuItem) => {
    const newActive = !item.is_active;
    const { error } = await supabase
      .from('menu_items' as any)
      .update({ is_active: newActive } as any)
      .eq('id', item.id);

    if (!error) {
      setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_active: newActive } : m));
      await logMenuHistory(item.name, newActive ? 'activated' : 'deactivated', item.id);
      toast({
        title: `Item ${newActive ? 'Activated' : 'Deactivated'}`,
        description: `${item.name} has been ${newActive ? 'activated' : 'deactivated'}`,
      });
    }
  };

  const removeMenuItem = async (item: MenuItem) => {
    if (item.is_active) {
      toast({
        title: "Cannot Remove Active Item",
        description: "Deactivate the menu item first to remove it.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase
      .from('menu_items' as any)
      .delete()
      .eq('id', item.id);

    if (!error) {
      setMenuItems(prev => prev.filter(m => m.id !== item.id));
      await logMenuHistory(item.name, 'removed', item.id);
      toast({
        title: "Item Removed",
        description: `${item.name} has been removed from the menu`,
      });
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showHistory) {
    return <MenuHistoryPanel onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="h-full max-h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center">
              <Utensils className="w-4 h-4 mr-2" />
              Menu Management
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage menu items and pricing
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
        </div>
      </div>

      <div className="flex-shrink-0 p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      <div className="flex-shrink-0 px-3 py-2 border-b">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{menuItems.length} items</span>
          <span>{categories.length} categories</span>
          <span>{menuItems.filter(i => i.is_active).length} active</span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading menu...</div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Menu Items</h3>
            <p className="text-sm">Add recipes to your menu from the Recipe Management tab</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                {item.image_url && (
                  <div className="w-full aspect-square overflow-hidden rounded-t-lg">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader className="p-2">
                  <CardTitle className="text-xs sm:text-sm leading-tight line-clamp-1">{item.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 hidden sm:block">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <Badge variant="secondary" className="text-xs mb-1 px-1 py-0">
                        {item.category}
                      </Badge>
                      <div className="font-bold text-sm">${item.base_price.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Cost: ${item.cost_price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => toggleItemActive(item)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleItemLock(item)}
                      >
                        {item.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeMenuItem(item)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  );
};
