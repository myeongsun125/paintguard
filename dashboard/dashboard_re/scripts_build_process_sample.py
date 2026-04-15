from __future__ import annotations

from pathlib import Path
import json
import pandas as pd

ROOT = Path('/home/ubuntu/mes-edge-dashboard')
DATA_DIR = ROOT / 'server' / 'data' / 'mes'
OUT = ROOT / 'server' / 'data' / 'mes' / 'sampleData.json'

plant_daily = pd.read_csv(DATA_DIR / 'agg_plant_daily.csv', encoding='utf-8-sig')
shift_hourly = pd.read_csv(DATA_DIR / 'agg_shift_hourly.csv', encoding='utf-8-sig')
env_bins = pd.read_csv(DATA_DIR / 'agg_env_bins.csv', encoding='utf-8-sig')
line_monthly = pd.read_csv(DATA_DIR / 'agg_line_monthly.csv', encoding='utf-8-sig')

plants = (
    plant_daily[['plant_code', 'plant_name']]
    .drop_duplicates()
    .sort_values(['plant_code'])
    .to_dict(orient='records')
)

lines = (
    line_monthly[['plant_code', 'line_code']]
    .drop_duplicates()
    .sort_values(['plant_code', 'line_code'])
    .to_dict(orient='records')
)

summary = {
    'totalInspections': int(plant_daily['total'].sum()),
    'totalFails': int(plant_daily['fail_count'].sum()),
    'overallYieldRate': round(float((plant_daily['total'].sum() - plant_daily['fail_count'].sum()) / plant_daily['total'].sum() * 100), 2),
    'avgTaktTime': round(float((plant_daily['avg_takt'] * plant_daily['total']).sum() / plant_daily['total'].sum()), 3),
    'avgInferenceTime': 1.2,
    'dateRange': {
        'start': str(plant_daily['date'].min()),
        'end': str(plant_daily['date'].max()),
    },
}

quality_sample = {
    'topDefects': [
        {'code': 'SCR', 'name': '스크래치', 'count': 42432, 'share': 24.8},
        {'code': 'DNT', 'name': '덴트', 'count': 25583, 'share': 15.0},
        {'code': 'PBB', 'name': '도장기포', 'count': 20738, 'share': 12.1},
        {'code': 'DST', 'name': '이물질', 'count': 17150, 'share': 10.0},
        {'code': 'PDR', 'name': '도장흘림', 'count': 17111, 'share': 10.0},
        {'code': 'ORG', 'name': '오렌지필', 'count': 13782, 'share': 8.1},
    ],
    'severityDistribution': [
        {'severity': 'MINOR', 'count': 119705, 'share': 70.0},
        {'severity': 'MAJOR', 'count': 25583, 'share': 15.0},
        {'severity': 'CRITICAL', 'count': 25616, 'share': 15.0},
    ],
    'zoneHeatmap': [
        {'zone': 'HOOD', 'defects': 14210, 'criticalRate': 13.9},
        {'zone': 'FF', 'defects': 14152, 'criticalRate': 14.8},
        {'zone': 'FD', 'defects': 14464, 'criticalRate': 15.4},
        {'zone': 'RD', 'defects': 14085, 'criticalRate': 14.7},
        {'zone': 'RF', 'defects': 14203, 'criticalRate': 15.2},
        {'zone': 'TRUNK', 'defects': 14126, 'criticalRate': 14.9},
        {'zone': 'BUMPER_F', 'defects': 14381, 'criticalRate': 16.8},
        {'zone': 'BUMPER_R', 'defects': 14229, 'criticalRate': 16.1},
        {'zone': 'ROOF', 'defects': 14193, 'criticalRate': 14.6},
        {'zone': 'ROCKER', 'defects': 14147, 'criticalRate': 15.1},
        {'zone': 'QTR_L', 'defects': 14119, 'criticalRate': 14.4},
        {'zone': 'QTR_R', 'defects': 14095, 'criticalRate': 14.2},
    ],
    'modelComparison': [
        {'modelCode': 'SV7', 'modelName': '싼타페', 'failRate': 4.8, 'majorRate': 15.4, 'avgReworkMin': 34.0},
        {'modelCode': 'NQ5', 'modelName': '투싼', 'failRate': 4.1, 'majorRate': 13.8, 'avgReworkMin': 31.2},
        {'modelCode': 'CN7', 'modelName': '아반떼', 'failRate': 3.7, 'majorRate': 12.9, 'avgReworkMin': 28.1},
        {'modelCode': 'LX2', 'modelName': '팰리세이드', 'failRate': 4.5, 'majorRate': 16.3, 'avgReworkMin': 36.5},
        {'modelCode': 'EV9', 'modelName': 'EV9', 'failRate': 5.2, 'majorRate': 17.4, 'avgReworkMin': 39.8},
    ],
    'sampleCards': [
        {
            'imageId': 'sample-001',
            'imageLabel': '프론트 범퍼 샘플',
            'defectTypeCode': 'DNT',
            'defectTypeName': '덴트',
            'zone': 'BUMPER_F',
            'severity': 'MAJOR',
            'riskScore': 71.4,
            'riskGrade': 'CRITICAL',
            'confidence': 0.9447,
            'recommendation': '즉시 라인 정지 및 전수 재검사',
            'bbox': {'x': 0.61, 'y': 0.32, 'width': 0.16, 'height': 0.12},
        },
        {
            'imageId': 'sample-002',
            'imageLabel': '루프 샘플',
            'defectTypeCode': 'PDR',
            'defectTypeName': '도장흘림',
            'zone': 'ROOF',
            'severity': 'MINOR',
            'riskScore': 43.8,
            'riskGrade': 'MEDIUM',
            'confidence': 0.9325,
            'recommendation': '주기적 모니터링 강화',
            'bbox': {'x': 0.42, 'y': 0.22, 'width': 0.19, 'height': 0.14},
        },
        {
            'imageId': 'sample-003',
            'imageLabel': '트렁크 샘플',
            'defectTypeCode': 'GAP',
            'defectTypeName': 'Gap불량',
            'zone': 'TRUNK',
            'severity': 'CRITICAL',
            'riskScore': 82.6,
            'riskGrade': 'CRITICAL',
            'confidence': 0.9207,
            'recommendation': '즉시 라인 정지 및 전수 재검사',
            'bbox': {'x': 0.58, 'y': 0.45, 'width': 0.22, 'height': 0.08},
        },
        {
            'imageId': 'sample-004',
            'imageLabel': '프론트 도어 샘플',
            'defectTypeCode': 'SCR',
            'defectTypeName': '스크래치',
            'zone': 'FD',
            'severity': 'MINOR',
            'riskScore': 36.2,
            'riskGrade': 'LOW',
            'confidence': 0.9012,
            'recommendation': '정기 모니터링 유지',
            'bbox': {'x': 0.33, 'y': 0.56, 'width': 0.2, 'height': 0.06},
        },
    ],
}

payload = {
    'summary': summary,
    'plants': plants,
    'lines': lines,
    'plantDaily': plant_daily.to_dict(orient='records'),
    'shiftHourly': shift_hourly.to_dict(orient='records'),
    'envBins': env_bins.to_dict(orient='records'),
    'lineMonthly': line_monthly.to_dict(orient='records'),
    'qualitySample': quality_sample,
}

OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {OUT}')
