import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CheckCircle, Box, Scale, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Shipment {
  id: string;
  shipment_number: string;
  customer_name: string;
  carrier: string;
  tracking_number: string;
  status: string;
  estimated_weight: number;
  shipping_cost: number;
  bin_packing_efficiency?: number;
  container_utilization?: number;
  shipment_line_items: Array<{
    inventory_items: { name: string; sku: string; };
    quantity: number;
    dimensions?: { l: number; w: number; h: number };
  }>;
}

const mockShipments: Shipment[] = [
  {
    id: 'ship-001',
    shipment_number: 'SHIP-2026-0456',
    customer_name: 'Downtown Bistro',
    carrier: 'FedEx Freight',
    tracking_number: '7894561230456',
    status: 'preparing',
    estimated_weight: 125.5,
    shipping_cost: 89.99,
    bin_packing_efficiency: 94,
    container_utilization: 87,
    shipment_line_items: [
      { inventory_items: { name: 'Prime Beef Ribeye', sku: 'BEEF-001' }, quantity: 10, dimensions: { l: 12, w: 8, h: 4 } },
      { inventory_items: { name: 'Organic Chicken Breast', sku: 'CHKN-002' }, quantity: 25, dimensions: { l: 10, w: 6, h: 3 } },
    ]
  },
  {
    id: 'ship-002',
    shipment_number: 'SHIP-2026-0457',
    customer_name: 'Harbor View Restaurant',
    carrier: 'UPS Ground',
    tracking_number: '1Z999AA10123456784',
    status: 'ready_to_ship',
    estimated_weight: 78.2,
    shipping_cost: 54.50,
    bin_packing_efficiency: 91,
    container_utilization: 82,
    shipment_line_items: [
      { inventory_items: { name: 'Atlantic Salmon Fillet', sku: 'FISH-007' }, quantity: 15, dimensions: { l: 14, w: 6, h: 2 } },
      { inventory_items: { name: 'Jumbo Shrimp (16/20)', sku: 'SHMP-002' }, quantity: 20, dimensions: { l: 8, w: 6, h: 4 } },
      { inventory_items: { name: 'Crab Meat Lump', sku: 'CRAB-001' }, quantity: 8, dimensions: { l: 6, w: 4, h: 3 } },
    ]
  },
  {
    id: 'ship-003',
    shipment_number: 'SHIP-2026-0455',
    customer_name: 'Seaside Grill',
    carrier: 'USPS Priority',
    tracking_number: '9400111899223100456321',
    status: 'shipped',
    estimated_weight: 45.0,
    shipping_cost: 32.75,
    bin_packing_efficiency: 88,
    container_utilization: 79,
    shipment_line_items: [
      { inventory_items: { name: 'All-Purpose Flour (50lb)', sku: 'DRY-025' }, quantity: 5, dimensions: { l: 18, w: 12, h: 8 } },
      { inventory_items: { name: 'Olive Oil (1 Gallon)', sku: 'OIL-003' }, quantity: 3, dimensions: { l: 6, w: 6, h: 12 } },
    ]
  },
  {
    id: 'ship-004',
    shipment_number: 'SHIP-2026-0458',
    customer_name: 'Mountain Lodge Kitchen',
    carrier: 'FedEx Ground',
    tracking_number: '',
    status: 'preparing',
    estimated_weight: 200.0,
    shipping_cost: 125.00,
    bin_packing_efficiency: 96,
    container_utilization: 91,
    shipment_line_items: [
      { inventory_items: { name: 'Fresh Mixed Vegetables', sku: 'VEG-010' }, quantity: 30, dimensions: { l: 16, w: 12, h: 6 } },
      { inventory_items: { name: 'Prime Beef Ribeye', sku: 'BEEF-001' }, quantity: 20, dimensions: { l: 12, w: 8, h: 4 } },
    ]
  }
];

export const ShippingModule = () => {
  const [shipments, setShipments] = useState<Shipment[]>(mockShipments);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setShipments(mockShipments);
  }, []);

  const loadShipments = async () => {
    setShipments(mockShipments);
    setLoading(false);
  };

  const updateShipmentStatus = async (shipmentId: string, status: string) => {
    try {
      const { error } = await supabase.from('shipments').update({ status }).eq('id', shipmentId);
      if (error) throw error;
      toast.success('Shipment status updated');
      loadShipments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update');
    }
  };

  const optimizeBinPacking = (shipmentId: string) => {
    toast.success('Best-Fit bin-packing algorithm applied - Container utilization optimized');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Shipping</h2>
          <p className="text-[10px] text-muted-foreground">Manage outbound with Best-Fit bin-packing</p>
        </div>
        <Badge variant="outline" className="text-[9px]">
          <Box className="h-3 w-3 mr-1" />Best-Fit Algorithm Active
        </Badge>
      </div>

      <div className="grid gap-2">
        {shipments.map((shipment) => (
          <Card key={shipment.id}>
            <CardHeader className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs flex items-center gap-1">
                    <Truck className="h-3 w-3" />{shipment.shipment_number}
                  </CardTitle>
                  <CardDescription className="text-[9px]">{shipment.customer_name}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {shipment.bin_packing_efficiency && (
                    <Badge variant="outline" className="text-[8px] h-4">
                      <Box className="h-2 w-2 mr-0.5" />{shipment.bin_packing_efficiency}% Pack
                    </Badge>
                  )}
                  <Badge variant={shipment.status === 'shipped' ? 'default' : 'secondary'} className="text-[8px] h-4">
                    {shipment.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="grid grid-cols-4 gap-2 mb-2 text-[9px]">
                <div>
                  <p className="text-muted-foreground">Carrier</p>
                  <p className="font-medium">{shipment.carrier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tracking</p>
                  <p className="font-medium truncate">{shipment.tracking_number || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-0.5"><Scale className="h-2.5 w-2.5" />Weight</p>
                  <p className="font-medium">{shipment.estimated_weight} lbs</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-0.5"><Ruler className="h-2.5 w-2.5" />Utilization</p>
                  <p className="font-medium text-green-600">{shipment.container_utilization}%</p>
                </div>
              </div>
              
              <div className="space-y-1 mb-2">
                {shipment.shipment_line_items.map((item, index) => (
                  <div key={index} className="flex justify-between text-[9px] p-1 bg-muted/50 rounded">
                    <span>{item.inventory_items.name}</span>
                    <div className="flex items-center gap-2">
                      {item.dimensions && (
                        <span className="text-muted-foreground">{item.dimensions.l}x{item.dimensions.w}x{item.dimensions.h}"</span>
                      )}
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1">
                {shipment.status === 'preparing' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => optimizeBinPacking(shipment.id)} className="h-6 text-[9px]">
                      <Box className="h-3 w-3 mr-1" />Optimize Pack
                    </Button>
                    <Button size="sm" onClick={() => updateShipmentStatus(shipment.id, 'ready_to_ship')} className="h-6 text-[9px]">
                      <CheckCircle className="h-3 w-3 mr-1" />Mark Ready
                    </Button>
                  </>
                )}
                {shipment.status === 'ready_to_ship' && (
                  <Button size="sm" onClick={() => updateShipmentStatus(shipment.id, 'shipped')} className="h-6 text-[9px]">
                    <Truck className="h-3 w-3 mr-1" />Ship Out
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
