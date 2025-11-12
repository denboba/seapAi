# AI Training Data Preparation Guide

## Overview

This guide explains how to prepare procurement data for AI training and integrate machine learning-based anomaly detection into the e-Procurement Risk Analytics Suite.

## Table of Contents

1. [Converting JSON to CSV](#converting-json-to-csv)
2. [CSV Data Schema](#csv-data-schema)
3. [Isolation Forest Anomaly Detection](#isolation-forest-anomaly-detection)
4. [AI Training Recommendations](#ai-training-recommendations)
5. [Integration Guide](#integration-guide)

---

## Converting JSON to CSV

The system includes utilities to convert the procurement data from JSON format to CSV for AI training.

### Using the Python Script (Recommended)

The primary conversion tool is a Python script that's ideal for data science workflows:

```bash
# Convert using default paths (recommended)
npm run convert:csv

# Or use Python directly
python3 scripts/convert_to_csv.py

# Specify custom input/output paths
python3 scripts/convert_to_csv.py public/data.json output/my-data.csv
```

**Python Script Features:**
- Native Python CSV library (proper quoting and escaping)
- Automatic timestamped output filenames
- Progress tracking every 500 records
- UTF-8 encoding support
- Requires Python 3.6+

### Alternative: Node.js Script

For compatibility with Node.js workflows:

```bash
node scripts/convertToCSV.cjs path/to/input.json path/to/output.csv
```

### Using the TypeScript Library

For programmatic conversion in the browser application:

```typescript
import { exportDataForAITraining } from '@/lib/dataConverter';

// This will download the CSV file to the user's browser
const result = await exportDataForAITraining();
if (result.success) {
  console.log('CSV exported successfully');
}
```

### What Gets Converted

The converter flattens the nested JSON structure into a flat CSV with 34 columns:

- **Identifiers**: caNoticeId, noticeId, procedureId, noticeNo
- **States**: notice state and procedure state (ID and text)
- **Authority**: contracting authority name
- **Contract Details**: title, types, CPV codes
- **Financial**: contract values, offers
- **Dates**: publication, deadlines
- **Flags**: isOnline, isPPP, isUtility, etc.

---

## CSV Data Schema

### Column Descriptions

| Column Name | Type | Description |
|------------|------|-------------|
| `caNoticeId` | Integer | Unique notice identifier |
| `noticeId` | Integer | Internal notice ID |
| `procedureId` | Integer/Empty | Procedure ID if applicable |
| `noticeNo` | String | Official notice number |
| `sysNoticeTypeId` | Integer | Notice type ID |
| `noticeStateId` | Integer | Current state ID (2=Published) |
| `noticeStateText` | String | State description |
| `procedureStateId` | Integer | Procedure state ID (5=Awarded) |
| `procedureStateText` | String | Procedure state description |
| `contractingAuthority` | String | Authority name and fiscal number |
| `contractTitle` | String | Contract title/description |
| `acquisitionContractTypeId` | Integer | Type ID (1=Supply, 3=Works) |
| `acquisitionContractTypeText` | String | Type description |
| `procedureTypeId` | Integer | Procedure type ID |
| `procedureTypeText` | String | Procedure type (e.g., "Licitatie deschisa") |
| `contractAssigmentTypeId` | Integer | Assignment type ID |
| `contractAssigmentTypeText` | String | Assignment type description |
| `cpvCodeAndName` | String | CPV classification code and name |
| `ronContractValue` | Decimal | Contract value in RON |
| `estimatedValueExport` | String | Formatted estimated value |
| `highestOfferValue` | Decimal | Highest offer received |
| `lowestOfferValue` | Decimal | Lowest offer received |
| `noticeStateDate` | DateTime | When state was updated |
| `minTenderReceiptDeadline` | DateTime | Minimum deadline |
| `maxTenderReceiptDeadline` | DateTime | Maximum deadline |
| `tenderReceiptDeadlineExport` | String | Formatted deadline |
| `isOnline` | Boolean | Is online procedure |
| `hasSubsequentContracts` | Boolean | Has follow-up contracts |
| `isUtility` | Boolean | Is utility contract |
| `isPPP` | Boolean | Is public-private partnership |
| `errataNo` | Integer | Number of corrections |
| `versionNo` | String | Version number |
| `sysNoticeVersionId` | Integer | System version ID |
| `currencyCode` | String | Currency (RON) |

### Data Quality Notes

- **Missing Values**: Empty strings for null/undefined values
- **Boolean Values**: "true" or "false" strings
- **CSV Escaping**: Proper handling of quotes and commas in text fields
- **Date Format**: ISO 8601 format (YYYY-MM-DDTHH:mm:ss+HH:mm)

---

## Isolation Forest Anomaly Detection

### What is Isolation Forest?

Isolation Forest is an unsupervised machine learning algorithm for anomaly detection. It works on the principle that anomalies are "few and different," making them easier to isolate than normal data points.

**Key Concepts:**
- Anomalies require fewer random splits to isolate
- Shorter path lengths in isolation trees indicate anomalies
- No labeled training data required
- Efficient for high-dimensional data

**Reference:** [GeeksforGeeks - Isolation Forest](https://www.geeksforgeeks.org/machine-learning/what-is-isolation-forest/)

### Why Use It for Procurement?

Isolation Forest can detect:
- **Unusual contract values** (suspiciously high or low)
- **Abnormal deadline patterns** (too short or irregular)
- **Outlier bidding behavior** (strange offer distributions)
- **Atypical procedure types** for certain authorities
- **Suspicious vendor concentrations**

### Using the Isolation Forest Module

```typescript
import { 
  IsolationForest, 
  trainAndDetectAnomalies,
  extractProcurementFeatures,
  calculateAnomalyRiskScore
} from '@/lib/isolationForest';

// 1. Load procurement data
const procurementData = [...]; // Array of notice objects

// 2. Train model and detect anomalies
const result = await trainAndDetectAnomalies(
  procurementData,
  numTrees = 100,      // Number of isolation trees
  subsampleSize = 256, // Sample size for each tree
  threshold = 0.6      // Anomaly threshold (0-1)
);

// 3. Get anomaly scores
console.log('Anomaly scores:', result.scores);
console.log('Detected anomalies:', result.anomalyIndices);

// 4. Integrate with existing risk scoring
const existingRiskScore = 65;
const isolationScore = result.scores[0];
const combinedScore = calculateAnomalyRiskScore(
  isolationScore, 
  existingRiskScore,
  weight = 0.3 // How much anomaly score influences final score
);
```

### Feature Engineering

The module extracts these features for anomaly detection:

1. **Contract Value** (ronContractValue)
2. **Deadline Days** (time between publication and deadline)
3. **Procedure Type ID** (sysProcedureType.id)
4. **Is Online** (boolean converted to 0/1)
5. **Acquisition Type ID** (sysAcquisitionContractType.id)
6. **Highest Offer Value** (if available)

### Hyperparameter Tuning

- **numTrees** (default: 100)
  - More trees = more stable results
  - 50-200 is typical range
  - Diminishing returns after 100

- **subsampleSize** (default: 256)
  - Larger = better for large datasets
  - Smaller = faster training
  - 256 is good default for most cases

- **threshold** (default: 0.6)
  - Higher = fewer false positives
  - Lower = catch more potential anomalies
  - Tune based on your domain knowledge
  - 0.5-0.7 is typical range

---

## AI Training Recommendations

### Data Preparation Checklist

- [ ] Export data to CSV using the converter
- [ ] Check for data quality issues (missing values, outliers)
- [ ] Normalize numerical features (contract values, dates)
- [ ] Encode categorical features (procedure types, authorities)
- [ ] Split data into training/validation/test sets (70/15/15)
- [ ] Handle class imbalance if training supervised models

### Recommended ML Approaches

#### 1. **Supervised Learning** (if you have labeled data)

**Classification Models:**
- Random Forest
- XGBoost
- Neural Networks

**Target Variable:** Risk level (Low/Medium/High) or Fraud indicator

**Features:**
- All columns from CSV
- Engineered features (deadline urgency, authority history, etc.)

#### 2. **Unsupervised Learning** (no labels needed)

**Anomaly Detection:**
- **Isolation Forest** ✅ (already implemented)
- One-Class SVM
- Autoencoders
- Local Outlier Factor (LOF)

**Clustering:**
- K-Means (group similar contracts)
- DBSCAN (find unusual clusters)
- Hierarchical clustering

#### 3. **Semi-Supervised Learning**

If you have limited labeled data:
- Train on labeled subset
- Use pseudo-labeling on unlabeled data
- Active learning (flag uncertain cases for review)

### Python Training Example

```python
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# 1. Load CSV
df = pd.read_csv('procurement-training-data.csv')

# 2. Select numerical features
features = ['ronContractValue', 'highestOfferValue', 
            'procedureTypeId', 'acquisitionContractTypeId']
X = df[features].fillna(0)

# 3. Normalize
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 4. Train Isolation Forest
model = IsolationForest(
    n_estimators=100,
    contamination=0.1,  # Expected % of anomalies
    random_state=42
)
predictions = model.fit_predict(X_scaled)

# 5. Get anomalies
anomalies = df[predictions == -1]
print(f"Detected {len(anomalies)} anomalies")
```

### Evaluation Metrics

For **supervised** models:
- Precision, Recall, F1-score
- ROC-AUC
- Confusion matrix

For **unsupervised** models:
- Manual review of flagged anomalies
- Domain expert validation
- Comparison with known fraud cases

---

## Integration Guide

### Adding CSV Export to UI

Add a button to download training data:

```tsx
import { exportDataForAITraining } from '@/lib/dataConverter';

function ExportButton() {
  const handleExport = async () => {
    const result = await exportDataForAITraining();
    if (result.success) {
      toast.success('CSV exported for AI training');
    } else {
      toast.error(result.message);
    }
  };
  
  return (
    <Button onClick={handleExport}>
      Export Training Data (CSV)
    </Button>
  );
}
```

### Integrating Isolation Forest with Risk Scoring

Update your risk calculation to include anomaly detection:

```typescript
import { 
  IsolationForest, 
  extractProcurementFeatures 
} from '@/lib/isolationForest';

// Train once on historical data
const model = new IsolationForest(100, 256);
const allFeatures = historicalData.map(extractProcurementFeatures);
model.fit(allFeatures);

// Score new notices
function calculateEnhancedRiskScore(notice: Notice): number {
  // 1. Get existing rule-based score
  const ruleBasedScore = calculateRiskScore(notice); // Your existing function
  
  // 2. Get anomaly score
  const features = extractProcurementFeatures(notice);
  const anomalyScore = model.scoreOne(features);
  
  // 3. Combine scores (30% anomaly, 70% rules)
  const combinedScore = calculateAnomalyRiskScore(
    anomalyScore,
    ruleBasedScore,
    0.3
  );
  
  return combinedScore;
}
```

### Real-time Anomaly Detection

For new procurements:

```typescript
// Load model state (you'd persist this)
const model = loadPersistedModel();

// Check new notice
const newNotice = fetchLatestNotice();
const features = extractProcurementFeatures(newNotice);
const score = model.scoreOne(features);

if (score > 0.7) {
  alertOversightBody({
    noticeId: newNotice.caNoticeId,
    anomalyScore: score,
    message: 'High anomaly detected - requires review'
  });
}
```

---

## Next Steps

1. **Export your data**: Run `npm run convert:csv`
2. **Train a model**: Use Python/scikit-learn or integrate Isolation Forest
3. **Evaluate results**: Review flagged anomalies with domain experts
4. **Integrate into app**: Add anomaly scores to risk calculation
5. **Monitor performance**: Track false positives/negatives
6. **Iterate**: Refine features and thresholds based on feedback

---

## Resources

- [e-licitatie.ro API](https://e-licitatie.ro/pub/notices/c-notice/v2/view/100198694)
- [Isolation Forest Paper](https://cs.nju.edu.cn/zhouzh/zhouzh.files/publication/icdm08b.pdf)
- [scikit-learn Isolation Forest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html)
- [OCDS Standard](https://standard.open-contracting.org/)
- [CertSign ShellSafe](https://www.certsign.ro/ro/shellsafe-verify/) - For opening attached files

---

**Need Help?**

- Check the [main README](../README.md) for general system documentation
- Review code examples in `/src/lib/isolationForest.ts`
- Consult the [GeeksforGeeks guide](https://www.geeksforgeeks.org/machine-learning/what-is-isolation-forest/)
