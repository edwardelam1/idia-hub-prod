import { Card, CardContent } from "@/components/ui/card";
import { Bird } from "lucide-react";
import VultureUploader from "./VultureUploader";
import VultureLedgerTable from "./VultureLedgerTable";

interface Props {
  userRole: string;
}

export default function VultureIngestionPanel({ userRole }: Props) {
  const isAdmin = userRole === "admin" || userRole === "csuite" || userRole === "enterprise";

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          <Bird className="h-8 w-8 mx-auto mb-3 opacity-30" />
          The Vulture is restricted to admin operators.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-xs text-amber-800">
          <strong>Quarantine Airlock.</strong> Files dropped here are immutable, hashed, PII-stripped via the
          Liability Shield, temporally reconstructed, and tagged{" "}
          <code className="bg-amber-100 px-1">ACQUIRED_REHABILITATED</code> before entering staging. Every
          step is logged with <code className="bg-amber-100 px-1">[BEGIN/END: Vulture.*]</code> telemetry.
        </CardContent>
      </Card>
      <VultureUploader />
      <VultureLedgerTable />
    </div>
  );
}