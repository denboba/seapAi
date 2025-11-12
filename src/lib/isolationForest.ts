/**
 * Isolation Forest Anomaly Detection
 * 
 * Isolation Forest is an unsupervised machine learning algorithm for anomaly detection.
 * It works by randomly selecting a feature and then randomly selecting a split value 
 * between the maximum and minimum values of that feature. Anomalies are easier to isolate
 * and require fewer splits, resulting in shorter path lengths in the tree.
 * 
 * Key Concepts:
 * - Anomalies are data points that are "few and different"
 * - They are easier to isolate than normal points
 * - Path length in isolation trees is shorter for anomalies
 * - Anomaly score = 2^(-average_path_length / c(n))
 * 
 * For procurement risk analytics, this can detect:
 * - Unusual contract values
 * - Abnormal deadline patterns
 * - Outlier bidding behavior
 * - Suspicious vendor concentrations
 * 
 * Reference: https://www.geeksforgeeks.org/machine-learning/what-is-isolation-forest/
 */

interface IsolationTreeNode {
  feature?: number;
  splitValue?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
  size?: number;
}

interface ProcurementFeatures {
  contractValue: number;
  deadlineDays: number;
  numberOfBidders: number;
  procedureTypeId: number;
  isOnline: number;
  historicalAverage: number;
}

/**
 * Calculate average path length for unsuccessful search in Binary Search Tree
 * This is used for normalization
 */
function c(n: number): number {
  if (n <= 1) return 0;
  const H = Math.log(n - 1) + 0.5772156649; // Euler's constant
  return 2 * H - (2 * (n - 1) / n);
}

/**
 * Builds a single isolation tree
 */
