import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MenuItem } from "./menuData";
import { MenuItemCard } from "./MenuItemCard";

interface MenuCategorySectionProps {
  category: string;
  items: MenuItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onToggleLock: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem) => void;
}

export const MenuCategorySection = ({
  category,
  items,
  isExpanded,
  onToggle,
  onToggleLock,
  onToggleActive
}: MenuCategorySectionProps) => {
  if (items.length === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <CardTitle className="text-sm">{category}</CardTitle>
                <Badge variant="secondary" className="text-xs">{items.length} items</Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onToggleLock={onToggleLock}
                  onToggleActive={onToggleActive}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
