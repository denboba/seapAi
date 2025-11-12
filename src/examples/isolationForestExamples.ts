/**
 * Example: Using Isolation Forest for Anomaly Detection
 * 
 * This example demonstrates how to use the Isolation Forest module
 * to detect anomalies in procurement data.
 */

import { 
  IsolationForest, 
  trainAndDetectAnomalies,
  extractProcurementFeatures,
  calculateAnomalyRiskScore
} from '@/lib/isolationForest';

// Example procurement data
const sampleProcurementData = [
  {
    caNoticeId: 100001,
    noticeId: 200001,
    noticeNo: "CAN001",
    contractTitle: "Normal Supply Contract",
    contractingAuthorityNameAndFN: "City Hall",
    ronContractValue: 50000,
    maxTenderReceiptDeadline: "2025-12-01T10:00:00Z",
    noticeStateDate: "2025-11-15T10:00:00Z",
    sysProcedureType: { id: 1, text: "Open tender" },
    sysAcquisitionContractType: { id: 1, text: "Supply" },
    isOnline: true,
    highestOfferValue: 52000,
    lowestOfferValue: 48000,
  },
  {
    caNoticeId: 100002,
    noticeId: 200002,
    noticeNo: "CAN002",
    contractTitle: "Normal Works Contract",
    contractingAuthorityNameAndFN: "Municipal Authority",
    ronContractValue: 500000,
    maxTenderReceiptDeadline: "2025-12-10T10:00:00Z",
    noticeStateDate: "2025-11-10T10:00:00Z",
    sysProcedureType: { id: 1, text: "Open tender" },
    sysAcquisitionContractType: { id: 3, text: "Works" },
    isOnline: true,
    highestOfferValue: 520000,
    lowestOfferValue: 480000,
  },
  {
    caNoticeId: 100003,
    noticeId: 200003,
    noticeNo: "CAN003",
    contractTitle: "SUSPICIOUS: Very short deadline, high value",
    contractingAuthorityNameAndFN: "Small Town Council",
    ronContractValue: 5000000, // Unusually high
    maxTenderReceiptDeadline: "2025-11-20T10:00:00Z", // Only 5 days!
    noticeStateDate: "2025-11-15T10:00:00Z",
    sysProcedureType: { id: 16, text: "Simplified procedure" }, // Unusual for high value
    sysAcquisitionContractType: { id: 1, text: "Supply" },
    isOnline: false, // Not online despite high value
    highestOfferValue: 5100000,
    lowestOfferValue: 5000000, // Very close to estimate
  },
];

/**
 * Example 1: Basic Anomaly Detection
 */
export async function example1_BasicAnomalyDetection() {
  console.log('\n=== Example 1: Basic Anomaly Detection ===\n');
  
  const result = await trainAndDetectAnomalies(
    sampleProcurementData,
    100,  // 100 trees
    256,  // subsample size
    0.6   // threshold
  );
  
  console.log('Anomaly Scores:', result.scores);
  console.log('Predictions (-1=normal, 1=anomaly):', result.anomalies);
  console.log('Anomaly Indices:', result.anomalyIndices);
  
  // Show which notices are anomalies
  result.anomalyIndices.forEach(idx => {
    const notice = sampleProcurementData[idx];
    console.log(`\nAnomaly detected:`);
    console.log(`  Notice: ${notice.noticeNo}`);
    console.log(`  Title: ${notice.contractTitle}`);
    console.log(`  Value: ${notice.ronContractValue} RON`);
    console.log(`  Anomaly Score: ${result.scores[idx].toFixed(3)}`);
  });
}

/**
 * Example 2: Manual Model Training and Scoring
 */
export function example2_ManualTraining() {
  console.log('\n=== Example 2: Manual Model Training ===\n');
  
  // Extract features from all notices
  const features = sampleProcurementData.map(extractProcurementFeatures);
  console.log('Features extracted:', features);
  
  // Create and train model
  const model = new IsolationForest(100, 256);
  model.fit(features);
  console.log('Model trained successfully');
  
  // Score each notice
  const scores = model.score(features);
  console.log('Anomaly scores:', scores);
  
  // Predict anomalies
  const predictions = model.predict(features, 0.6);
  console.log('Predictions:', predictions);
}

/**
 * Example 3: Combining with Existing Risk Scores
 */
export async function example3_CombinedRiskScoring() {
  console.log('\n=== Example 3: Combined Risk Scoring ===\n');
  
  const result = await trainAndDetectAnomalies(sampleProcurementData);
  
  // Simulate existing rule-based risk scores
  const existingRiskScores = [35, 45, 75]; // Low, Medium, High
  
  sampleProcurementData.forEach((notice, idx) => {
    const isolationScore = result.scores[idx];
    const existingScore = existingRiskScores[idx];
    
    // Combine scores (30% ML, 70% rules)
    const combinedScore = calculateAnomalyRiskScore(
      isolationScore,
      existingScore,
      0.3
    );
    
    console.log(`\nNotice ${notice.noticeNo}:`);
    console.log(`  Existing Risk Score: ${existingScore}`);
    console.log(`  Isolation Score: ${(isolationScore * 100).toFixed(1)}`);
    console.log(`  Combined Score: ${combinedScore}`);
    console.log(`  Risk Level: ${combinedScore >= 70 ? 'HIGH' : combinedScore >= 30 ? 'MEDIUM' : 'LOW'}`);
  });
}

/**
 * Example 4: Feature Extraction Details
 */
export function example4_FeatureExtraction() {
  console.log('\n=== Example 4: Feature Extraction ===\n');
  
  sampleProcurementData.forEach(notice => {
    console.log(`\nNotice ${notice.noticeNo}:`);
    console.log(`  Title: ${notice.contractTitle}`);
    
    const features = extractProcurementFeatures(notice);
    console.log(`  Extracted features:`);
    console.log(`    [0] Contract Value: ${features[0]} RON`);
    console.log(`    [1] Deadline Days: ${features[1]}`);
    console.log(`    [2] Procedure Type ID: ${features[2]}`);
    console.log(`    [3] Is Online: ${features[3]}`);
    console.log(`    [4] Acquisition Type ID: ${features[4]}`);
    console.log(`    [5] Highest Offer: ${features[5]} RON`);
  });
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Isolation Forest Anomaly Detection Examples');
  console.log('═══════════════════════════════════════════════════════════');
  
  example4_FeatureExtraction();
  example2_ManualTraining();
  await example1_BasicAnomalyDetection();
  await example3_CombinedRiskScoring();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   All examples completed!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Uncomment to run examples when importing this file
// runAllExamples().catch(console.error);
