/**
 * Data Converter Utility
 * Converts data.json procurement data to CSV format for AI training
 */

interface NoticeItem {
  caNoticeId: number;
  noticeId: number;
  procedureId: number | null;
  noticeNo: string;
  sysNoticeTypeId: number;
  sysNoticeState: { id: number; text: string; localeKey: string | null; apiActionResult: string | null; };
  sysProcedureState: { id: number; text: string; localeKey: string | null; apiActionResult: string | null; };
  contractingAuthorityNameAndFN: string;
  contractTitle: string;
  sysAcquisitionContractType: { id: number; text: string; localeKey: string | null; apiActionResult: string | null; };
  sysProcedureType: { id: number; text: string; localeKey: string | null; apiActionResult: string | null; };
  sysContractAssigmentType: { id: number; text: string; localeKey: string | null; apiActionResult: string | null; };
  cpvCodeAndName: string;
  ronContractValue: number;
  isOnline: boolean;
  noticeStateDate: string | null;
  minTenderReceiptDeadline: string | null;
  maxTenderReceiptDeadline: string | null;
  errataNo: number;
  versionNo: string | null;
  sysNoticeVersionId: number;
  tenderReceiptDeadlineExport: string | null;
  estimatedValueExport: string;
  highestOfferValue: number;
  lowestOfferValue: number;
  hasSubsequentContracts: boolean;
  isUtility: boolean;
  isPPP: boolean;
  currencyCode: string;
}

interface ProcurementData {
  total: number;
  items: NoticeItem[];
}

/**
 * Flattens nested objects into a single-level structure suitable for CSV
 */
function flattenNoticeItem(item: NoticeItem): Record<string, string | number | boolean> {
  return {
    // Basic identifiers
    caNoticeId: item.caNoticeId,
    noticeId: item.noticeId,
    procedureId: item.procedureId ?? '',
    noticeNo: item.noticeNo,
    
    // Notice state
    sysNoticeTypeId: item.sysNoticeTypeId,
    noticeStateId: item.sysNoticeState.id,
    noticeStateText: item.sysNoticeState.text,
    
    // Procedure state
    procedureStateId: item.sysProcedureState.id,
    procedureStateText: item.sysProcedureState.text,
    
    // Contracting authority
    contractingAuthority: item.contractingAuthorityNameAndFN,
    contractTitle: item.contractTitle,
    
    // Contract types
    acquisitionContractTypeId: item.sysAcquisitionContractType.id,
    acquisitionContractTypeText: item.sysAcquisitionContractType.text,
    procedureTypeId: item.sysProcedureType.id,
    procedureTypeText: item.sysProcedureType.text,
    contractAssigmentTypeId: item.sysContractAssigmentType.id,
    contractAssigmentTypeText: item.sysContractAssigmentType.text,
    
    // CPV and values
    cpvCodeAndName: item.cpvCodeAndName,
    ronContractValue: item.ronContractValue,
    estimatedValueExport: item.estimatedValueExport,
    highestOfferValue: item.highestOfferValue,
    lowestOfferValue: item.lowestOfferValue,
    
    // Dates
    noticeStateDate: item.noticeStateDate ?? '',
    minTenderReceiptDeadline: item.minTenderReceiptDeadline ?? '',
    maxTenderReceiptDeadline: item.maxTenderReceiptDeadline ?? '',
    tenderReceiptDeadlineExport: item.tenderReceiptDeadlineExport ?? '',
    
    // Flags
    isOnline: item.isOnline,
    hasSubsequentContracts: item.hasSubsequentContracts,
    isUtility: item.isUtility,
    isPPP: item.isPPP,
    
    // Other fields
    errataNo: item.errataNo,
    versionNo: item.versionNo ?? '',
    sysNoticeVersionId: item.sysNoticeVersionId,
    currencyCode: item.currencyCode,
  };
}

/**
 * Escapes CSV field values to prevent injection and handle special characters
 */
function escapeCSVField(field: string | number | boolean): string {
  if (typeof field === 'boolean') {
    return field ? 'true' : 'false';
  }
  if (typeof field === 'number') {
    return field.toString();
  }
  const str = String(field ?? '');
  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts procurement data from JSON to CSV format
 */
export function convertJSONToCSV(data: ProcurementData): string {
  if (!data.items || data.items.length === 0) {
    throw new Error('No items found in data');
  }

  // Get headers from the first flattened item
  const firstItem = flattenNoticeItem(data.items[0]);
  const headers = Object.keys(firstItem);
  
  // Create CSV header row
  const headerRow = headers.map(h => escapeCSVField(h)).join(',');
  
  // Convert each item to CSV row
  const dataRows = data.items.map(item => {
    const flattened = flattenNoticeItem(item);
    return headers.map(header => escapeCSVField(flattened[header])).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Downloads CSV data as a file
 */
export function downloadCSV(csvContent: string, filename = 'procurement-data.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Loads and converts data.json to CSV format for AI training
 */
export async function loadAndConvertToCSV(): Promise<string> {
  try {
    const response = await fetch('/data.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch data.json: ${response.statusText}`);
    }
    const data: ProcurementData = await response.json();
    return convertJSONToCSV(data);
  } catch (error) {
    console.error('Error loading and converting data:', error);
    throw error;
  }
}

/**
 * Main function to convert and download the CSV file
 */
export async function exportDataForAITraining() {
  try {
    const csvContent = await loadAndConvertToCSV();
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csvContent, `procurement-training-data-${timestamp}.csv`);
    return { success: true, message: 'CSV file downloaded successfully' };
  } catch (error) {
    console.error('Error exporting data for AI training:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
