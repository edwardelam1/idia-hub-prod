
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecipeIngredient {
  id: string;
  inventory_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: string;
  cost_per_serving: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  allergens: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface InventoryItem {
  id: string;
  name: string;
  unit_of_measure: string;
  current_cost: number;
  category: string;
}

interface RecipeFormProps {
  recipe?: Recipe;
  inventoryItems: InventoryItem[];
  onSubmit: (recipe: Recipe | Omit<Recipe, 'id'>) => void;
  onCancel: () => void;
}

export const RecipeFormWithAI = ({ recipe, inventoryItems, onSubmit, onCancel }: RecipeFormProps) => {
  const [formData, setFormData] = useState<Omit<Recipe, 'id'>>({
    name: recipe?.name || "",
    description: recipe?.description || "",
    category: recipe?.category || "Main Course",
    prep_time: recipe?.prep_time || 0,
    cook_time: recipe?.cook_time || 0,
    servings: recipe?.servings || 1,
    difficulty: recipe?.difficulty || "Easy",
    cost_per_serving: recipe?.cost_per_serving || 0,
    ingredients: recipe?.ingredients || [],
    instructions: recipe?.instructions || [""],
    allergens: recipe?.allergens || [],
    nutrition: recipe?.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  });

  const [selectedInventoryItem, setSelectedInventoryItem] = useState("");
  const [ingredientQuantity, setIngredientQuantity] = useState(1);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const { toast } = useToast();

  // Debug logging
  useEffect(() => {
    console.log('RecipeFormWithAI - inventory items:', inventoryItems);
    console.log('RecipeFormWithAI - inventory items count:', inventoryItems?.length || 0);
  }, [inventoryItems]);

  // AI-powered recipe name generation based on ingredients
  const generateRecipeName = () => {
    if (formData.ingredients.length === 0) {
      toast({
        title: "Add Ingredients First",
        description: "Please add some ingredients to generate a recipe name",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingName(true);
    
    setTimeout(() => {
      const primaryIngredients = formData.ingredients.slice(0, 3);
      const cookingMethods = ['Grilled', 'Roasted', 'Sautéed', 'Braised', 'Pan-Seared', 'Baked', 'Fried', 'Steamed'];
      const descriptors = ['Delicious', 'Gourmet', 'Classic', 'Artisan', 'Chef\'s Special', 'Signature', 'Homestyle', 'Fresh'];
      const connectors = ['with', 'and', 'featuring'];
      
      const method = cookingMethods[Math.floor(Math.random() * cookingMethods.length)];
      const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
      const connector = connectors[Math.floor(Math.random() * connectors.length)];
      
      let generatedName = "";
      
      if (primaryIngredients.length >= 3) {
        generatedName = `${descriptor} ${method} ${primaryIngredients[0].name} ${connector} ${primaryIngredients[1].name} and ${primaryIngredients[2].name}`;
      } else if (primaryIngredients.length === 2) {
        generatedName = `${descriptor} ${method} ${primaryIngredients[0].name} ${connector} ${primaryIngredients[1].name}`;
      } else if (primaryIngredients.length === 1) {
        generatedName = `${descriptor} ${method} ${primaryIngredients[0].name}`;
      }
      
      // Clean up the name
      generatedName = generatedName.replace(/\s+/g, ' ').trim();
      
      setFormData(prev => ({ ...prev, name: generatedName }));
      setIsGeneratingName(false);
      
      toast({
        title: "Recipe Name Generated!",
        description: "AI has created a name based on your ingredients",
      });
    }, 1500);
  };

  const handleAddIngredient = () => {
    if (!selectedInventoryItem) {
      toast({
        title: "Select an Ingredient",
        description: "Please select an ingredient from the inventory",
        variant: "destructive"
      });
      return;
    }

    const inventoryItem = inventoryItems.find(item => item.id === selectedInventoryItem);
    if (!inventoryItem) {
      toast({
        title: "Ingredient Not Found",
        description: "Selected ingredient not found in inventory",
        variant: "destructive"
      });
      return;
    }

    const newIngredient: RecipeIngredient = {
      id: Date.now().toString(),
      inventory_item_id: inventoryItem.id,
      name: inventoryItem.name,
      quantity: ingredientQuantity,
      unit: inventoryItem.unit_of_measure,
      cost: (inventoryItem.current_cost || 0) * ingredientQuantity
    };

    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient],
      cost_per_serving: prev.cost_per_serving + (newIngredient.cost / Math.max(prev.servings, 1))
    }));

    setSelectedInventoryItem("");
    setIngredientQuantity(1);

    toast({
      title: "Ingredient Added",
      description: `${inventoryItem.name} has been added to the recipe`,
    });
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    const ingredient = formData.ingredients.find(ing => ing.id === ingredientId);
    if (ingredient) {
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId),
        cost_per_serving: Math.max(0, prev.cost_per_serving - (ingredient.cost / Math.max(prev.servings, 1)))
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Recipe Name Required",
        description: "Please enter a name for your recipe",
        variant: "destructive"
      });
      return;
    }

    if (formData.ingredients.length === 0) {
      toast({
        title: "Ingredients Required",
        description: "Please add at least one ingredient to your recipe",
        variant: "destructive"
      });
      return;
    }

    if (recipe) {
      onSubmit({ ...formData, id: recipe.id });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{recipe ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
        <DialogDescription>
          {recipe ? 'Update your recipe details' : 'Create a recipe using inventory items with AI-powered suggestions'}
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name</Label>
            <div className="flex space-x-2">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter recipe name or generate with AI"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateRecipeName}
                disabled={isGeneratingName || formData.ingredients.length === 0}
                className="flex-shrink-0"
                title={formData.ingredients.length === 0 ? "Add ingredients first" : "Generate AI name"}
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingName ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {isGeneratingName && (
              <p className="text-xs text-muted-foreground">AI is generating a name based on your ingredients...</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Appetizer">Appetizer</SelectItem>
                <SelectItem value="Main Course">Main Course</SelectItem>
                <SelectItem value="Dessert">Dessert</SelectItem>
                <SelectItem value="Beverage">Beverage</SelectItem>
                <SelectItem value="Side Dish">Side Dish</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            placeholder="Describe your recipe..."
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prep_time">Prep Time (min)</Label>
            <Input
              id="prep_time"
              type="number"
              value={formData.prep_time}
              onChange={(e) => setFormData(prev => ({ ...prev, prep_time: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cook_time">Cook Time (min)</Label>
            <Input
              id="cook_time"
              type="number"
              value={formData.cook_time}
              onChange={(e) => setFormData(prev => ({ ...prev, cook_time: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
            <Input
              id="servings"
              type="number"
              value={formData.servings}
              onChange={(e) => setFormData(prev => ({ ...prev, servings: Math.max(1, parseInt(e.target.value) || 1) }))}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ingredients</Label>
          <div className="border rounded p-3 space-y-2">
            <div className="flex gap-2">
              <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select ingredient from inventory" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems && inventoryItems.length > 0 ? (
                    inventoryItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - ${item.current_cost?.toFixed(2)} per {item.unit_of_measure}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-items" disabled>
                      No inventory items available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={ingredientQuantity}
                onChange={(e) => setIngredientQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-20"
                min="0.1"
                step="0.1"
                placeholder="Qty"
              />
              <Button 
                type="button" 
                onClick={handleAddIngredient} 
                disabled={!selectedInventoryItem || selectedInventoryItem === "no-items"}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {inventoryItems && inventoryItems.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">
                No inventory items available. Please add inventory items first.
              </div>
            )}
            
            {formData.ingredients.length > 0 && (
              <div className="space-y-1">
                {formData.ingredients.map(ingredient => (
                  <div key={ingredient.id} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm">
                      {ingredient.name} - {ingredient.quantity} {ingredient.unit} (${ingredient.cost.toFixed(2)})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveIngredient(ingredient.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="text-sm font-medium text-right">
                  Total Cost: ${formData.cost_per_serving.toFixed(2)} per serving
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {recipe ? 'Update Recipe' : 'Create Recipe'}
          </Button>
        </div>
      </form>
    </>
  );
};
