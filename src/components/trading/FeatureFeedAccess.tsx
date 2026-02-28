import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Lock, Zap, TrendingUp, Activity, Shield, Download, PlayCircle } from "lucide-react";
import { DELTSimulationModal } from "./DELTSimulationModal";

export const FeatureFeedAccess = () => {
  const [selectedFeed, setSelectedFeed] = useState<{ id: string; name: string } | null>(null);
  const [showDELTModal, setShowDELTModal] = useState(false);
  const featureFeeds = [
    {
      id: "market-data-feed",
      name: "Market Data Features",
      description: "Real-time aggregated market signals optimized for LLM consumption",
      features: [
        "Payment velocity metrics",
        "Transaction volume indicators",
        "Market sentiment scores",
        "Liquidity depth analysis"
      ],
      tier: "Professional",
      latency: "< 100ms",
      updateFrequency: "Real-time (< 1s)",
      credits: 5,
      status: "active"
    },
    {
      id: "health-analytics-feed",
      name: "Health Analytics Features",
      description: "Anonymized health data aggregations with differential privacy",
      features: [
        "Population health trends",
        "Activity pattern correlations",
        "Biometric aggregations",
        "Sleep quality indicators"
      ],
      tier: "Professional",
      latency: "< 100ms",
      updateFrequency: "15-minute intervals",
      credits: 8,
      status: "active"
    },
    {
      id: "ecp-reports-feed",
      name: "ECP Reports (Experiential)",
      description: "Angelic XR + transaction fusion data with blockchain provenance",
      features: [
        "Conversion attribution",
        "Engagement metrics",
        "Experience quality scores",
        "Transaction correlation"
      ],
      tier: "Enterprise",
      latency: "< 100ms",
      updateFrequency: "5-minute intervals",
      credits: 12,
      status: "enterprise-only"
    },
    {
      id: "trust-score-feed",
      name: "IDIA Trust Score™",
      description: "Proprietary trust scoring algorithm (LIF-L-7.1.4)",
      features: [
        "User trust metrics",
        "Behavioral authenticity",
        "Data quality indicators",
        "Fraud risk assessment"
      ],
      tier: "Enterprise",
      latency: "< 150ms",
      updateFrequency: "Real-time (< 5s)",
      credits: 15,
      status: "coming-soon"
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Feature Feed Access
          </CardTitle>
          <CardDescription>
            High-performance data feeds optimized for quantitative analysis and algorithmic trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {featureFeeds.map((feed) => (
              <div key={feed.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      {feed.name}
                      {feed.status === "active" && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Active
                        </Badge>
                      )}
                      {feed.status === "enterprise-only" && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Enterprise Only
                        </Badge>
                      )}
                      {feed.status === "coming-soon" && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          Coming Soon
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">{feed.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">Available Features:</div>
                  <ul className="grid grid-cols-2 gap-2">
                    {feed.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="text-primary">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {feed.latency} latency
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    {feed.updateFrequency}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    OAuth 2.0 + TLS 1.3+
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {feed.credits} credits/query
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={
                      feed.tier === "Enterprise"
                        ? "bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs"
                        : "bg-primary/10 text-primary border-primary/20 text-xs"
                    }
                  >
                    {feed.tier}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    disabled={feed.status !== "active"}
                  >
                    <Download className="h-4 w-4" />
                    View Sample Data
                  </Button>
                  <Button 
                    size="sm" 
                    className="gap-2"
                    disabled={feed.status !== "active"}
                    onClick={() => {
                      setSelectedFeed({ id: feed.id, name: feed.name });
                      setShowDELTModal(true);
                    }}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Run Simulation
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Governance & Privacy</CardTitle>
          <CardDescription>
            All feature feeds comply with GDPR, CCPA, and India Data Localization requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Differential Privacy Protection</h4>
                <p className="text-sm text-muted-foreground">
                  All queries are processed with differential privacy algorithms to prevent re-identification (DAC-2.1.6)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Pseudonymization Standard</h4>
                <p className="text-sm text-muted-foreground">
                  All user data is irreversibly hashed using SHA-256 with salt before processing (DAC-D-2.6)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Blockchain Provenance</h4>
                <p className="text-sm text-muted-foreground">
                  Every data point includes DigiRAMP Anchoring ID for immutable provenance verification (API-3.4)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Real-time Streaming</h4>
                <p className="text-sm text-muted-foreground">
                  Kafka/Kinesis infrastructure ensures sub-100ms latency for competitive alpha generation (DAT-6.1.4)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Support</CardTitle>
          <CardDescription>
            Connect feature feeds directly to your quantitative models and trading systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Direct LLM Integration</h4>
              <p className="text-xs text-muted-foreground">
                Pre-processed features optimized for GPT-4, Claude, and custom LLM systems
              </p>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Algorithmic Trading</h4>
              <p className="text-xs text-muted-foreground">
                Ultra-low latency endpoints for high-frequency trading strategies
              </p>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Risk Modeling</h4>
              <p className="text-xs text-muted-foreground">
                Historical and real-time data for quantitative risk assessment
              </p>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Backtesting</h4>
              <p className="text-xs text-muted-foreground">
                Access historical feature feeds for strategy development and validation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liability Shield Simulation Modal */}
      <DELTSimulationModal
        open={showDELTModal}
        onOpenChange={setShowDELTModal}
        feedName={selectedFeed?.name || ""}
        feedId={selectedFeed?.id || ""}
      />
    </div>
  );
};
