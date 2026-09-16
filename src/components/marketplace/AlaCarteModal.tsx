import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Coins, Plus, Database } from 'lucide-react';
import { priceStreams } from '@/lib/bundle-stream-pricing';
import SynapsePurchaseModal from '@/components/billing/SynapsePurchaseModal';
import { windowLabel } from '@/lib/bundle-freshness';

interface AlaCarteModalProps {
  bundle: any;
  onAddToCart: (items: any[]) => void;
  userCredits: number;
}

const AlaCarteModal = ({ bundle, onAddToCart, userCredits }: AlaCarteModalProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);

  const bundlePrice = Number(bundle?.price ?? 0);
  const dataJson = bundle?.dataJson ?? bundle?.data_json ?? {};

  // Real streams inside this bundle — never fabricated (Golden Rule).
  const streams = useMemo(
    () => priceStreams(dataJson?.activity_mix, bundlePrice),
    [dataJson?.activity_mix, bundlePrice],
  );

  const filtered = streams.filter(
    (s) =>
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.stream.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const chosen = streams.filter((s) => selected.includes(s.stream));
  const totalCost = chosen.reduce((sum, s) => sum + s.price, 0);
  const totalRecords = chosen.reduce((sum, s) => sum + s.recordCount, 0);
  const canAfford = userCredits >= totalCost;
  const allSelected = streams.length > 0 && selected.length === streams.length;

  const toggle = (stream: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, stream] : prev.filter((s) => s !== stream)));
  };

  const handleAddToCart = () => {
    if (chosen.length === 0 || !canAfford) return;
    const orderedStreams = chosen.map((s) => s.stream);
    const bundleId = bundle.bundle_id ?? bundle.id;
    onAddToCart([
      {
        id: `${bundleId}:${[...orderedStreams].sort().join('+')}`,
        bundleId,
        bundleName: bundle.name ?? bundle.title,
        name: allSelected
          ? `${bundle.name ?? bundle.title} — full dataset`
          : `${bundle.name ?? bundle.title} — ${chosen.length} stream${chosen.length === 1 ? '' : 's'}`,
        description: chosen.map((s) => s.label).join(', '),
        streams: orderedStreams,
        recordCount: totalRecords,
        price: totalCost,
      },
    ]);
    setOpen(false);
    setSelected([]);
    setSearchQuery('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-3 w-3" />
            Custom Selection
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Custom Selection — {bundle.name ?? bundle.title}
            </DialogTitle>
          </DialogHeader>

          {streams.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Database className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                This dataset is not split into separate streams, so it is only sold whole.
              </p>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Pick the streams you need from {windowLabel(bundle.windowKey ?? 'all')}. You pay the exact share of the
                records you select.
              </p>

              {streams.length > 4 && (
                <Input
                  placeholder="Search streams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              )}

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {chosen.length} of {streams.length} streams · {totalRecords.toLocaleString()} records
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your balance: {userCredits.toLocaleString()} CR
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end text-lg font-semibold">
                      <Coins className="mr-1 h-4 w-4 text-purple-600" />
                      {totalCost.toLocaleString()}
                    </div>
                    <p className={`text-xs ${canAfford ? 'text-emerald-600' : 'text-destructive'}`}>
                      {canAfford ? 'Covered by your balance' : 'Not enough credits'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(allSelected ? [] : streams.map((s) => s.stream))}
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Full dataset: {bundlePrice.toLocaleString()} CR
                </span>
              </div>

              <div className="grid gap-2">
                {filtered.map((s) => {
                  const isSelected = selected.includes(s.stream);
                  return (
                    <Card key={s.stream} className={isSelected ? 'border-primary bg-primary/5' : ''}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggle(s.stream, checked as boolean)}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-sm truncate">{s.label}</span>
                            <span className="block text-xs text-muted-foreground">
                              {s.recordCount.toLocaleString()} records
                            </span>
                          </span>
                        </label>
                        <div className="text-right shrink-0">
                          <div className="flex items-center font-semibold text-sm">
                            <Coins className="mr-1 h-3 w-3 text-purple-600" />
                            {s.price.toLocaleString()}
                          </div>
                          <p className="text-[10px] text-muted-foreground">CR</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No streams match your search.
                </div>
              )}

              <div className="flex justify-between gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                {!canAfford && chosen.length > 0 ? (
                  <Button
                    onClick={() => {
                      setOpen(false);
                      setTopUpOpen(true);
                    }}
                  >
                    <Coins className="mr-2 h-4 w-4" />
                    Top up credits
                  </Button>
                ) : (
                  <Button onClick={handleAddToCart} disabled={chosen.length === 0}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart ({totalCost.toLocaleString()} CR)
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {topUpOpen && (
        <SynapsePurchaseModal
          trigger={<span />}
          defaultOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) setTopUpOpen(false);
          }}
          insufficientWarning={`You need ${Math.max(0, totalCost - userCredits).toLocaleString()} more CR for this selection.`}
        />
      )}
    </>
  );
};

export default AlaCarteModal;
