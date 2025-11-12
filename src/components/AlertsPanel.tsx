import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AlertNotice {
  caNoticeId: number;
  noticeNo: string;
  contractTitle: string;
  contractingAuthority: string;
  riskScore: number;
  riskFactors: string[];
  estimatedValue: number;
  daysUntilDeadline: number;
}

interface AlertsPanelProps {
  highRiskNotices: AlertNotice[];
}

export const AlertsPanel = ({ highRiskNotices }: AlertsPanelProps) => {
  const navigate = useNavigate();

  if (highRiskNotices.length === 0) {
    return null;
  }

  return (
    <section className="py-8 px-4 bg-amber-50 dark:bg-amber-950/20 border-y border-amber-200 dark:border-amber-900">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            High-Risk Alerts
          </h2>
          <Badge variant="destructive" className="ml-2">
            {highRiskNotices.length}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {highRiskNotices.slice(0, 6).map((notice) => (
            <Card 
              key={notice.caNoticeId}
              className="border-amber-200 dark:border-amber-900 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/notice/${notice.caNoticeId}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm line-clamp-2">
                    {notice.contractTitle}
                  </CardTitle>
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {notice.noticeNo}
                  </Badge>
                  <Badge 
                    variant="destructive" 
                    className="text-xs"
                  >
                    Risk: {notice.riskScore}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-muted-foreground text-xs line-clamp-1">
                  {notice.contractingAuthority}
                </div>
                
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    {new Intl.NumberFormat("ro-RO", {
                      style: "currency",
                      currency: "RON",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(notice.estimatedValue)}
                  </span>
                </div>

                {notice.daysUntilDeadline > 0 && notice.daysUntilDeadline <= 7 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {notice.daysUntilDeadline} day{notice.daysUntilDeadline !== 1 ? 's' : ''} left
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  {notice.riskFactors.slice(0, 2).map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span className="line-clamp-1">{factor}</span>
                    </div>
                  ))}
                  {notice.riskFactors.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{notice.riskFactors.length - 2} more factors
                    </span>
                  )}
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/notice/${notice.caNoticeId}`);
                  }}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {highRiskNotices.length > 6 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              +{highRiskNotices.length - 6} more high-risk notices. Use filters to view all.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
