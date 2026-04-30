
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChefHat, Plus, Search, Trash2, Clock, Users, DollarSign, Package, BookOpen, History, AlertTriangle, Utensils, Scale, Beaker, Edit, Camera, X, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { loadUOMData, getDimensionForUnit, convertUnits, type UOMUnit } from "@/lib/uom-engine";

interface Recipe {
  id: string;
  business_id: string;
  name: string;
  description: string;
  category: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: string;
  base_price: number;
  allergens: string[];
  instructions: string | null;
  created_at: string;
  image_url?: string | null;
  ingredients?: RecipeIngredient[];
  total_cost?: number;
}

interface RecipeIngredient {
  id?: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  gross_quantity?: number;
  yield_percentage?: number;
  item_name?: string;
  item_cost?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  unit_of_measure: string;
  individual_unit_uom: string;
  current_cost: number;
  current_stock: number;
  category: string;
}

const CATEGORIES = ["Appetizer", "Main Course", "Dessert", "Beverage", "Side Dish", "Sauce", "Sub-Recipe", "Bakery"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const COMMON_ALLERGENS = ["Gluten", "Dairy", "Eggs", "Peanuts", "Tree Nuts", "Soy", "Fish", "Shellfish", "Sesame", "Sulfites"];

const createEmptyIngredient = () => ({
  inventory_item_id: '',
  quantity: 1,
  unit: '',
  gross_quantity: 1,
  yield_percentage: 100,
});

export const RecipeManagement = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [uomUnits, setUomUnits] = useState<UOMUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [densityWarnings, setDensityWarnings] = useState<Record<number, boolean>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editDensityWarnings, setEditDensityWarnings] = useState<Record<number, boolean>>({});
  const [menuItemRecipeIds, setMenuItemRecipeIds] = useState<string[]>([]);
  const [allMenuRecipeIds, setAllMenuRecipeIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Create form state
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    category: 'Main Course',
    prep_time: 0,
    cook_time: 0,
    servings: 1,
    difficulty: 'Easy',
    base_price: 0,
    allergens: [] as string[],
    instructions: '',
    ingredients: [createEmptyIngredient()] as { inventory_item_id: string; quantity: number; unit: string; gross_quantity: number; yield_percentage: number }[]
  });

  useEffect(() => {
    loadData();
    loadMenuRecipeIds();
    loadUOMData().then(({ units }) => setUomUnits(units));
  }, []);

  const loadMenuRecipeIds = async () => {
    const businessId = await getBusinessId();
    const { data } = await supabase
      .from('menu_items')
      .select('recipe_id, is_active')
      .eq('business_id', businessId);
    if (data) {
      // Active menu items block editing
      setMenuItemRecipeIds(
        data.filter((d: any) => d.is_active).map((d: any) => d.recipe_id).filter(Boolean)
      );
      // ALL menu items (active or inactive) block recipe deletion
      setAllMenuRecipeIds(
        data.map((d: any) => d.recipe_id).filter(Boolean)
      );
    }
  };

  const loadData = async () => {
    const businessId = await getBusinessId();

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (!error && data) {
        setInventoryItems(data.map(item => ({
          id: item.id,
          name: item.name,
          unit_of_measure: item.unit_of_measure || 'each',
          individual_unit_uom: item.individual_unit_uom || item.unit_of_measure || 'each',
          current_cost: item.current_cost || 0,
          current_stock: (item as any).current_stock ?? 0,
          category: item.category || 'General'
        })));
      }
    } catch (err) {
      console.error('Error loading inventory for recipes:', err);
    }

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(*)')
        .eq('business_id', businessId);

      if (!error && data) {
        setRecipes(data.map(r => ({
          id: r.id,
          business_id: r.business_id,
          name: r.name,
          description: (r as any).description || '',
          category: r.category || 'Main Course',
          prep_time: r.prep_time || 0,
          cook_time: (r as any).cook_time || 0,
          servings: (r as any).servings || 1,
          difficulty: (r as any).difficulty || 'Easy',
          base_price: (r as any).base_price || 0,
          allergens: (r as any).allergens || [],
          instructions: r.instructions,
          image_url: (r as any).image_url || null,
          created_at: r.created_at || '',
          ingredients: ((r as any).recipe_ingredients || []).map((ing: any) => ({
            id: ing.id,
            recipe_id: ing.recipe_id,
            inventory_item_id: ing.inventory_item_id,
            quantity: ing.quantity,
            unit: ing.unit,
            gross_quantity: ing.gross_quantity || ing.quantity,
            yield_percentage: ing.yield_percentage || 100,
          })),
          total_cost: 0
        })));
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    }
  };

  const categories = ["all", ...CATEGORIES];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toDimension = (unit: string) => getDimensionForUnit(unit) || "Unknown";

  const calculateFormCost = () => {
    return newRecipe.ingredients.reduce((sum, ing) => {
      const item = inventoryItems.find(i => i.id === ing.inventory_item_id);
      const grossQty = ing.gross_quantity > 0 ? ing.gross_quantity : ing.quantity;
      return sum + (grossQty * (item?.current_cost || 0));
    }, 0);
  };

  const calculateCostPerServing = () => {
    const total = calculateFormCost();
    return newRecipe.servings > 0 ? total / newRecipe.servings : total;
  };

  const calculateMargin = () => {
    const costPerServing = calculateCostPerServing();
    if (newRecipe.base_price <= 0 || costPerServing <= 0) return 0;
    return ((newRecipe.base_price - costPerServing) / newRecipe.base_price) * 100;
  };

  const calculateProfit = () => {
    return newRecipe.base_price - calculateCostPerServing();
  };

  const resetForm = () => {
    setNewRecipe({
      name: '', description: '', category: 'Main Course', prep_time: 0, cook_time: 0,
      servings: 1, difficulty: 'Easy', base_price: 0, allergens: [], instructions: '',
      ingredients: [createEmptyIngredient()]
    });
    setDensityWarnings({});
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please select an image file", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    if (isEdit) {
      setEditPhotoFile(file);
      setEditPhotoPreview(url);
    } else {
      setPhotoFile(file);
      setPhotoPreview(url);
    }
  };

  const uploadPhoto = async (file: File, recipeId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${recipeId}.${ext}`;
    const { error } = await supabase.storage.from('recipe-photos').upload(path, file, { upsert: true });
    if (error) {
      console.error('Photo upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('recipe-photos').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCreateRecipe = async () => {
    if (!newRecipe.name.trim()) {
      toast({ title: "Validation Error", description: "Recipe name is required", variant: "destructive" });
      return;
    }
    const validCreateIngredients = newRecipe.ingredients.filter(i => i.inventory_item_id.trim() !== "");
    if (validCreateIngredients.length === 0) {
      toast({ title: "Validation Error", description: "At least one ingredient is required", variant: "destructive" });
      return;
    }
    if (newRecipe.servings < 1) {
      toast({ title: "Validation Error", description: "Servings must be at least 1", variant: "destructive" });
      return;
    }

    // Check density warnings
    const hasDensityIssues = Object.values(densityWarnings).some(v => v);
    if (hasDensityIssues) {
      toast({ title: "UOM Gate", description: "Resolve cross-dimensional unit warnings before saving", variant: "destructive" });
      return;
    }

    // Validate ingredient stock
    for (const ing of newRecipe.ingredients) {
      const item = inventoryItems.find(i => i.id === ing.inventory_item_id);
      if (!item) continue;
      const grossQty = ing.gross_quantity > 0 ? ing.gross_quantity : ing.quantity;
      if (grossQty > item.current_stock) {
        toast({
          title: "Insufficient Stock",
          description: `${item.name} only has ${item.current_stock} ${item.unit_of_measure} available, but recipe requires ${grossQty}`,
          variant: "destructive"
        });
        return;
      }
    }

    const businessId = await getBusinessId();

    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        business_id: businessId,
        name: newRecipe.name.trim(),
        description: newRecipe.description.trim(),
        category: newRecipe.category,
        prep_time: newRecipe.prep_time,
        cook_time: newRecipe.cook_time,
        servings: newRecipe.servings,
        difficulty: newRecipe.difficulty,
        base_price: newRecipe.base_price,
        allergens: newRecipe.allergens,
        instructions: newRecipe.instructions.trim() || null,
      } as any)
      .select()
      .single();

    if (recipeError || !recipeData) {
      toast({ title: "Error", description: "Failed to create recipe", variant: "destructive" });
      return;
    }

    if (newRecipe.ingredients.length > 0) {
      const { error: ingError } = await supabase
        .from('recipe_ingredients')
        .insert(newRecipe.ingredients.map(ing => ({
          recipe_id: (recipeData as any).id,
          inventory_item_id: ing.inventory_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          gross_quantity: ing.gross_quantity > 0 ? ing.gross_quantity : null,
          yield_percentage: ing.yield_percentage,
        })));

      if (ingError) console.error('Error inserting ingredients:', ingError);
    }

    // Upload photo if provided
    const recipeId = (recipeData as any).id;
    if (photoFile) {
      const imageUrl = await uploadPhoto(photoFile, recipeId);
      if (imageUrl) {
        await supabase.from('recipes').update({ image_url: imageUrl } as any).eq('id', recipeId);
      }
    }

    await supabase.from('recipe_history').insert({
      business_id: businessId,
      recipe_id: recipeId,
      recipe_name: newRecipe.name,
      action: 'created',
      note: `Created with ${newRecipe.ingredients.length} ingredient(s), cost $${calculateFormCost().toFixed(2)}, price $${newRecipe.base_price.toFixed(2)}, margin ${calculateMargin().toFixed(1)}%`,
    });

    toast({ title: "Recipe Created", description: `${newRecipe.name} has been added` });
    setIsCreateDialogOpen(false);
    resetForm();
    await loadData();
  };

  // Edit recipe handlers
  const openEditDialog = (recipe: Recipe) => {
    const isActiveOnMenu = menuItemRecipeIds.includes(recipe.id);
    if (isActiveOnMenu) {
      toast({
        title: "Recipe is Active on Menu",
        description: "Deactivate it on the menu first to edit.",
        variant: "destructive"
      });
      return;
    }
    setEditingRecipe(recipe);
    setEditForm({
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      base_price: recipe.base_price,
      allergens: recipe.allergens || [],
      instructions: recipe.instructions || '',
      ingredients: (recipe.ingredients || []).map(ing => ({
        inventory_item_id: ing.inventory_item_id,
        quantity: ing.quantity,
        unit: ing.unit,
        gross_quantity: ing.gross_quantity || ing.quantity,
        yield_percentage: ing.yield_percentage || 100,
      })),
    });
    setEditPhotoPreview(recipe.image_url || null);
    setEditPhotoFile(null);
    setEditDensityWarnings({});
    setIsEditDialogOpen(true);
  };

  const handleUpdateRecipe = async () => {
    if (!editingRecipe || !editForm) return;
    if (!editForm.name.trim()) {
      toast({ title: "Validation Error", description: "Recipe name is required", variant: "destructive" });
      return;
    }
    const validEditIngredients = editForm.ingredients.filter(i => i.inventory_item_id.trim() !== "");
    if (validEditIngredients.length === 0) {
      toast({ title: "Validation Error", description: "At least one ingredient is required", variant: "destructive" });
      return;
    }

    const businessId = await getBusinessId();

    // Upload new photo if changed
    let imageUrl = editingRecipe.image_url;
    if (editPhotoFile) {
      const uploaded = await uploadPhoto(editPhotoFile, editingRecipe.id);
      if (uploaded) imageUrl = uploaded;
    }

    const { error } = await supabase.from('recipes').update({
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      category: editForm.category,
      prep_time: editForm.prep_time,
      cook_time: editForm.cook_time,
      servings: editForm.servings,
      difficulty: editForm.difficulty,
      base_price: editForm.base_price,
      allergens: editForm.allergens,
      instructions: editForm.instructions.trim() || null,
      image_url: imageUrl,
    } as any).eq('id', editingRecipe.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update recipe", variant: "destructive" });
      return;
    }

    // Update ingredients
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', editingRecipe.id);
    if (editForm.ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        editForm.ingredients.map((ing: any) => ({
          recipe_id: editingRecipe.id,
          inventory_item_id: ing.inventory_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          gross_quantity: ing.gross_quantity > 0 ? ing.gross_quantity : null,
          yield_percentage: ing.yield_percentage,
        }))
      );
    }

    await supabase.from('recipe_history').insert({
      business_id: businessId,
      recipe_id: editingRecipe.id,
      recipe_name: editForm.name,
      action: 'updated',
      note: `Updated recipe details`,
    });

    toast({ title: "Recipe Updated", description: `${editForm.name} has been updated` });
    setIsEditDialogOpen(false);
    setEditingRecipe(null);
    setEditForm(null);
    await loadData();
    await loadMenuRecipeIds();
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    // Block deletion if recipe is on ANY menu item (active or inactive)
    if (allMenuRecipeIds.includes(recipeId)) {
      toast({
        title: "Recipe is on the Menu",
        description: "Remove it from the menu first to delete this recipe.",
        variant: "destructive"
      });
      return;
    }

    const recipe = recipes.find(r => r.id === recipeId);
    const businessId = await getBusinessId();

    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    const { error } = await supabase.from('recipes').delete().eq('id', recipeId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete recipe", variant: "destructive" });
      return;
    }

    await supabase.from('recipe_history').insert({
      business_id: businessId,
      recipe_id: recipeId,
      recipe_name: recipe?.name || 'Unknown',
      action: 'deleted',
    });

    toast({ title: "Recipe Deleted", description: `${recipe?.name} has been removed` });
    await loadData();
  };

  const handleAddToMenu = async (recipe: Recipe) => {
    const businessId = await getBusinessId();

    const { data: existing } = await supabase
      .from('menu_items')
      .select('id')
      .eq('recipe_id', recipe.id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (existing) {
      toast({ title: "Already on Menu", description: `${recipe.name} is already on the menu`, variant: "destructive" });
      return;
    }

    const totalCost = (recipe.ingredients || []).reduce((sum, ing) => {
      const item = inventoryItems.find(i => i.id === ing.inventory_item_id);
      const grossQty = ing.gross_quantity || ing.quantity;
      return sum + (grossQty * (item?.current_cost || 0));
    }, 0);
    const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : totalCost;

    const { error } = await supabase.from('menu_items' as any).insert({
      business_id: businessId,
      recipe_id: recipe.id,
      name: recipe.name,
      description: recipe.description || '',
      base_price: recipe.base_price || 0,
      cost_price: costPerServing,
      category: recipe.category,
      preparation_time: recipe.prep_time + recipe.cook_time,
      allergen_info: recipe.allergens || [],
      image_url: recipe.image_url || null,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add to menu", variant: "destructive" });
      return;
    }

    await supabase.from('recipe_history').insert({
      business_id: businessId,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      action: 'added_to_menu',
      note: `Price: $${(recipe.base_price || 0).toFixed(2)}, Cost/serving: $${costPerServing.toFixed(2)}`,
    });

    // Log to menu_history
    await supabase.from('menu_history' as any).insert({
      business_id: businessId,
      item_name: recipe.name,
      action: 'created',
      performed_by: 'System',
    } as any);

    toast({
      title: "Added to Menu",
      description: `${recipe.name} added at $${(recipe.base_price || 0).toFixed(2)}`,
    });
  };

  const addIngredient = () => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, createEmptyIngredient()]
    }));
  };

  const removeIngredient = (index: number) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
    setDensityWarnings(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => {
        if (i !== index) return ing;

        const updated = { ...ing, [field]: value };
        const selectedItem = inventoryItems.find(it => it.id === updated.inventory_item_id);

        if (field === 'inventory_item_id' && selectedItem) {
          // Use the content unit (individual_unit_uom) for recipes, not the stock/container unit
          updated.unit = selectedItem.individual_unit_uom || selectedItem.unit_of_measure;
        }

        if (field === 'unit' && selectedItem) {
          const customUnit = String(value || '').trim();
          // Compare against the content unit, not the container/stock unit
          const contentUnit = selectedItem.individual_unit_uom || selectedItem.unit_of_measure;

          if (customUnit && contentUnit && customUnit !== contentUnit) {
            const canConvert = convertUnits(1, customUnit, contentUnit) !== null;
            setDensityWarnings(prev => ({ ...prev, [index]: !canConvert }));
          } else {
            setDensityWarnings(prev => ({ ...prev, [index]: false }));
          }
        }

        // Auto-calculate gross from yield
        if (field === 'quantity' || field === 'yield_percentage') {
          const qty = field === 'quantity' ? value : updated.quantity;
          const yld = field === 'yield_percentage' ? value : updated.yield_percentage;
          if (yld > 0 && yld < 100) {
            updated.gross_quantity = parseFloat((qty / (yld / 100)).toFixed(4));
          } else {
            updated.gross_quantity = qty;
          }
        }

        return updated;
      })
    }));
  };

  const toggleAllergen = (allergen: string) => {
    setNewRecipe(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  // Edit form helpers (mirror create form)
  const editAddIngredient = () => {
    setEditForm((p: any) => ({ ...p, ingredients: [...p.ingredients, createEmptyIngredient()] }));
  };
  const editRemoveIngredient = (index: number) => {
    setEditForm((p: any) => ({ ...p, ingredients: p.ingredients.filter((_: any, i: number) => i !== index) }));
    setEditDensityWarnings(prev => { const next = { ...prev }; delete next[index]; return next; });
  };
  const editUpdateIngredient = (index: number, field: string, value: any) => {
    setEditForm((p: any) => ({
      ...p,
      ingredients: p.ingredients.map((ing: any, i: number) => {
        if (i !== index) return ing;
        const updated = { ...ing, [field]: value };
        const selectedItem = inventoryItems.find(it => it.id === updated.inventory_item_id);
        if (field === 'inventory_item_id' && selectedItem) {
          updated.unit = selectedItem.individual_unit_uom || selectedItem.unit_of_measure;
        }
        if (field === 'unit' && selectedItem) {
          const customUnit = String(value || '').trim();
          const contentUnit = selectedItem.individual_unit_uom || selectedItem.unit_of_measure;
          if (customUnit && contentUnit && customUnit !== contentUnit) {
            const canConvert = convertUnits(1, customUnit, contentUnit) !== null;
            setEditDensityWarnings(prev => ({ ...prev, [index]: !canConvert }));
          } else {
            setEditDensityWarnings(prev => ({ ...prev, [index]: false }));
          }
        }
        if (field === 'quantity' || field === 'yield_percentage') {
          const qty = field === 'quantity' ? value : updated.quantity;
          const yld = field === 'yield_percentage' ? value : updated.yield_percentage;
          if (yld > 0 && yld < 100) {
            updated.gross_quantity = parseFloat((qty / (yld / 100)).toFixed(4));
          } else {
            updated.gross_quantity = qty;
          }
        }
        return updated;
      })
    }));
  };
  const editToggleAllergen = (allergen: string) => {
    setEditForm((p: any) => ({
      ...p,
      allergens: p.allergens.includes(allergen) ? p.allergens.filter((a: string) => a !== allergen) : [...p.allergens, allergen]
    }));
  };
  const calculateEditFormCost = () => {
    if (!editForm) return 0;
    return editForm.ingredients.reduce((sum: number, ing: any) => {
      const item = inventoryItems.find(i => i.id === ing.inventory_item_id);
      const grossQty = ing.gross_quantity > 0 ? ing.gross_quantity : ing.quantity;
      return sum + (grossQty * (item?.current_cost || 0));
    }, 0);
  };
  const calculateEditCostPerServing = () => {
    const total = calculateEditFormCost();
    return editForm && editForm.servings > 0 ? total / editForm.servings : total;
  };
  const calculateEditMargin = () => {
    const costPerServing = calculateEditCostPerServing();
    if (!editForm || editForm.base_price <= 0 || costPerServing <= 0) return 0;
    return ((editForm.base_price - costPerServing) / editForm.base_price) * 100;
  };
  const calculateEditProfit = () => {
    return editForm ? editForm.base_price - calculateEditCostPerServing() : 0;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center">
              <ChefHat className="w-4 h-4 mr-2" />
              Recipe Management
            </h2>
            <p className="text-xs text-muted-foreground">Create recipes from inventory items</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-3 h-3 mr-1" />
                Create Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-4">
              <DialogHeader className="flex-shrink-0 pb-2">
                <DialogTitle className="text-base">Create New Recipe</DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {/* Photo + Row 1: Name, Category, Description */}
                <div className="flex gap-3">
                  {/* Photo Upload */}
                  <div className="flex-shrink-0">
                    <Label className="text-xs mb-1 block">Photo</Label>
                    <label className="cursor-pointer block w-[120px] h-[120px] rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors overflow-hidden relative bg-muted/20">
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Recipe" className="w-full h-full object-cover" />
                          <button type="button" className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5" onClick={(e) => { e.preventDefault(); setPhotoFile(null); setPhotoPreview(null); }}>
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Camera className="w-6 h-6 mb-1" />
                          <span className="text-[10px]">120 × 120</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e)} />
                    </label>
                  </div>
                  <div className="flex-1 grid grid-cols-5 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      className="h-7 text-xs"
                      placeholder="Recipe name"
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={newRecipe.category} onValueChange={(v) => setNewRecipe(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      className="h-7 text-xs"
                      placeholder="Brief description for menu display"
                      value={newRecipe.description}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Prep (min)</Label>
                    <Input className="h-7 text-xs" type="number" min="0" value={newRecipe.prep_time}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, prep_time: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cook (min)</Label>
                    <Input className="h-7 text-xs" type="number" min="0" value={newRecipe.cook_time}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, cook_time: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Servings *</Label>
                    <Input className="h-7 text-xs" type="number" min="1" value={newRecipe.servings}
                      onChange={(e) => setNewRecipe(prev => ({ ...prev, servings: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Difficulty</Label>
                    <Select value={newRecipe.difficulty} onValueChange={(v) => setNewRecipe(prev => ({ ...prev, difficulty: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Menu Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input className="h-7 text-xs pl-6" type="number" step="0.01" min="0" value={newRecipe.base_price}
                        onChange={(e) => setNewRecipe(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                </div>

                {/* Row 3: Ingredients */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Ingredients</span>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={addIngredient}>
                      <Plus className="w-3 h-3 mr-1" />Add
                    </Button>
                  </div>
                  <div className="border rounded-md">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground px-2 py-1 bg-muted/40 border-b">
                      <div className="col-span-3">Item</div>
                      <div className="col-span-1">Net</div>
                      <div className="col-span-1">Yield%</div>
                      <div className="col-span-1">Gross</div>
                      <div className="col-span-2">Unit</div>
                      <div className="col-span-2 text-right">Cost</div>
                      <div className="col-span-1 text-center">Stk</div>
                      <div className="col-span-1"></div>
                    </div>
                    {/* Rows */}
                    <div className="max-h-[140px] overflow-y-auto">
                      {newRecipe.ingredients.map((ingredient, index) => {
                        const item = inventoryItems.find(i => i.id === ingredient.inventory_item_id);
                        const grossQty = ingredient.gross_quantity > 0 ? ingredient.gross_quantity : ingredient.quantity;
                        const lineCost = grossQty * (item?.current_cost || 0);
                        const overStock = item && grossQty > item.current_stock;
                        const hasDensityIssue = densityWarnings[index];

                        return (
                          <div key={index} className={`grid grid-cols-12 gap-1 items-center px-2 py-1 border-b last:border-b-0 ${overStock ? 'bg-destructive/5' : hasDensityIssue ? 'bg-warning/5' : ''}`}>
                            <div className="col-span-3">
                              <Select value={ingredient.inventory_item_id} onValueChange={(v) => updateIngredient(index, 'inventory_item_id', v)}>
                                <SelectTrigger className="h-6 text-[11px]">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {inventoryItems.map(itm => (
                                    <SelectItem key={itm.id} value={itm.id}>
                                      {itm.name} ({itm.current_stock} {itm.unit_of_measure})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-1">
                              <Input type="number" step="0.1" min="0.1" className="h-6 text-[11px] px-1"
                                value={ingredient.quantity}
                                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-1">
                              <Input type="number" step="1" min="1" max="100" className="h-6 text-[11px] px-1"
                                value={ingredient.yield_percentage}
                                onChange={(e) => updateIngredient(index, 'yield_percentage', parseFloat(e.target.value) || 100)} />
                            </div>
                            <div className="col-span-1">
                              <Input className="h-6 text-[11px] px-1 bg-muted/50 font-mono" value={grossQty.toFixed(1)} readOnly />
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-0.5">
                                <Select value={ingredient.unit || item?.unit_of_measure || ""} onValueChange={(value) => updateIngredient(index, 'unit', value)}>
                                  <SelectTrigger className="h-6 text-[11px] flex-1">
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {uomUnits.map((unit) => (
                                      <SelectItem key={unit.id} value={unit.unit_abbrev}>{unit.unit_abbrev}</SelectItem>
                                    ))}
                                    {uomUnits.length === 0 && item?.unit_of_measure && (
                                      <SelectItem value={item.unit_of_measure}>{item.unit_of_measure}</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                {hasDensityIssue && <Beaker className="w-3 h-3 text-warning flex-shrink-0" />}
                              </div>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-[11px] font-medium">${lineCost.toFixed(2)}</span>
                              {overStock && <AlertTriangle className="w-3 h-3 text-destructive inline ml-0.5" />}
                            </div>
                            <div className="col-span-1 text-center">
                              <span className="text-[10px] text-muted-foreground">{item ? item.current_stock : '-'}</span>
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => removeIngredient(index)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 4: Costing Summary (inline) */}
                <div className="grid grid-cols-5 gap-2 p-2 rounded-md border bg-muted/20 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Cost</span>
                    <div className="font-semibold">${calculateFormCost().toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost/Serving</span>
                    <div className="font-semibold">${calculateCostPerServing().toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit/Serving</span>
                    <div className={`font-semibold ${calculateProfit() >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${calculateProfit().toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin</span>
                    <div className={`font-bold ${calculateMargin() >= 60 ? 'text-success' : calculateMargin() >= 30 ? 'text-warning' : 'text-destructive'}`}>
                      {calculateMargin().toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Food Cost</span>
                    <div className="font-semibold">
                      {newRecipe.base_price > 0 ? ((calculateCostPerServing() / newRecipe.base_price) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>

                {/* Row 5: Allergens */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Allergens</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {COMMON_ALLERGENS.map(allergen => (
                      <Button key={allergen} type="button"
                        variant={newRecipe.allergens.includes(allergen) ? "default" : "outline"}
                        size="sm" className="h-5 text-[10px] px-1.5 rounded-full"
                        onClick={() => toggleAllergen(allergen)}>
                        {allergen}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Row 6: Instructions */}
                <div className="space-y-1">
                  <Label className="text-xs">Preparation Instructions</Label>
                  <Textarea
                    placeholder="Step-by-step preparation instructions..."
                    value={newRecipe.instructions}
                    onChange={(e) => setNewRecipe(prev => ({ ...prev, instructions: e.target.value }))}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Sticky footer */}
              <div className="flex-shrink-0 border-t pt-2 mt-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {newRecipe.ingredients.length} item(s) · ${calculateFormCost().toFixed(2)} cost · ${newRecipe.base_price.toFixed(2)} price · {calculateMargin().toFixed(0)}% margin
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleCreateRecipe}>Create Recipe</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Recipe Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); setEditingRecipe(null); setEditForm(null); } }}>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-4">
              <DialogHeader className="flex-shrink-0 pb-2">
                <DialogTitle className="text-base">Edit Recipe</DialogTitle>
              </DialogHeader>
              {editForm && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {/* Photo + Row 1: Name, Category, Description */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <Label className="text-xs mb-1 block">Photo</Label>
                      <label className="cursor-pointer block w-[120px] h-[120px] rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors overflow-hidden relative bg-muted/20">
                        {editPhotoPreview ? (
                          <>
                            <img src={editPhotoPreview} alt="Recipe" className="w-full h-full object-cover" />
                            <button type="button" className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5" onClick={(e) => { e.preventDefault(); setEditPhotoFile(null); setEditPhotoPreview(null); }}>
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Camera className="w-6 h-6 mb-1" />
                            <span className="text-[10px]">120 × 120</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e, true)} />
                      </label>
                    </div>
                    <div className="flex-1 grid grid-cols-5 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Name *</Label>
                        <Input className="h-7 text-xs" placeholder="Recipe name" value={editForm.name} onChange={(e) => setEditForm((p: any) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select value={editForm.category} onValueChange={(v) => setEditForm((p: any) => ({ ...p, category: v }))}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input className="h-7 text-xs" placeholder="Brief description for menu display" value={editForm.description} onChange={(e) => setEditForm((p: any) => ({ ...p, description: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Prep (min)</Label>
                      <Input className="h-7 text-xs" type="number" min="0" value={editForm.prep_time} onChange={(e) => setEditForm((p: any) => ({ ...p, prep_time: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cook (min)</Label>
                      <Input className="h-7 text-xs" type="number" min="0" value={editForm.cook_time} onChange={(e) => setEditForm((p: any) => ({ ...p, cook_time: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Servings *</Label>
                      <Input className="h-7 text-xs" type="number" min="1" value={editForm.servings} onChange={(e) => setEditForm((p: any) => ({ ...p, servings: Math.max(1, parseInt(e.target.value) || 1) }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Difficulty</Label>
                      <Select value={editForm.difficulty} onValueChange={(v) => setEditForm((p: any) => ({ ...p, difficulty: v }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Menu Price *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input className="h-7 text-xs pl-6" type="number" step="0.01" min="0" value={editForm.base_price} onChange={(e) => setEditForm((p: any) => ({ ...p, base_price: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Ingredients</span>
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={editAddIngredient}>
                        <Plus className="w-3 h-3 mr-1" />Add
                      </Button>
                    </div>
                    <div className="border rounded-md">
                      <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground px-2 py-1 bg-muted/40 border-b">
                        <div className="col-span-3">Item</div>
                        <div className="col-span-1">Net</div>
                        <div className="col-span-1">Yield%</div>
                        <div className="col-span-1">Gross</div>
                        <div className="col-span-2">Unit</div>
                        <div className="col-span-2 text-right">Cost</div>
                        <div className="col-span-1 text-center">Stk</div>
                        <div className="col-span-1"></div>
                      </div>
                      <div className="max-h-[140px] overflow-y-auto">
                        {editForm.ingredients.map((ingredient: any, index: number) => {
                          const item = inventoryItems.find(i => i.id === ingredient.inventory_item_id);
                          const grossQty = ingredient.gross_quantity > 0 ? ingredient.gross_quantity : ingredient.quantity;
                          const lineCost = grossQty * (item?.current_cost || 0);
                          const overStock = item && grossQty > item.current_stock;
                          const hasDensityIssue = editDensityWarnings[index];
                          return (
                            <div key={index} className={`grid grid-cols-12 gap-1 items-center px-2 py-1 border-b last:border-b-0 ${overStock ? 'bg-destructive/5' : hasDensityIssue ? 'bg-warning/5' : ''}`}>
                              <div className="col-span-3">
                                <Select value={ingredient.inventory_item_id} onValueChange={(v) => editUpdateIngredient(index, 'inventory_item_id', v)}>
                                  <SelectTrigger className="h-6 text-[11px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                                  <SelectContent>
                                    {inventoryItems.map(itm => (
                                      <SelectItem key={itm.id} value={itm.id}>{itm.name} ({itm.current_stock} {itm.unit_of_measure})</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-1">
                                <Input type="number" step="0.1" min="0.1" className="h-6 text-[11px] px-1" value={ingredient.quantity} onChange={(e) => editUpdateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)} />
                              </div>
                              <div className="col-span-1">
                                <Input type="number" step="1" min="1" max="100" className="h-6 text-[11px] px-1" value={ingredient.yield_percentage} onChange={(e) => editUpdateIngredient(index, 'yield_percentage', parseFloat(e.target.value) || 100)} />
                              </div>
                              <div className="col-span-1">
                                <Input className="h-6 text-[11px] px-1 bg-muted/50 font-mono" value={grossQty.toFixed(1)} readOnly />
                              </div>
                              <div className="col-span-2">
                                <div className="flex items-center gap-0.5">
                                  <Select value={ingredient.unit || item?.unit_of_measure || ""} onValueChange={(value) => editUpdateIngredient(index, 'unit', value)}>
                                    <SelectTrigger className="h-6 text-[11px] flex-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                                    <SelectContent>
                                      {uomUnits.map((unit) => (
                                        <SelectItem key={unit.id} value={unit.unit_abbrev}>{unit.unit_abbrev}</SelectItem>
                                      ))}
                                      {uomUnits.length === 0 && item?.unit_of_measure && (
                                        <SelectItem value={item.unit_of_measure}>{item.unit_of_measure}</SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {hasDensityIssue && <Beaker className="w-3 h-3 text-warning flex-shrink-0" />}
                                </div>
                              </div>
                              <div className="col-span-2 text-right">
                                <span className="text-[11px] font-medium">${lineCost.toFixed(2)}</span>
                                {overStock && <AlertTriangle className="w-3 h-3 text-destructive inline ml-0.5" />}
                              </div>
                              <div className="col-span-1 text-center">
                                <span className="text-[10px] text-muted-foreground">{item ? item.current_stock : '-'}</span>
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => editRemoveIngredient(index)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Costing Summary */}
                  <div className="grid grid-cols-5 gap-2 p-2 rounded-md border bg-muted/20 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total Cost</span>
                      <div className="font-semibold">${calculateEditFormCost().toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost/Serving</span>
                      <div className="font-semibold">${calculateEditCostPerServing().toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Profit/Serving</span>
                      <div className={`font-semibold ${calculateEditProfit() >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${calculateEditProfit().toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Margin</span>
                      <div className={`font-bold ${calculateEditMargin() >= 60 ? 'text-success' : calculateEditMargin() >= 30 ? 'text-warning' : 'text-destructive'}`}>
                        {calculateEditMargin().toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Food Cost</span>
                      <div className="font-semibold">
                        {editForm.base_price > 0 ? ((calculateEditCostPerServing() / editForm.base_price) * 100).toFixed(1) : '0.0'}%
                      </div>
                    </div>
                  </div>

                  {/* Allergens */}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Allergens</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {COMMON_ALLERGENS.map(allergen => (
                        <Button key={allergen} type="button"
                          variant={editForm.allergens.includes(allergen) ? "default" : "outline"}
                          size="sm" className="h-5 text-[10px] px-1.5 rounded-full"
                          onClick={() => editToggleAllergen(allergen)}>
                          {allergen}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1">
                    <Label className="text-xs">Preparation Instructions</Label>
                    <Textarea placeholder="Step-by-step preparation instructions..." className="text-xs" rows={2} value={editForm.instructions} onChange={(e) => setEditForm((p: any) => ({ ...p, instructions: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Sticky footer */}
              <div className="flex-shrink-0 border-t pt-2 mt-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {editForm ? `${editForm.ingredients.length} item(s) · $${calculateEditFormCost().toFixed(2)} cost · $${editForm.base_price.toFixed(2)} price · ${calculateEditMargin().toFixed(0)}% margin` : ''}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingRecipe(null); setEditForm(null); }}>Cancel</Button>
                  <Button onClick={handleUpdateRecipe}>Save Changes</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 flex flex-col space-y-3">
        <div className="flex gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="recipes" className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 w-fit">
            <TabsTrigger value="recipes" className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />Recipes
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="flex-1 min-h-0 mt-3">
            <div className="border rounded-lg h-full bg-card">
              <ScrollArea className="h-full">
                <div className="p-3">
                  {filteredRecipes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Recipes Found</h3>
                      <p className="text-sm">Create your first recipe using inventory items</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {filteredRecipes.map((recipe) => {
                        const totalCost = (recipe.ingredients || []).reduce((sum, ing) => {
                          const item = inventoryItems.find(i => i.id === ing.inventory_item_id);
                          const grossQty = ing.gross_quantity || ing.quantity;
                          return sum + (grossQty * (item?.current_cost || 0));
                        }, 0);
                        const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : totalCost;
                        const margin = recipe.base_price > 0 ? ((recipe.base_price - costPerServing) / recipe.base_price) * 100 : 0;
                        const foodCostPct = recipe.base_price > 0 ? (costPerServing / recipe.base_price) * 100 : 0;

                        return (
                          <Card key={recipe.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            {recipe.image_url && (
                              <div className="w-full aspect-square overflow-hidden rounded-t-lg">
                                <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <CardHeader className="p-2">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-xs sm:text-sm leading-tight line-clamp-1 flex-1">{recipe.name}</CardTitle>
                                <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => openEditDialog(recipe)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                              <CardDescription className="text-xs line-clamp-2 hidden sm:block">
                                {recipe.description || recipe.ingredients?.map(ing => {
                                  const item = inventoryItems.find(i => i.id === ing.inventory_item_id);
                                  return item?.name;
                                }).filter(Boolean).join(", ") || "No description"}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-2 pt-0">
                              <div className="flex flex-col gap-1">
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Badge variant="secondary" className="text-xs px-1 py-0">{recipe.category}</Badge>
                                    <Badge variant="outline" className="text-xs px-1 py-0">{recipe.difficulty}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-bold text-sm">${(recipe.base_price || 0).toFixed(2)}</div>
                                      <div className="text-xs text-muted-foreground">Cost: ${costPerServing.toFixed(2)}</div>
                                      <div className="text-xs text-muted-foreground">FC: {foodCostPct.toFixed(0)}%</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground flex items-center">
                                        <Clock className="w-3 h-3 mr-0.5" />{recipe.prep_time + recipe.cook_time}m
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center">
                                        <Users className="w-3 h-3 mr-0.5" />{recipe.servings}
                                      </div>
                                    </div>
                                  </div>
                                  {margin > 0 && (
                                    <div className={`text-xs font-medium ${margin >= 60 ? 'text-emerald-600' : margin >= 30 ? 'text-amber-600' : 'text-destructive'}`}>
                                      {margin.toFixed(0)}% margin
                                    </div>
                                  )}
                                  {recipe.allergens && recipe.allergens.length > 0 && (
                                    <div className="flex flex-wrap gap-0.5 mt-1">
                                      {recipe.allergens.slice(0, 3).map(a => (
                                        <Badge key={a} variant="outline" className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-600">{a}</Badge>
                                      ))}
                                      {recipe.allergens.length > 3 && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">+{recipe.allergens.length - 3}</Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 h-7 text-xs p-0"
                                    onClick={() => handleAddToMenu(recipe)}
                                  >
                                    <Utensils className="w-3 h-3 mr-1" />
                                    Add to Menu
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteRecipe(recipe.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-3">
            <RecipeHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const RecipeHistoryTab = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const businessId = await getBusinessId();
      const { data, error } = await supabase
        .from('recipe_history')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (!error && data) setEntries(data);
    } catch (err) {
      console.error('Error loading recipe history:', err);
    } finally {
      setLoading(false);
    }
  };

  const actionConfig: Record<string, { label: string; color: string }> = {
    created: { label: "Created", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    updated: { label: "Updated", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    deleted: { label: "Deleted", color: "bg-red-500/15 text-red-600 border-red-500/30" },
    added_to_menu: { label: "Added to Menu", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  };

  return (
    <div className="border rounded-lg h-full bg-card">
      <ScrollArea className="h-full">
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading history...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No History Yet</h3>
              <p className="text-sm">Recipe actions will appear here</p>
            </div>
          ) : (
            entries.map((entry: any) => {
              const config = actionConfig[entry.action] || actionConfig.created;
              const date = new Date(entry.created_at);
              return (
                <div key={entry.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{entry.recipe_name}</div>
                    {entry.note && (
                      <div className="text-xs text-muted-foreground truncate">{entry.note}</div>
                    )}
                  </div>
                  <Badge variant="outline" className={config.color}>
                    {config.label}
                  </Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 w-36 text-right justify-end">
                    <Clock className="w-3 h-3" />
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
