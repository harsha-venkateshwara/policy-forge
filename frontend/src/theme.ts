// Design tokens for PolicyForge.
// IBM Plex Sans + Mono, a Cotiviti-family teal/ink palette. The mono face is
// deliberate: the product compiles policy *into code*, so rules and identifiers
// are set in monospace throughout.
import { CheckCircle2, Flag, Ban, AlertTriangle } from "lucide-react";

export const T = {
  ink: "#0C2E33", inkSoft: "#15393F",
  teal: "#0E7C6B", tealDeep: "#0A5C56", tealSoft: "#E3F1EE", tealLine: "#BFE0D8",
  lime: "#8BC53F", limeSoft: "#EDF6DF",
  bg: "#ECF1F1", panel: "#FFFFFF", panel2: "#F5F8F8",
  line: "#DBE5E5", lineSoft: "#E9F0F0",
  text: "#10262B", muted: "#5E7378", faint: "#8AA0A4",
  pass: "#17875A", passBg: "#E6F4EC",
  flag: "#C2453B", flagBg: "#FAE8E6",
  deny: "#962A2A", denyBg: "#F4E1DF",
  review: "#B5820F", reviewBg: "#FAF1D7",
  info: "#1E6F8E",
  shadow: "0 1px 2px rgba(12,46,51,.06), 0 1px 3px rgba(12,46,51,.05)",
  shadowMd: "0 8px 26px rgba(12,46,51,.10)",
  shadowLg: "0 22px 60px rgba(8,30,34,.28)",
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
  sans: "'IBM Plex Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
} as const;

export const OUTCOME: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  pay: { label: "Pay", color: T.pass, bg: T.passBg, Icon: CheckCircle2 },
  flag: { label: "Flag", color: T.flag, bg: T.flagBg, Icon: Flag },
  deny: { label: "Deny", color: T.deny, bg: T.denyBg, Icon: Ban },
  review: { label: "Review", color: T.review, bg: T.reviewBg, Icon: AlertTriangle },
};

export const money = (n: number) =>
  "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const OP_TEXT: Record<string, string> = {
  greater_than: ">", greater_than_or_equal: "≥", less_than: "<",
  less_than_or_equal: "≤", equals: "=", not_equals: "≠",
};