function buildIsolationTree(
  data: number[][],
  currentHeight: number,
  heightLimit: number
): IsolationTreeNode {
  const n = data.length;
  
  // Terminal node conditions
  if (currentHeight >= heightLimit || n <= 1) {
    return { size: n };
  }
  
  // Randomly select a feature
  const numFeatures = data[0].length;
  const feature = Math.floor(Math.random() * numFeatures);
  
  // Get min and max values for the selected feature
  const values = data.map(point => point[feature]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // If all values are the same, create a terminal node
  if (min === max) {
    return { size: n };
  }
  
  // Randomly select a split value
  const splitValue = min + Math.random() * (max - min);
  
  // Split the data
  const left = data.filter(point => point[feature] < splitValue);
  const right = data.filter(point => point[feature] >= splitValue);
  
  return {
    feature,
    splitValue,
    left: buildIsolationTree(left, currentHeight + 1, heightLimit),
    right: buildIsolationTree(right, currentHeight + 1, heightLimit),
  };
}

/**
 * Calculate path length for a single data point in an isolation tree
 */
function pathLength(point: number[], node: IsolationTreeNode, currentHeight: number): number {
  // If terminal node, add adjustment for expected path length
  if (node.size !== undefined) {
    return currentHeight + (node.size > 1 ? c(node.size) : 0);
  }
  
  // Navigate to left or right subtree
  if (node.feature !== undefined && node.splitValue !== undefined) {
    if (point[node.feature] < node.splitValue && node.left) {
      return pathLength(point, node.left, currentHeight + 1);
    } else if (node.right) {
      return pathLength(point, node.right, currentHeight + 1);
    }
  }
  
  return currentHeight;
}

/**
 * Isolation Forest class for anomaly detection
 */
export class IsolationForest {
  private trees: IsolationTreeNode[] = [];
  private numTrees: number;
  private subsampleSize: number;
  private heightLimit: number;
  
  constructor(numTrees = 100, subsampleSize = 256) {
    this.numTrees = numTrees;
    this.subsampleSize = subsampleSize;
    this.heightLimit = Math.ceil(Math.log2(subsampleSize));
  }
  
  /**
   * Train the isolation forest on the given data
   */
  fit(data: number[][]): void {
    this.trees = [];
    const n = data.length;
    
    for (let i = 0; i < this.numTrees; i++) {
      // Create subsample
      const subsample: number[][] = [];
      const sampleSize = Math.min(this.subsampleSize, n);
      
      for (let j = 0; j < sampleSize; j++) {
        const randomIndex = Math.floor(Math.random() * n);
        subsample.push(data[randomIndex]);
      }
      
      // Build isolation tree
      this.trees.push(buildIsolationTree(subsample, 0, this.heightLimit));
    }
  }
  
  /**
   * Calculate anomaly score for a single data point
   * Score is between 0 and 1, where values closer to 1 indicate anomalies
   */
  scoreOne(point: number[]): number {
    if (this.trees.length === 0) {
      throw new Error('Model not trained. Call fit() first.');
    }
    
    // Calculate average path length across all trees
    let avgPathLength = 0;
    for (const tree of this.trees) {
      avgPathLength += pathLength(point, tree, 0);
    }
    avgPathLength /= this.trees.length;
    
    // Calculate anomaly score using normalization
    const n = this.subsampleSize;
    const score = Math.pow(2, -avgPathLength / c(n));
    
    return score;
  }
  
  /**
   * Calculate anomaly scores for multiple data points
   */
  score(data: number[][]): number[] {
    return data.map(point => this.scoreOne(point));
  }
  
  /**
   * Predict anomalies based on a threshold
   * Returns 1 for anomalies, -1 for normal points
   */
  predict(data: number[][], threshold = 0.6): number[] {
    const scores = this.score(data);
    return scores.map(score => (score > threshold ? 1 : -1));
  }
}

/**
 * Procurement notice interface for type safety
 */
interface ProcurementNotice {
  caNoticeId: number;
  noticeId: number;
  noticeNo: string;
  contractTitle: string;
  contractingAuthorityNameAndFN: string;
  ronContractValue: number;
  maxTenderReceiptDeadline?: string | null;
  noticeStateDate?: string | null;
  sysProcedureType?: { id: number; text: string } | null;
  sysAcquisitionContractType?: { id: number; text: string } | null;
  isOnline: boolean;
  highestOfferValue?: number;
  lowestOfferValue?: number;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Extract features from procurement data for anomaly detection
 */
export function extractProcurementFeatures(notice: ProcurementNotice): number[] {
  // Calculate deadline days (if available)
  let deadlineDays = 0;
  if (notice.maxTenderReceiptDeadline && notice.noticeStateDate) {
    const deadline = new Date(notice.maxTenderReceiptDeadline);
    const published = new Date(notice.noticeStateDate);
    deadlineDays = Math.max(0, (deadline.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  return [
    notice.ronContractValue || 0,                    // Contract value
    deadlineDays,                                     // Days until deadline
    notice.sysProcedureType?.id || 0,                // Procedure type ID
    notice.isOnline ? 1 : 0,                         // Is online (boolean to number)
    notice.sysAcquisitionContractType?.id || 0,      // Acquisition type ID
    notice.highestOfferValue || 0,                   // Highest offer
  ];
}

/**
 * Integrate Isolation Forest anomaly score with existing risk scoring
 * Returns a combined risk score (0-100)
 */
export function calculateAnomalyRiskScore(
  isolationScore: number,
  existingRiskScore: number,
  weight = 0.3
): number {
  // Convert isolation score (0-1) to 0-100 scale
  const anomalyScore = isolationScore * 100;
  
  // Combine with existing risk score
  // weight determines how much the anomaly score influences the final score
  const combinedScore = (anomalyScore * weight) + (existingRiskScore * (1 - weight));
  
  return Math.min(100, Math.max(0, Math.round(combinedScore)));
}

/**
 * Train Isolation Forest on procurement data and detect anomalies
 */
export async function trainAndDetectAnomalies(
  procurementData: ProcurementNotice[],
  numTrees = 100,
  subsampleSize = 256,
  threshold = 0.6
): Promise<{
  model: IsolationForest;
  scores: number[];
  anomalies: number[];
  anomalyIndices: number[];
}> {
  // Extract features from all notices
  const features = procurementData.map(extractProcurementFeatures);
  
  // Create and train model
  const model = new IsolationForest(numTrees, subsampleSize);
  model.fit(features);
  
  // Get anomaly scores
  const scores = model.score(features);
  const anomalies = model.predict(features, threshold);
  
  // Get indices of detected anomalies
  const anomalyIndices = anomalies
    .map((label, index) => (label === 1 ? index : -1))
    .filter(index => index !== -1);
  
  return { model, scores, anomalies, anomalyIndices };
}
