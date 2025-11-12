import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { VALUE_RANGE, RISK_THRESHOLDS } from "@/lib/constants";

interface FilterState {
  riskLevel: string;
  minValue: number;
  maxValue: number;
  procedureType: string;
  dateRange: string;
}

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  activeFiltersCount: number;
}

export const Filters = ({ filters, onFilterChange, activeFiltersCount }: FiltersProps) => {
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M RON`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K RON`;
    }
    return `${value} RON`;
  };

  const resetFilters = () => {
    onFilterChange({
      riskLevel: 'all',
      minValue: VALUE_RANGE.MIN,
      maxValue: VALUE_RANGE.MAX,
      procedureType: 'all',
      dateRange: 'all',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer hover:bg-secondary/80"
              onClick={resetFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Clear ({activeFiltersCount})
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Level Filter */}
        <div className="space-y-2">
          <Label htmlFor="risk-level">Risk Level</Label>
          <Select
            value={filters.riskLevel}
            onValueChange={(value) => onFilterChange({ ...filters, riskLevel: value })}
          >
            <SelectTrigger id="risk-level">
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="low">Low Risk (&lt; {RISK_THRESHOLDS.LOW})</SelectItem>
              <SelectItem value="medium">Medium Risk ({RISK_THRESHOLDS.LOW}-{RISK_THRESHOLDS.MEDIUM - 1})</SelectItem>
              <SelectItem value="high">High Risk (≥ {RISK_THRESHOLDS.MEDIUM})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contract Value Range */}
        <div className="space-y-2">
          <Label>Contract Value Range</Label>
          <div className="pt-2">
            <Slider
              min={VALUE_RANGE.MIN}
              max={VALUE_RANGE.MAX}
              step={VALUE_RANGE.STEP}
              value={[filters.minValue, filters.maxValue]}
              onValueChange={(value) => 
                onFilterChange({ 
                  ...filters, 
                  minValue: value[0], 
                  maxValue: value[1] 
                })
              }
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatValue(filters.minValue)}</span>
            <span>{formatValue(filters.maxValue)}</span>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-range">Publication Date</Label>
          <Select
            value={filters.dateRange}
            onValueChange={(value) => onFilterChange({ ...filters, dateRange: value })}
          >
            <SelectTrigger id="date-range">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Procedure Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="procedure-type">Procedure Type</Label>
          <Select
            value={filters.procedureType}
            onValueChange={(value) => onFilterChange({ ...filters, procedureType: value })}
          >
            <SelectTrigger id="procedure-type">
              <SelectValue placeholder="Select procedure" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Procedures</SelectItem>
              <SelectItem value="open">Open Procedure</SelectItem>
              <SelectItem value="restricted">Restricted Procedure</SelectItem>
              <SelectItem value="negotiated">Negotiated Procedure</SelectItem>
              <SelectItem value="competitive">Competitive Dialogue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
