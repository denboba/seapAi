import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { NoticeCard } from "@/components/NoticeCard";
import { DashboardCharts } from "@/components/DashboardCharts";
import { Filters } from "@/components/Filters";
import { AlertsPanel } from "@/components/AlertsPanel";
import { Shield, TrendingUp, FileText, AlertTriangle, Search, RefreshCw, SlidersHorizontal, Download, FileText as FileTextIcon, FileJson } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToJSON, generateTextReport } from "@/lib/export";
import { RISK_THRESHOLDS, VALUE_RANGE } from "@/lib/constants";

interface DbNotice {
  ca_notice_id: number;
  notice_no: string;
  contracting_authority: string;
  contract_title: string;
  publication_date: string;
  finalization_date: string;
  estimated_value: number | null;
  ron_contract_value: number | null;
  risk_score: number;
  risk_factors: string[] | null;
}

interface EnrichedNotice {
  caNoticeId: number;
  noticeNo: string;
  contractingAuthorityNameAndFN: string;
  contractTitle: string;
  publicationDate: string;
  finalizationDate: string;
  estimatedValue: number;
  riskScore: number;
}

interface FilterState {
  riskLevel: string;
  minValue: number;
  maxValue: number;
  procedureType: string;
  dateRange: string;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    riskLevel: 'all',
    minValue: VALUE_RANGE.MIN,
    maxValue: VALUE_RANGE.MAX,
    procedureType: 'all',
    dateRange: 'all',
  });

  // Fetch notices from database
  const { data: notices, isLoading, refetch } = useQuery<DbNotice[]>({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("publication_date", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  const syncNotices = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-notices", {
        body: { page: 1, pagesize: 50, saveToDb: true },
      });
      
      if (error) {
        console.error("Sync error details:", error);
        throw new Error(error.message || "Failed to sync notices");
      }
      
      // Check if the response contains an error
      if (data && typeof data === 'object' && 'error' in data) {
        console.error("API returned error:", data.error);
        throw new Error(data.error as string || "API returned an error");
      }
      
      toast.success("Successfully synced latest procurement notices!");
      refetch();
    } catch (error) {
      console.error("Sync error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sync notices. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'json' | 'report') => {
    if (!notices || notices.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredNotices.map(n => {
      const dbNotice = notices.find(notice => notice.ca_notice_id === n.caNoticeId);
      return {
        noticeNo: n.noticeNo,
        contractTitle: n.contractTitle,
        contractingAuthority: n.contractingAuthorityNameAndFN,
        publicationDate: n.publicationDate,
        finalizationDate: n.finalizationDate,
        estimatedValue: n.estimatedValue,
        riskScore: n.riskScore,
        riskFactors: dbNotice?.risk_factors || []
      };
    });

    const timestamp = new Date().toISOString().split('T')[0];
    
    try {
      switch (format) {
        case 'csv':
          exportToCSV(exportData, `procurement-notices-${timestamp}.csv`);
          toast.success(`Exported ${exportData.length} notices to CSV`);
          break;
        case 'json':
          exportToJSON(exportData, `procurement-notices-${timestamp}.json`);
          toast.success(`Exported ${exportData.length} notices to JSON`);
          break;
        case 'report':
          generateTextReport(
            exportData,
            {
              totalNotices: enrichedNotices.length,
              highRiskCount,
              totalValue,
              avgRiskScore: enrichedNotices.length > 0 
                ? Math.round(enrichedNotices.reduce((sum, n) => sum + n.riskScore, 0) / enrichedNotices.length)
                : 0
            },
            `procurement-report-${timestamp}.txt`
          );
          toast.success('Generated summary report');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const enrichedNotices: EnrichedNotice[] = notices?.map((notice: DbNotice) => ({
    caNoticeId: notice.ca_notice_id,
    noticeNo: notice.notice_no,
    contractingAuthorityNameAndFN: notice.contracting_authority,
    contractTitle: notice.contract_title,
    publicationDate: notice.publication_date,
    finalizationDate: notice.finalization_date,
    estimatedValue: notice.estimated_value || notice.ron_contract_value || 0,
    riskScore: notice.risk_score,
  })) || [];

  // Apply filters
  const applyFilters = (notices: EnrichedNotice[]): EnrichedNotice[] => {
    return notices.filter(notice => {
      // Risk level filter
      if (filters.riskLevel !== 'all') {
        if (filters.riskLevel === 'low' && notice.riskScore >= RISK_THRESHOLDS.LOW) return false;
        if (filters.riskLevel === 'medium' && (notice.riskScore < RISK_THRESHOLDS.LOW || notice.riskScore >= RISK_THRESHOLDS.MEDIUM)) return false;
        if (filters.riskLevel === 'high' && notice.riskScore < RISK_THRESHOLDS.MEDIUM) return false;
      }

      // Value range filter - only apply if value is not 0 (which indicates missing data)
      if (notice.estimatedValue > 0) {
        if (notice.estimatedValue < filters.minValue || notice.estimatedValue > filters.maxValue) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const publicationDate = new Date(notice.publicationDate);
        const now = new Date();
        const diffDays = (now.getTime() - publicationDate.getTime()) / (1000 * 3600 * 24);
        
        if (filters.dateRange === 'today' && diffDays > 1) return false;
        if (filters.dateRange === 'week' && diffDays > 7) return false;
        if (filters.dateRange === 'month' && diffDays > 30) return false;
        if (filters.dateRange === 'quarter' && diffDays > 90) return false;
        if (filters.dateRange === 'year' && diffDays > 365) return false;
      }

      return true;
    });
  };

  const filteredByFilters = applyFilters(enrichedNotices);

  const filteredNotices = filteredByFilters.filter((notice: EnrichedNotice) =>
    notice.contractTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notice.contractingAuthorityNameAndFN.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count active filters
  const activeFiltersCount = 
    (filters.riskLevel !== 'all' ? 1 : 0) +
    (filters.minValue !== VALUE_RANGE.MIN || filters.maxValue !== VALUE_RANGE.MAX ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.procedureType !== 'all' ? 1 : 0);

  const highRiskCount = enrichedNotices.filter((n: EnrichedNotice) => n.riskScore >= RISK_THRESHOLDS.MEDIUM).length;
  const totalValue = enrichedNotices.reduce((sum: number, n: EnrichedNotice) => sum + (n.estimatedValue || 0), 0);

  // Prepare high-risk alerts
  const highRiskAlerts = notices
    ?.filter(n => n.risk_score >= RISK_THRESHOLDS.MEDIUM)
    .slice(0, 10)
    .map(n => {
      const finalizationDate = new Date(n.finalization_date);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((finalizationDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      return {
        caNoticeId: n.ca_notice_id,
        noticeNo: n.notice_no,
        contractTitle: n.contract_title,
        contractingAuthority: n.contracting_authority,
        riskScore: n.risk_score,
        riskFactors: n.risk_factors || [],
        estimatedValue: n.estimated_value || n.ron_contract_value || 0,
        daysUntilDeadline,
      };
    }) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary py-20 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDE4ek0zNiAyNHYySDI0di0yaDE4eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Shield className="h-5 w-5 text-white" />
              <span className="text-white font-medium">e-Procurement Risk Analytics</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Monitor Public Procurement
              <br />
              <span className="text-white/90">Detect Risks Early</span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Automated risk analysis of Romanian public procurement from SEAP/e-licitatie. 
              Flag irregularities, improve competition, increase transparency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg"
                onClick={syncNotices}
                disabled={syncing}
              >
                <RefreshCw className={`mr-2 h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Latest Data'}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => document.getElementById('notices-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <FileText className="mr-2 h-5 w-5" />
                Browse Notices
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 -mt-8 relative z-20">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Contracts"
              value={enrichedNotices.length}
              icon={FileText}
              trend={{ value: 12, isPositive: true }}
            />
            <StatCard
              title="High Risk Notices"
              value={highRiskCount}
              icon={AlertTriangle}
              trend={{ value: 8, isPositive: false }}
            />
            <StatCard
              title="Total Value"
              value={new Intl.NumberFormat("ro-RO", {
                style: "currency",
                currency: "RON",
                maximumFractionDigits: 0,
                notation: "compact",
              }).format(totalValue)}
              icon={TrendingUp}
              trend={{ value: 15, isPositive: true }}
            />
            <StatCard
              title="Average Risk Score"
              value={enrichedNotices.length > 0 
                ? Math.round(enrichedNotices.reduce((sum: number, n: EnrichedNotice) => sum + n.riskScore, 0) / enrichedNotices.length)
                : 0}
              icon={Shield}
            />
          </div>
        </div>
      </section>

      {/* High-Risk Alerts Section */}
      <AlertsPanel highRiskNotices={highRiskAlerts} />

      {/* Charts Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold mb-8">Analytics Overview</h2>
          <DashboardCharts />
        </div>
      </section>

      {/* Recent Notices Section */}
      <section id="notices-section" className="py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold">Recent Procurement Notices</h2>
              <p className="text-muted-foreground mt-2">
                {filteredNotices.length} of {enrichedNotices.length} notices
                {activeFiltersCount > 0 && ` • ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active`}
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Export Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('report')}>
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    Generate Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Filters Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Notices</SheetTitle>
                    <SheetDescription>
                      Refine your search with advanced filters
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <Filters
                      filters={filters}
                      onFilterChange={setFilters}
                      activeFiltersCount={activeFiltersCount}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading procurement data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredNotices.map((notice: EnrichedNotice) => (
                <NoticeCard key={notice.caNoticeId} notice={notice} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4 mt-12">
        <div className="container mx-auto max-w-7xl text-center text-muted-foreground">
          <p>© 2025 e-Procurement Risk Analytics Suite. Data source: e-licitatie.ro</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
