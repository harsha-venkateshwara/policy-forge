// Domain types that mirror the backend Pydantic schema so the API contract is typed
// end to end.

export type Outcome = "pay" | "flag" | "deny" | "review";

export interface Condition {
  field: string;
  operator: string;
  value: number | string | string[];
  source_quote: string;
  confidence: number;
}

export interface RuleException {
  type: string; // "diagnosis" | "modifier"
  value: string;
  note: string;
}

export interface Rule {
  rule_id: string;
  title: string;
  policy_summary: string;
  logic_type: string;
  target_codes: string[];
  conditions: Condition[];
  exceptions: RuleException[];
  outcome: Outcome;
  overall_confidence: number;
  source_policy?: string | null;
}

export interface Policy {
  id: string;
  code: string;
  title: string;
  category: string;
  updated: string;
  status: string;
  text: string;
}

export interface Claim {
  id: string;
  member: string;
  age: number;
  sex: string;
  codes: string[];
  units: number;
  mods: string[];
  dx: string[];
  pos: string;
  dos: string;
  billed: number;
}

export interface RuleEval {
  rule_id: string;
  title: string;
  outcome: Outcome;
}

export interface Determination {
  claim_id: string;
  final: Outcome;
  reason: string;
  citation?: string | null;
  primary_rule_id?: string | null;
  evals: RuleEval[];
}

export interface Resolution {
  claim_id: string;
  outcome: Outcome;
  by: string;
  at: string;
}

export interface Bootstrap {
  policies: Policy[];
  claims: Claim[];
  rules: Record<string, Rule>;
  determinations: Record<string, Determination>;
  resolutions: Record<string, Resolution>;
}

export interface Health {
  status: string;
  compiler_mode: "live" | "heuristic";
  compiler_ready: boolean;
  model: string;
}

export interface RuleChange {
  kind: "added" | "removed" | "changed";
  label: string;
  before?: string | null;
  after?: string | null;
}

export interface PolicyDiffResult {
  summary: string;
  mode: "live" | "heuristic";
  affected_rule_id?: string | null;
  old_rule?: Rule | null;
  new_rule: Rule;
  changes: RuleChange[];
  added_lines: string[];
  removed_lines: string[];
}
