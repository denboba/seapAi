import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body. Expected JSON with caNoticeId.',
          contracts: []
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { caNoticeId, saveToDb = false } = requestBody;

    if (!caNoticeId) {
      return new Response(
        JSON.stringify({ 
          error: 'caNoticeId is required',
          contracts: []
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Fetching contract details for notice: ${caNoticeId}`);

    // Fetch contract details from e-licitatie.ro API
    const response = await fetch(
      `https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/GetCANoticeContracts?caNoticeId=${caNoticeId}`,
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
      throw new Error(`Failed to fetch contract details: ${response.status}`);
    }

    const contracts = await response.json();
    
    console.log(`Successfully fetched ${contracts?.length || 0} contracts for notice ${caNoticeId}`);

    // Save to database if requested
    if (saveToDb && contracts && contracts.length > 0) {
      console.log('Saving contract details to database...');
      
      // Get the notice from database
      const { data: notice } = await supabase
        .from('notices')
        .select('id')
        .eq('ca_notice_id', caNoticeId)
        .single();
      
      if (notice) {
        for (const contract of contracts) {
          // Skip contracts without vendor information
          const vendorName = contract.supplierName || contract.winnerName;
          if (!vendorName) {
            console.warn(`Skipping contract without vendor name for notice ${caNoticeId}`);
            continue;
          }
          
          // Upsert vendor
          const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .upsert({
              vendor_name: vendorName,
              fiscal_code: contract.fiscalCode || contract.cui,
              last_seen_at: new Date().toISOString(),
            }, {
              onConflict: 'vendor_name',
              ignoreDuplicates: false
            })
            .select()
            .single();
          
          if (vendorError) {
            console.error(`Error upserting vendor:`, vendorError);
            continue;
          }
          
          if (vendor) {
            // Upsert contract
            await supabase.from('contracts').upsert({
              notice_id: notice.id,
              vendor_id: vendor.id,
              contract_title: contract.contractTitle || contract.title || 'Untitled',
              contract_value: contract.contractValue || contract.totalValue,
              contract_number: contract.contractNo || contract.contractNumber,
              award_date: contract.awardDate || contract.contractDate,
              currency: contract.currency || 'RON',
              raw_data: contract
            }, {
              onConflict: 'notice_id,vendor_id'
            });
            
            // Update vendor statistics
            const { data: vendorStats } = await supabase
              .from('contracts')
              .select('contract_value, notice:notices!inner(risk_score)')
              .eq('vendor_id', vendor.id);
            
            if (vendorStats) {
              const totalContracts = vendorStats.length;
              const totalValue = vendorStats.reduce((sum, c) => sum + (c.contract_value || 0), 0);
              const avgValue = totalContracts > 0 ? totalValue / totalContracts : 0;
              const highRiskCount = vendorStats.filter(c => c.notice?.risk_score >= 70).length;
              
              await supabase
                .from('vendors')
                .update({
                  total_contracts: totalContracts,
                  total_value: totalValue,
                  average_contract_value: avgValue,
                  high_risk_count: highRiskCount
                })
                .eq('id', vendor.id);
            }
          }
        }
        
        console.log(`Saved ${contracts.length} contracts to database`);
      }
    }

    return new Response(JSON.stringify(contracts || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-contract-details function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        contracts: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
