import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Notice {
  caNoticeId: number;
  noticeNo: string;
  contractingAuthorityNameAndFN: string;
  contractTitle?: string;
  shortDescription?: string;
  syspublicationDate: string;
  tenderReceiptDeadline: string;
  estimatedValue?: number;
  ronContractValue?: number;
  noticeEntityType?: string;
  cpvCode?: string;
  publicNoticeContracts?: Array<{
    supplierId: number;
    supplierName: string;
    contractValue: number;
  }>;
}

interface RiskAnalysis {
  score: number;
  factors: string[];
}

// Enhanced risk scoring algorithm
function calculateRiskScore(notice: Notice): RiskAnalysis {
  let score = 0;
  const factors: string[] = [];
  
  // 1. Single bidder indicator (high risk)
  if (notice.publicNoticeContracts?.length === 1) {
    score += 35;
    factors.push('Single bidder - no competition');
  }
  
  // 2. No bidders yet
  if (!notice.publicNoticeContracts || notice.publicNoticeContracts.length === 0) {
    score += 10;
    factors.push('No bidders yet');
  }
  
  // 3. Quick deadline (potential indicator of tailored tender)
  const pubDate = new Date(notice.syspublicationDate);
  const finDate = new Date(notice.tenderReceiptDeadline);
  const daysDiff = (finDate.getTime() - pubDate.getTime()) / (1000 * 3600 * 24);
  
  if (daysDiff < 7) {
    score += 30;
    factors.push(`Very short deadline (${Math.round(daysDiff)} days)`);
  } else if (daysDiff < 14) {
    score += 20;
    factors.push(`Short deadline (${Math.round(daysDiff)} days)`);
  }
  
  // 4. High value contracts (higher scrutiny needed)
  const contractValue = notice.ronContractValue || notice.estimatedValue || 0;
  if (contractValue > 5000000) {
    score += 25;
    factors.push(`Very high value (${(contractValue / 1000000).toFixed(1)}M RON)`);
  } else if (contractValue > 1000000) {
    score += 15;
    factors.push(`High value (${(contractValue / 1000000).toFixed(1)}M RON)`);
  }
  
  // 5. Missing estimated value
  if (!notice.estimatedValue && !notice.ronContractValue) {
    score += 15;
    factors.push('Missing contract value estimate');
  }
  
  // 6. Weekend publication (unusual)
  const dayOfWeek = pubDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    score += 10;
    factors.push('Published on weekend');
  }
  
  return {
    score: Math.min(score, 100),
    factors
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Safely parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.warn('Failed to parse request body, using defaults:', e);
      requestBody = {};
    }
    
    const { page = 1, pagesize = 50, saveToDb = false } = requestBody;

    console.log(`Fetching notices: page=${page}, pagesize=${pagesize}, saveToDb=${saveToDb}`);

    // Fetch from e-licitatie.ro API using https
    const response = await fetch(
      `https://e-licitatie.ro/api-pub/NoticeCommon/GetCANoticeList/?page=${page}&pagesize=${pagesize}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch notices: ${response.status}`);
    }

    const data = await response.json();
    const notices = data.items || [];
    
    console.log(`Successfully fetched ${notices.length} notices`);

    // Save to database if requested
    if (saveToDb && notices.length > 0) {
      console.log('Saving notices to database...');
      
      for (const notice of notices) {
        // Calculate enhanced risk score
        const riskAnalysis = calculateRiskScore(notice);

        // Upsert notice
        const { error: noticeError } = await supabase.from('notices').upsert({
          ca_notice_id: notice.caNoticeId,
          notice_no: notice.noticeNo,
          contracting_authority: notice.contractingAuthorityNameAndFN,
          contract_title: notice.contractTitle || notice.shortDescription || 'Untitled',
          short_description: notice.shortDescription,
          publication_date: notice.syspublicationDate,
          finalization_date: notice.tenderReceiptDeadline,
          estimated_value: notice.estimatedValue,
          ron_contract_value: notice.ronContractValue,
          procedure_type: notice.noticeEntityType,
          cpv_code: notice.cpvCode,
          risk_score: riskAnalysis.score,
          risk_factors: riskAnalysis.factors,
          raw_data: notice
        }, {
          onConflict: 'ca_notice_id',
          ignoreDuplicates: false
        });
        
        if (noticeError) {
          console.error(`Error saving notice ${notice.caNoticeId}:`, {
            message: noticeError.message,
            details: noticeError.details,
            hint: noticeError.hint
          });
          continue;
        }
        
        // Process contracts and vendors
        if (notice.publicNoticeContracts && notice.publicNoticeContracts.length > 0) {
          for (const contract of notice.publicNoticeContracts) {
            // Upsert vendor
            const { data: vendor, error: vendorError } = await supabase
              .from('vendors')
              .upsert({
                vendor_name: contract.supplierName,
                last_seen_at: new Date().toISOString(),
              }, {
                onConflict: 'vendor_name',
                ignoreDuplicates: false
              })
              .select()
              .single();
            
            if (vendorError) {
              console.error(`Error upserting vendor ${contract.supplierName}:`, vendorError);
              continue;
            }
            
            // Get the notice ID
            const { data: noticeData } = await supabase
              .from('notices')
              .select('id')
              .eq('ca_notice_id', notice.caNoticeId)
              .single();
            
            if (noticeData && vendor) {
              // Upsert contract
              await supabase.from('contracts').upsert({
                notice_id: noticeData.id,
                vendor_id: vendor.id,
                contract_title: notice.contractTitle || notice.shortDescription || 'Untitled',
                contract_value: contract.contractValue,
                award_date: notice.syspublicationDate,
                raw_data: contract
              });
              
              // Update vendor statistics
              const { data: vendorStats } = await supabase
                .from('contracts')
                .select('contract_value')
                .eq('vendor_id', vendor.id);
              
              if (vendorStats) {
                const totalContracts = vendorStats.length;
                const totalValue = vendorStats.reduce((sum, c) => sum + (c.contract_value || 0), 0);
                const avgValue = totalContracts > 0 ? totalValue / totalContracts : 0;
                
                await supabase
                  .from('vendors')
                  .update({
                    total_contracts: totalContracts,
                    total_value: totalValue,
                    average_contract_value: avgValue
                  })
                  .eq('id', vendor.id);
              }
            }
          }
        }
      }
      
      console.log(`Saved ${notices.length} notices to database`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-notices function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        items: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
