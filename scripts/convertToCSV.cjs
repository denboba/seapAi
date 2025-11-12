#!/usr/bin/env node
/**
 * Command-line utility to convert data.json to CSV format
 * Usage: node scripts/convertToCSV.js [input-file] [output-file]
 * Example: node scripts/convertToCSV.js public/data.json output/training-data.csv
 */

const fs = require('fs');
const path = require('path');

/**
 * Flattens nested objects into a single-level structure suitable for CSV
 */
function flattenNoticeItem(item) {
  return {
    // Basic identifiers
    caNoticeId: item.caNoticeId,
    noticeId: item.noticeId,
    procedureId: item.procedureId ?? '',
    noticeNo: item.noticeNo,
    
    // Notice state
    sysNoticeTypeId: item.sysNoticeTypeId,
    noticeStateId: item.sysNoticeState?.id ?? '',
    noticeStateText: item.sysNoticeState?.text ?? '',
    
    // Procedure state
    procedureStateId: item.sysProcedureState?.id ?? '',
    procedureStateText: item.sysProcedureState?.text ?? '',
    
    // Contracting authority
    contractingAuthority: item.contractingAuthorityNameAndFN,
    contractTitle: item.contractTitle,
    
    // Contract types
    acquisitionContractTypeId: item.sysAcquisitionContractType?.id ?? '',
    acquisitionContractTypeText: item.sysAcquisitionContractType?.text ?? '',
    procedureTypeId: item.sysProcedureType?.id ?? '',
    procedureTypeText: item.sysProcedureType?.text ?? '',
    contractAssigmentTypeId: item.sysContractAssigmentType?.id ?? '',
    contractAssigmentTypeText: item.sysContractAssigmentType?.text ?? '',
    
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
function escapeCSVField(field) {
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
function convertJSONToCSV(data) {
  if (!data.items || data.items.length === 0) {
    throw new Error('No items found in data');
  }

  console.log(`Processing ${data.items.length} procurement notices...`);

  // Get headers from the first flattened item
  const firstItem = flattenNoticeItem(data.items[0]);
  const headers = Object.keys(firstItem);
  
  console.log(`CSV will have ${headers.length} columns`);
  
  // Create CSV header row
  const headerRow = headers.map(h => escapeCSVField(h)).join(',');
  
  // Convert each item to CSV row
  const dataRows = data.items.map((item, index) => {
    if ((index + 1) % 500 === 0) {
      console.log(`Processed ${index + 1} / ${data.items.length} records...`);
    }
    const flattened = flattenNoticeItem(item);
    return headers.map(header => escapeCSVField(flattened[header])).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0] || 'public/data.json';
  const outputFile = args[1] || 'output/procurement-training-data.csv';
  
  console.log('='.repeat(60));
  console.log('Procurement Data JSON to CSV Converter');
  console.log('='.repeat(60));
  console.log(`Input file:  ${inputFile}`);
  console.log(`Output file: ${outputFile}`);
  console.log('='.repeat(60));
  
  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file '${inputFile}' not found`);
    process.exit(1);
  }
  
  try {
    // Read and parse JSON file
    console.log('Reading input file...');
    const jsonData = fs.readFileSync(inputFile, 'utf8');
    const data = JSON.parse(jsonData);
    
    console.log(`Total records in JSON: ${data.total || 'unknown'}`);
    
    // Convert to CSV
    console.log('Converting to CSV format...');
    const csvContent = convertJSONToCSV(data);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write CSV file
    console.log('Writing CSV file...');
    fs.writeFileSync(outputFile, csvContent, 'utf8');
    
    const stats = fs.statSync(outputFile);
    console.log('='.repeat(60));
    console.log('✓ Conversion completed successfully!');
    console.log(`✓ CSV file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✓ Records written: ${data.items.length}`);
    console.log('='.repeat(60));
    console.log('\nThe CSV file is ready for AI training!');
    
  } catch (error) {
    console.error('Error during conversion:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { convertJSONToCSV, flattenNoticeItem, escapeCSVField };
