#!/usr/bin/env python3
"""
Example: Training Isolation Forest with scikit-learn
Demonstrates how to use the converted CSV data for ML training

Requirements:
    pip install pandas scikit-learn numpy

Usage:
    python3 scripts/train_isolation_forest.py [csv_file]
"""

import sys
import os
from pathlib import Path

try:
    import pandas as pd
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
except ImportError:
    print("Error: Required packages not installed")
    print("Install with: pip install pandas scikit-learn numpy")
    sys.exit(1)


def load_and_prepare_data(csv_file):
    """Load CSV and prepare features for ML"""
    print(f"Loading data from {csv_file}...")
    df = pd.read_csv(csv_file)
    
    print(f"Loaded {len(df)} records")
    print(f"Columns: {len(df.columns)}")
    
    # Select numerical features for anomaly detection
    feature_columns = [
        'ronContractValue',
        'highestOfferValue',
        'lowestOfferValue',
        'procedureTypeId',
        'acquisitionContractTypeId',
        'errataNo'
    ]
    
    # Create feature matrix
    X = df[feature_columns].fillna(0)
    
    print(f"\nSelected {len(feature_columns)} features:")
    for col in feature_columns:
        print(f"  - {col}")
    
    return df, X, feature_columns


def train_isolation_forest(X, contamination=0.1, n_estimators=100):
    """Train Isolation Forest model"""
    print(f"\nTraining Isolation Forest...")
    print(f"  Trees: {n_estimators}")
    print(f"  Expected anomaly rate: {contamination*100}%")
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train model
    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=42,
        n_jobs=-1  # Use all CPU cores
    )
    
    predictions = model.fit_predict(X_scaled)
    scores = model.score_samples(X_scaled)
    
    return model, predictions, scores, scaler


def analyze_results(df, predictions, scores, feature_columns):
    """Analyze and display results"""
    # Count anomalies
    n_anomalies = (predictions == -1).sum()
    n_normal = (predictions == 1).sum()
    
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Total records: {len(df)}")
    print(f"Normal points: {n_normal} ({n_normal/len(df)*100:.1f}%)")
    print(f"Anomalies detected: {n_anomalies} ({n_anomalies/len(df)*100:.1f}%)")
    
    # Get top anomalies
    df_with_scores = df.copy()
    df_with_scores['anomaly_score'] = scores
    df_with_scores['is_anomaly'] = predictions == -1
    
    anomalies = df_with_scores[df_with_scores['is_anomaly']].copy()
    anomalies = anomalies.sort_values('anomaly_score')
    
    print("\n" + "=" * 60)
    print(f"TOP 10 ANOMALIES (Most Suspicious)")
    print("=" * 60)
    
    for idx, row in anomalies.head(10).iterrows():
        print(f"\n{idx + 1}. Notice {row['noticeNo']}")
        print(f"   Authority: {row['contractingAuthority']}")
        print(f"   Title: {row['contractTitle'][:60]}...")
        print(f"   Value: {row['ronContractValue']:,.0f} RON")
        print(f"   Procedure: {row['procedureTypeText']}")
        print(f"   Anomaly Score: {row['anomaly_score']:.4f}")
    
    # Feature statistics for anomalies
    print("\n" + "=" * 60)
    print("ANOMALY CHARACTERISTICS")
    print("=" * 60)
    
    for col in feature_columns:
        if col in df.columns:
            normal_mean = df_with_scores[~df_with_scores['is_anomaly']][col].mean()
            anomaly_mean = df_with_scores[df_with_scores['is_anomaly']][col].mean()
            
            if normal_mean != 0:
                diff_pct = ((anomaly_mean - normal_mean) / normal_mean) * 100
                print(f"{col}:")
                print(f"  Normal avg: {normal_mean:,.2f}")
                print(f"  Anomaly avg: {anomaly_mean:,.2f}")
                print(f"  Difference: {diff_pct:+.1f}%")
    
    return anomalies


def save_results(anomalies, output_file):
    """Save anomalies to CSV"""
    anomalies.to_csv(output_file, index=False)
    print(f"\n✓ Anomalies saved to: {output_file}")


def main():
    """Main function"""
    # Get CSV file path
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    else:
        # Find most recent CSV file
        output_dir = Path('output')
        csv_files = list(output_dir.glob('procurement-training-data-*.csv'))
        
        if not csv_files:
            print("Error: No CSV files found in output/")
            print("Run: npm run convert:csv")
            sys.exit(1)
        
        csv_file = max(csv_files, key=lambda p: p.stat().st_mtime)
        print(f"Using most recent file: {csv_file}")
    
    if not os.path.exists(csv_file):
        print(f"Error: File not found: {csv_file}")
        sys.exit(1)
    
    # Load and prepare data
    df, X, feature_columns = load_and_prepare_data(csv_file)
    
    # Train model
    model, predictions, scores, scaler = train_isolation_forest(X)
    
    # Analyze results
    anomalies = analyze_results(df, predictions, scores, feature_columns)
    
    # Save results
    output_file = 'output/detected-anomalies.csv'
    save_results(anomalies, output_file)
    
    print("\n" + "=" * 60)
    print("Analysis complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Review anomalies in output/detected-anomalies.csv")
    print("2. Validate findings with domain experts")
    print("3. Tune contamination parameter if needed")
    print("4. Integrate findings into risk scoring system")


if __name__ == '__main__':
    main()
