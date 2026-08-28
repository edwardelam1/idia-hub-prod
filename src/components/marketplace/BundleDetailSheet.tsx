import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, Database, Users, Clock, Info } from "lucide-react";
import { getFreshness, relativeTime, windowLabel, windowShort } from "@/lib/bundle-freshness";

interface BundleDetailSheetProps {
  bundle: any;
}

const Section = ({ title, items }: { title: string; items?: string[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const BundleDetailSheet = ({ bundle }: BundleDetailSheetProps) => {
  const freshness = getFreshness(bundle.sourceLatestAt);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full min-h-11 text-xs">
          <Info className="mr-2 h-3.5 w-3.5" />
          View full details
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="pr-6 text-base leading-snug break-words">{bundle.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5 pb-10">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{bundle.tier}</Badge>
            <Badge variant="secondary" className="break-all">{bundle.category}</Badge>
            <Badge variant="outline">{windowShort(bundle.windowKey)}</Badge>
            <Badge variant="outline" className={freshness.className}>{freshness.label}</Badge>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground break-words">{bundle.description}</p>

          <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums">{Number(bundle.records ?? 0).toLocaleString()} records</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums">{Number(bundle.contributors ?? 0).toLocaleString()} contributors</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="tabular-nums">{bundle.price} CR</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>v{bundle.version ?? 1}</span>
            </div>
          </div>

          <div className="space-y-1 rounded-lg border p-3 text-xs text-muted-foreground">
            <div>Pull window: <span className="text-foreground">{windowLabel(bundle.windowKey)}</span></div>
            <div>Newest record: <span className="text-foreground">{relativeTime(bundle.sourceLatestAt)}</span></div>
            <div>Snapshot taken: <span className="text-foreground">{relativeTime(bundle.generatedAt ?? bundle.updatedAt)}</span></div>
            {bundle.windowStart && (
              <div>
                Range: <span className="text-foreground">{new Date(bundle.windowStart).toLocaleString()}</span> →{" "}
                <span className="text-foreground">
                  {bundle.windowEnd ? new Date(bundle.windowEnd).toLocaleString() : "now"}
                </span>
              </div>
            )}
          </div>

          <Section title="Key Insights" items={bundle.keyInsights} />
          <Section title="Data Points" items={bundle.dataPoints} />
          <Section title="Features" items={bundle.features} />
          <Section title="Suggested Filters" items={bundle.suggestedFilters} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BundleDetailSheet;
