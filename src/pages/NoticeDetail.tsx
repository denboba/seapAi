import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Calendar, DollarSign, FileText, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const NoticeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const getRiskLevel = (score: number): "low" | "medium" | "high" => {
    if (score < 30) return "low";
    if (score < 70) return "medium";
    return "high";
  };

  const { data: notice, isLoading } = useQuery({
    queryKey: ["notice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("ca_notice_id", Number(id))
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="container mx-auto max-w-5xl">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Notice Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The procurement notice you're looking for doesn't exist or hasn't been synced yet.
            </p>
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskFactors = notice.risk_factors as string[] || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {notice.contract_title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary">{notice.notice_no}</Badge>
            <RiskBadge level={getRiskLevel(notice.risk_score)} score={notice.risk_score} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-5xl p-4 md:p-8 -mt-4">
        <div className="grid gap-6">
          {/* Main Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contracting Authority</p>
                    <p className="font-medium">{notice.contracting_authority}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Value</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("ro-RO", {
                        style: "currency",
                        currency: "RON",
                        maximumFractionDigits: 0,
                      }).format(notice.estimated_value || notice.ron_contract_value || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Publication Date</p>
                    <p className="font-medium">
                      {new Date(notice.publication_date).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Submission Deadline</p>
                    <p className="font-medium">
                      {new Date(notice.finalization_date).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                </div>
              </div>

              {notice.procedure_type && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Procedure Type</p>
                    <p className="font-medium">{notice.procedure_type}</p>
                  </div>
                </div>
              )}

              {notice.cpv_code && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">CPV Code</p>
                    <p className="font-medium">{notice.cpv_code}</p>
                  </div>
                </div>
              )}

              {notice.short_description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm leading-relaxed">{notice.short_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Analysis Card */}
          {riskFactors.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    The following risk factors have been identified for this procurement:
                  </p>
                  {riskFactors.map((factor, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticeDetail;
