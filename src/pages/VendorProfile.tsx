import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, TrendingUp, FileText, AlertTriangle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { NoticeCard } from "@/components/NoticeCard";

interface ContractWithNotice {
  id: string;
  notice: {
    ca_notice_id: number;
    notice_no: string;
    contracting_authority: string;
    contract_title: string;
    publication_date: string;
    finalization_date: string;
    estimated_value: number | null;
    risk_score: number;
  };
}

const VendorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: vendor, isLoading: loadingVendor } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: contracts, isLoading: loadingContracts } = useQuery({
    queryKey: ["vendor-contracts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, notice:notices(*)")
        .eq("vendor_id", id)
        .order("award_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!vendor,
  });

  if (loadingVendor) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="container mx-auto max-w-7xl">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Vendor Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The vendor profile you're looking for doesn't exist.
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {vendor.vendor_name}
              </h1>
              {vendor.fiscal_code && (
                <Badge variant="secondary">Fiscal Code: {vendor.fiscal_code}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-7xl p-4 md:p-8 -mt-4">
        <div className="grid gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Total Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vendor.total_contracts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("ro-RO", {
                    style: "currency",
                    currency: "RON",
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(vendor.total_value || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vendor.win_rate?.toFixed(1) || 0}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vendor.high_risk_count}</div>
              </CardContent>
            </Card>
          </div>

          {/* Contract History */}
          <Card>
            <CardHeader>
              <CardTitle>Contract History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingContracts ? (
                <div className="space-y-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              ) : contracts && contracts.length > 0 ? (
                <div className="grid gap-4">
                  {contracts.map((contract: ContractWithNotice) => (
                    contract.notice && (
                      <NoticeCard
                        key={contract.id}
                        notice={{
                          caNoticeId: contract.notice.ca_notice_id,
                          noticeNo: contract.notice.notice_no,
                          contractingAuthorityNameAndFN: contract.notice.contracting_authority,
                          contractTitle: contract.notice.contract_title,
                          publicationDate: contract.notice.publication_date,
                          finalizationDate: contract.notice.finalization_date,
                          estimatedValue: contract.notice.estimated_value,
                          riskScore: contract.notice.risk_score,
                        }}
                      />
                    )
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No contract history available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
