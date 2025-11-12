import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "./RiskBadge";
import { Building2, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoticeCardProps {
  notice: {
    caNoticeId: number;
    noticeNo: string;
    contractingAuthorityNameAndFN: string;
    contractTitle: string;
    publicationDate: string;
    finalizationDate: string;
    estimatedValue?: number;
    riskScore: number;
  };
}

export const NoticeCard = ({ notice }: NoticeCardProps) => {
  const navigate = useNavigate();
  
  const getRiskLevel = (score: number): "low" | "medium" | "high" => {
    if (score < 30) return "low";
    if (score < 70) return "medium";
    return "high";
  };
  
  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
      onClick={() => navigate(`/notice/${notice.caNoticeId}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {notice.contractTitle}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{notice.noticeNo}</Badge>
              <RiskBadge level={getRiskLevel(notice.riskScore)} score={notice.riskScore} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="line-clamp-2">{notice.contractingAuthorityNameAndFN}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(notice.publicationDate).toLocaleDateString("ro-RO")}</span>
          </div>
          
          <div className="flex items-center gap-2 font-semibold">
            <DollarSign className="h-4 w-4" />
            <span>
              {new Intl.NumberFormat("ro-RO", {
                style: "currency",
                currency: "RON",
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(notice.estimatedValue || 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
