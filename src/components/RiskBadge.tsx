import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level: "low" | "medium" | "high";
  score?: number;
  className?: string;
}

export const RiskBadge = ({ level, score, className }: RiskBadgeProps) => {
  const variants = {
    low: "bg-risk-low/10 text-risk-low border-risk-low/20",
    medium: "bg-risk-medium/10 text-risk-medium border-risk-medium/20",
    high: "bg-risk-high/10 text-risk-high border-risk-high/20",
  };

  const labels = {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
  };

  return (
    <Badge variant="outline" className={cn(variants[level], "font-semibold", className)}>
      {labels[level]}
      {score !== undefined && ` (${score})`}
    </Badge>
  );
};
