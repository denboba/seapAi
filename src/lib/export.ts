interface ExportNotice {
  noticeNo: string;
  contractTitle: string;
  contractingAuthority: string;
  publicationDate: string;
  finalizationDate: string;
  estimatedValue: number;
  riskScore: number;
  riskFactors: string[];
}

/**
 * Export notices data to CSV format
 */
export function exportToCSV(notices: ExportNotice[], filename = 'procurement-notices.csv') {
  // CSV headers
  const headers = [
    'Notice Number',
    'Contract Title',
    'Contracting Authority',
    'Publication Date',
    'Deadline',
    'Estimated Value (RON)',
    'Risk Score',
    'Risk Factors'
  ];

  // Convert notices to CSV rows
  const rows = notices.map(notice => [
    notice.noticeNo || '',
    `"${(notice.contractTitle || '').replace(/"/g, '""')}"`, // Escape quotes and handle null
    `"${(notice.contractingAuthority || '').replace(/"/g, '""')}"`,
    notice.publicationDate ? new Date(notice.publicationDate).toLocaleDateString('ro-RO') : '',
    notice.finalizationDate ? new Date(notice.finalizationDate).toLocaleDateString('ro-RO') : '',
    (notice.estimatedValue || 0).toFixed(2),
    (notice.riskScore || 0).toString(),
    `"${(notice.riskFactors || []).join('; ').replace(/"/g, '""')}"`
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and trigger download
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
 * Export notices data to JSON format
 */
export function exportToJSON(notices: ExportNotice[], filename = 'procurement-notices.json') {
  const jsonContent = JSON.stringify(notices, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
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
 * Generate a summary report in text format
 */
export function generateTextReport(
  notices: ExportNotice[],
  stats: {
    totalNotices: number;
    highRiskCount: number;
    totalValue: number;
    avgRiskScore: number;
  },
  filename = 'procurement-report.txt'
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ro-RO');
  const timeStr = now.toLocaleTimeString('ro-RO');

  const reportLines = [
    '═══════════════════════════════════════════════════════════',
    '   e-PROCUREMENT RISK ANALYTICS SUITE - SUMMARY REPORT',
    '═══════════════════════════════════════════════════════════',
    '',
    `Generated: ${dateStr} ${timeStr}`,
    '',
    '─────────────────────────────────────────────────────────────',
    'EXECUTIVE SUMMARY',
    '─────────────────────────────────────────────────────────────',
    '',
    `Total Notices Analyzed: ${stats.totalNotices}`,
    `High-Risk Notices (≥70): ${stats.highRiskCount} (${((stats.highRiskCount / stats.totalNotices) * 100).toFixed(1)}%)`,
    `Total Estimated Value: ${new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(stats.totalValue)}`,
    `Average Risk Score: ${stats.avgRiskScore.toFixed(1)}`,
    '',
    '─────────────────────────────────────────────────────────────',
    'HIGH-RISK NOTICES',
    '─────────────────────────────────────────────────────────────',
    ''
  ];

  const highRiskNotices = notices.filter(n => n.riskScore >= 70);
  
  highRiskNotices.forEach((notice, index) => {
    reportLines.push(`${index + 1}. ${notice.noticeNo} - Risk Score: ${notice.riskScore}`);
    reportLines.push(`   Title: ${notice.contractTitle}`);
    reportLines.push(`   Authority: ${notice.contractingAuthority}`);
    reportLines.push(`   Value: ${new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(notice.estimatedValue)}`);
    reportLines.push(`   Risk Factors:`);
    notice.riskFactors.forEach(factor => {
      reportLines.push(`     • ${factor}`);
    });
    reportLines.push('');
  });

  reportLines.push('─────────────────────────────────────────────────────────────');
  reportLines.push('END OF REPORT');
  reportLines.push('═══════════════════════════════════════════════════════════');

  const reportContent = reportLines.join('\n');
  
  const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
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
