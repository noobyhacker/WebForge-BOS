import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FlaskConical,
  Loader2,
} from "lucide-react";
import type { AutomationRule, AutomationEntityType } from "@/types/phase4";

interface DryRunSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AutomationRule;
}

interface EntityOption {
  id: string;
  label: string;
}

interface SimulationResult {
  triggerMatched: boolean;
  triggerReason: string;
  predictedActions: {
    type: string;
    target: string;
    currentValue: string;
    newValue: string;
  }[];
  sideEffects: string[];
  warnings: string[];
}

const ENTITY_TABLE_MAP: Record<AutomationEntityType, string> = {
  client: "clients",
  contact: "contacts",
  deal: "deals",
  account: "accounts",
};

async function fetchEntities(
  entityType: AutomationEntityType
): Promise<EntityOption[]> {
  const table = ENTITY_TABLE_MAP[entityType];

  if (entityType === "client") {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data || []).map((r) => ({ id: r.id, label: r.name }));
  }
  if (entityType === "contact") {
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data || []).map((r) => ({
      id: r.id,
      label: `${r.first_name} ${r.last_name}`.trim(),
    }));
  }
  if (entityType === "deal") {
    const { data } = await supabase
      .from("deals")
      .select("id, name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data || []).map((r) => ({ id: r.id, label: r.name }));
  }
  if (entityType === "account") {
    const { data } = await supabase
      .from("accounts")
      .select("id, name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data || []).map((r) => ({ id: r.id, label: r.name }));
  }
  return [];
}

async function fetchEntityData(
  entityType: AutomationEntityType,
  entityId: string
): Promise<Record<string, any> | null> {
  const table = ENTITY_TABLE_MAP[entityType];
  const { data } = await supabase
    .from(table as any)
    .select("*")
    .eq("id", entityId)
    .single();
  return data;
}

function simulateRule(
  rule: AutomationRule,
  entity: Record<string, any>
): SimulationResult {
  const result: SimulationResult = {
    triggerMatched: false,
    triggerReason: "",
    predictedActions: [],
    sideEffects: [],
    warnings: [],
  };

  // Evaluate trigger
  switch (rule.trigger) {
    case "record_created":
      result.triggerMatched = true;
      result.triggerReason =
        "Trigger is 'Record Created' — always matches an existing record (would fire on creation).";
      break;

    case "field_updated": {
      const field = rule.triggerConfig?.field;
      const expectedValue = rule.triggerConfig?.value;
      if (!field) {
        result.triggerMatched = false;
        result.triggerReason = "No trigger field configured.";
      } else {
        const currentValue = String(entity[field] ?? "");
        if (expectedValue && currentValue === expectedValue) {
          result.triggerMatched = true;
          result.triggerReason = `Field "${field}" currently equals "${expectedValue}" — condition MET.`;
        } else if (expectedValue) {
          result.triggerMatched = false;
          result.triggerReason = `Field "${field}" is "${currentValue}", expected "${expectedValue}" — condition NOT MET.`;
        } else {
          result.triggerMatched = true;
          result.triggerReason = `Field "${field}" exists with value "${currentValue}" — would trigger on any update.`;
        }
      }
      break;
    }

    case "stage_changed": {
      const expectedStage = rule.triggerConfig?.value;
      const currentStage = entity.stage || entity.status || "";
      if (expectedStage && currentStage === expectedStage) {
        result.triggerMatched = true;
        result.triggerReason = `Stage is already "${expectedStage}" — condition MET.`;
      } else if (expectedStage) {
        result.triggerMatched = false;
        result.triggerReason = `Current stage is "${currentStage}", expected "${expectedStage}" — condition NOT MET.`;
      } else {
        result.triggerMatched = true;
        result.triggerReason =
          "No specific stage configured — would trigger on any stage change.";
      }
      break;
    }

    case "score_threshold": {
      const threshold = parseInt(rule.triggerConfig?.value || "0", 10);
      // Score is not stored on the entity directly; note this
      result.triggerMatched = false;
      result.triggerReason = `Score threshold is ${threshold}. Lead score is computed dynamically and not evaluated in dry run. Trigger assumed NOT MET for simulation.`;
      result.warnings.push(
        "Lead score evaluation requires the scoring engine. Dry run cannot compute real-time scores."
      );
      break;
    }

    default:
      result.triggerReason = `Unknown trigger type: ${rule.trigger}`;
  }

  // Predict actions (only if trigger matched)
  if (result.triggerMatched) {
    const actionField = rule.actionConfig?.field || "";
    const actionValue = rule.actionConfig?.value || "";

    switch (rule.action) {
      case "update_field":
        result.predictedActions.push({
          type: "Update Field",
          target: actionField,
          currentValue: String(entity[actionField] ?? "(empty)"),
          newValue: actionValue,
        });
        if (
          actionField === "stage" ||
          actionField === "status" ||
          actionField === "owner_id"
        ) {
          result.warnings.push(
            `This would change "${actionField}" — a potentially disruptive field change.`
          );
        }
        break;

      case "assign_owner":
        result.predictedActions.push({
          type: "Assign Owner",
          target: "owner_id / user_id",
          currentValue: entity.owner_id || entity.user_id || "(none)",
          newValue: actionValue || "Round-robin assignment",
        });
        result.warnings.push("Owner reassignment will change record visibility and permissions.");
        break;

      case "create_task":
        result.predictedActions.push({
          type: "Create Task",
          target: "New activity",
          currentValue: "—",
          newValue: `Subject: "${actionField}", Details: "${actionValue}"`,
        });
        result.sideEffects.push("Would create 1 new activity (task).");
        break;

      case "change_stage":
        result.predictedActions.push({
          type: "Change Stage",
          target: "stage",
          currentValue: entity.stage || "(none)",
          newValue: actionValue,
        });
        result.sideEffects.push("Would log 1 entry in deal stage history.");
        if (actionValue === "closed_lost") {
          result.warnings.push(
            "This would move the deal to Closed Lost — a terminal state."
          );
        }
        break;

      case "send_notification":
        result.predictedActions.push({
          type: "Send Notification",
          target: "notification",
          currentValue: "—",
          newValue: `Title: "${actionField}", Message: "${actionValue}"`,
        });
        result.sideEffects.push("Would create 1 notification for the record owner.");
        break;
    }
  }

  return result;
}

export function DryRunSimulationDialog({
  open,
  onOpenChange,
  rule,
}: DryRunSimulationDialogProps) {
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedId("");
      setSimResult(null);
      fetchEntities(rule.entityType).then(setEntities);
    }
  }, [open, rule.entityType]);

  const runSimulation = async () => {
    if (!selectedId) return;
    setLoading(true);
    setSimResult(null);
    try {
      const entityData = await fetchEntityData(rule.entityType, selectedId);
      if (!entityData) {
        setSimResult({
          triggerMatched: false,
          triggerReason: "Entity not found or not accessible.",
          predictedActions: [],
          sideEffects: [],
          warnings: ["Could not load entity data."],
        });
        return;
      }
      const result = simulateRule(rule, entityData);
      setSimResult(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Dry Run: {rule.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entity picker */}
          <div className="space-y-2">
            <Label>
              Select a {rule.entityType} to test against
            </Label>
            <div className="flex gap-2">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={`Choose a ${rule.entityType}…`} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={runSimulation}
                disabled={!selectedId || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Simulate"
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {simResult && (
            <div className="space-y-4">
              {/* Trigger result */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {simResult.triggerMatched ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          Trigger Evaluation
                        </span>
                        <Badge
                          variant={
                            simResult.triggerMatched ? "default" : "destructive"
                          }
                        >
                          {simResult.triggerMatched ? "CONDITION MET" : "NOT MET"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {simResult.triggerReason}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Predicted Actions */}
              {simResult.predictedActions.length > 0 && (
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <h4 className="font-medium text-foreground text-sm">
                      Predicted Actions
                    </h4>
                    <div className="divide-y divide-border">
                      {simResult.predictedActions.map((a, i) => (
                        <div
                          key={i}
                          className="py-2 grid grid-cols-4 gap-2 text-sm"
                        >
                          <div>
                            <span className="text-muted-foreground text-xs">
                              Action
                            </span>
                            <p className="font-medium">{a.type}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">
                              Target
                            </span>
                            <p>{a.target}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">
                              Current
                            </span>
                            <p className="truncate">{a.currentValue}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">
                              New Value
                            </span>
                            <p className="truncate text-primary font-medium">
                              {a.newValue}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Side Effects */}
              {simResult.sideEffects.length > 0 && (
                <Card>
                  <CardContent className="py-4 space-y-2">
                    <h4 className="font-medium text-foreground text-sm">
                      Side Effects
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {simResult.sideEffects.map((s, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {simResult.warnings.length > 0 && (
                <Card className="border-yellow-500/30">
                  <CardContent className="py-4 space-y-2">
                    <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Warnings
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {simResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* No actions if trigger didn't match */}
              {!simResult.triggerMatched &&
                simResult.predictedActions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Trigger condition was not met — no actions would execute.
                  </p>
                )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
