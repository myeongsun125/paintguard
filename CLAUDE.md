# proj2_dataset - 자동차 도장 품질 검사 데이터셋

## 프로젝트 개요
자동차 제조 공정의 도장 품질 검사(AI 비전 검사) 데이터셋. 검사 기록, 결함 상세, 마스터 테이블, 이미지+YOLO 라벨로 구성.

---

## 디렉토리 구조

```
proj2_dataset/
├── track_a_data/              # 정형 데이터 (CSV 10개)
│   ├── inspection_master.csv      312 MB   3,000,000행
│   ├── daily_summary.csv           31 MB     318,812행
│   ├── defect_detail.csv           23 MB     170,904행
│   ├── defect_summary.csv          10 KB         120행
│   ├── master_color.csv           379 B          15행
│   ├── master_defect_type.csv     318 B          10행
│   ├── master_plant_line.csv      308 B          13행
│   ├── master_model.csv           283 B          12행
│   ├── master_zone.csv            244 B          12행
│   └── master_camera.csv          165 B           6행
│
├── track_a_images/            # 이미지 + 라벨 데이터
│   ├── images/
│   │   ├── train/                  47 MB   800장 (.jpg)
│   │   └── val/                    12 MB   200장 (.jpg)
│   └── labels/                    YOLO 형식 (.txt)
│       ├── train/                 2.6 MB   800개
│       └── val/                   656 KB   200개
│
└── CLAUDE.md                  # (이 파일)
```

---

## CSV 파일 상세

### 1. inspection_master.csv (312 MB, 3,000,000행)
> 개별 검사 건 전체 기록

| 컬럼 | 설명 |
|---|---|
| inspection_id | 검사 고유 ID (INS로 시작) |
| body_number | 차체 번호 |
| model_code | 모델 코드 (→ master_model) |
| color_code | 색상 코드 (→ master_color) |
| plant_code, line_code | 공장/라인 (→ master_plant_line) |
| camera_id | 카메라 ID (→ master_camera) |
| operator_id | 작업자 ID |
| shift | 교대조 (A/B/C) |
| inspection_datetime | 검사 일시 |
| inference_time_sec | AI 추론 시간 |
| result | 검사 결과 (PASS/FAIL) |
| confidence_score | 신뢰도 |
| takt_time_sec | 택트 타임 |
| ambient_temp_c | 주변 온도 |
| humidity_pct | 습도 |

**샘플 데이터:**
```
INS0000085621,SV7-085621,SV7,B3L,ULN,UL5,CAM01,OP0081,A,2023-01-01 06:00:01,1.269,FAIL,0.9156,2.65,23.8,33.8
INS0000746064,MQ4-746064,MQ4,WC9,ULN,UL5,CAM05,OP0032,A,2023-01-01 06:00:03,1.27,PASS,0.8849,2.83,18.2,50.6
INS0002631543,GV70-2631543,GV70,P2W,ASN,AS3,CAM02,OP0086,A,2023-01-01 06:00:45,1.228,PASS,0.8989,2.91,23.4,37.2
INS0000535451,EV9-535451,EV9,ABP,ULN,UL2,CAM06,OP0063,A,2023-01-01 06:00:49,1.034,PASS,0.9799,2.68,16.9,55.1
INS0001435264,NE1-1435264,NE1,P2W,ULN,UL3,CAM01,OP0054,A,2023-01-01 06:00:55,1.21,PASS,0.9039,2.45,23.7,58.4
```

---

### 2. daily_summary.csv (31 MB, 318,812행)
> 일별/공장/라인/모델/교대조 집계

**헤더:** date, plant_code, line_code, model_code, shift, total_inspections, pass_count, avg_inference_time, avg_takt_time, avg_confidence, avg_temp, avg_humidity, fail_count, yield_rate

**샘플 데이터:**
```
2023-01-01,ASN,AS1,CK,A,11,11,1.265,2.905,0.932,22.53,43.75,0,100.0
2023-01-01,ASN,AS1,CK,B,20,19,1.209,2.722,0.912,23.06,43.83,1,95.0
2023-01-01,ASN,AS1,CN7,A,19,19,1.145,2.802,0.916,22.92,45.67,0,100.0
2023-01-01,ASN,AS1,CN7,B,20,20,1.218,2.864,0.931,23.22,44.59,0,100.0
2023-01-01,ASN,AS1,CN7,C,2,2,1.249,2.73,0.914,22.9,51.8,0,100.0
```

---

### 3. defect_detail.csv (23 MB, 170,904행)
> 개별 결함 상세 정보

**헤더:** defect_id, inspection_id, body_number, defect_type_code, defect_type_name, severity, zone_code, zone_name, x_position_mm, y_position_mm, width_mm, height_mm, area_mm2, confidence, rework_required, estimated_rework_min, detection_datetime

**샘플 데이터:**
```
DEF0000000001,INS0000085621,SV7-085621,DNT,덴트,MAJOR,BUMPER_F,프론트범퍼,1314.9,68.8,15.2,7.5,369.55,0.9447,Y,45,2023-01-01 06:00:01
DEF0000000002,INS0001402028,LX2-1402028,GAP,Gap불량,CRITICAL,BUMPER_F,프론트범퍼,1795.1,115.2,22.3,1.9,113.23,0.9207,Y,60,2023-01-01 06:01:46
DEF0000000003,INS0002162718,CV-2162718,PDR,도장흘림,MINOR,ROOF,루프,150.4,199.1,33.2,16.8,114.12,0.9325,N,25,2023-01-01 06:05:15
DEF0000000004,INS0002162718,CV-2162718,ORG,오렌지필,MINOR,BUMPER_R,리어범퍼,1637.9,54.9,40.7,21.2,173.42,0.8718,N,20,2023-01-01 06:05:15
DEF0000000005,INS0002532927,CV-2532927,PDR,도장흘림,MINOR,TRUNK,트렁크,1918.7,302.4,6.5,3.8,424.51,0.9345,N,25,2023-01-01 06:05:50
```

---

### 4. defect_summary.csv (10 KB, 120행)
> 결함유형 × 구역 × 심각도별 집계

**헤더:** defect_type_code, defect_type_name, zone_code, zone_name, severity, defect_count, avg_area_mm2, avg_confidence, total_rework_min

**샘플 데이터:**
```
CLP,클립마크,BUMPER_F,프론트범퍼,MINOR,728,252.09,0.921,10920
CLP,클립마크,BUMPER_R,리어범퍼,MINOR,713,259.76,0.920,10695
CLP,클립마크,FD,프론트도어,MINOR,686,259.31,0.918,10290
CLP,클립마크,FF,프론트펜더,MINOR,709,252.64,0.920,10635
CLP,클립마크,HOOD,후드,MINOR,710,254.00,0.920,10650
```

---

### 5. master_color.csv (379 B, 15행)
> 색상 코드 마스터

**헤더:** color_code, color_name

**전체 데이터 (15행):** P2W(퓨어화이트), YW6(문라이트클라우드), B3L(아비스블랙), R4M(플레임레드), SWP(스노우화이트펄) 등

---

### 6. master_defect_type.csv (318 B, 10행)
> 결함 유형 마스터

**헤더:** defect_type_code, defect_type_name, severity, std_rework_time_min

**샘플:** SCR(스크래치/MINOR/15분), DNT(덴트/MAJOR/45분), PBB(도장기포/MINOR/30분), PDR(도장흘림/MINOR/25분), GAP(Gap불량/CRITICAL/60분)

---

### 7. master_plant_line.csv (308 B, 13행)
> 공장-라인 마스터

**헤더:** plant_code, plant_name, line_code

**공장:** ULN(울산공장) - UL1～UL5, ASN(아산공장) - AS1～AS3, GWJ(광주공장) - GW1～GW2, HWS(화성공장) - HW1～HW3

---

### 8. master_model.csv (283 B, 12행)
> 차량 모델 마스터

**헤더:** model_code, model_name, brand, default_line

**샘플:** SS3(쏘나타/HMC), SV7(싼타페/HMC), NQ5(투싼/HMC), CN7(아반떼/HMC), LX2(팰리세이드/HMC)

---

### 9. master_zone.csv (244 B, 12행)
> 검사 구역 마스터

**헤더:** zone_code, zone_name

**구역:** HOOD(후드), FF(프론트펜더), FD(프론트도어), RD(리어도어), RF(리어펜더), TRUNK(트렁크), BUMPER_F/R, ROOF, ROCKER, QTR_L/R

---

### 10. master_camera.csv (165 B, 6행)
> 카메라 마스터

**헤더:** camera_id, position, station_id

**전체:** CAM01(좌측면/INS-001), CAM02(우측면/INS-001), CAM03(상부/INS-002), CAM04(전면/INS-002), CAM05(후면/INS-003), CAM06(하부/INS-003)

---

## 이미지/라벨 데이터

- **이미지:** JPG, 파일명 패턴 `{zone}_{color}_{id}.jpg` (예: `roof_black_000391.jpg`)
- **라벨:** YOLO 형식 TXT (`class_id cx cy w h`), 정규화 좌표
- **Train/Val 비율:** 800:200 (80:20)
- 일부 라벨 파일은 비어있음 (결함 없는 이미지)

## 테이블 관계 (FK)
```
inspection_master ─┬─ model_code    → master_model
                   ├─ color_code    → master_color
                   ├─ plant_code + line_code → master_plant_line
                   └─ camera_id     → master_camera

defect_detail ─────┬─ inspection_id → inspection_master
                   ├─ defect_type_code → master_defect_type
                   └─ zone_code     → master_zone

daily_summary ─────┬─ plant_code + line_code → master_plant_line
                   └─ model_code    → master_model

defect_summary ────┬─ defect_type_code → master_defect_type
                   └─ zone_code     → master_zone
```

---

## 1단계 EDA 결과 (2026-04-05)

### 데이터 품질 요약

| 항목 | inspection_master | defect_detail | daily_summary |
|---|---|---|---|
| 행 수 | 3,000,000 | 170,904 | 318,812 |
| 컬럼 수 | 16 | 17 | 14 |
| **Null 비율** | **0% (전 컬럼)** | **0% (전 컬럼)** | **0% (전 컬럼)** |
| 날짜 범위 | 2023-01-01 ～ 2025-01-24 | 2023-01-01 ～ 2025-01-24 | 2023-01-01 ～ 2025-01-24 |
| 고유 일수 | — | — | 755일 |

> **Null 값 없음** — 3개 테이블 모두 결측치가 전혀 없는 완전한 데이터셋.

---

### PASS/FAIL 비율 (inspection_master)

| result | 건수 | 비율 |
|---|---|---|
| PASS | 2,877,908 | 95.93% |
| FAIL | 122,092 | **4.07%** |

---

### 수치형 기술통계

#### inspection_master

| 지표 | inference_time_sec | confidence_score | takt_time_sec | ambient_temp_c | humidity_pct |
|---|---|---|---|---|---|
| mean | 1.200 | 0.920 | 2.800 | 23.00 | 45.00 |
| std | 0.150 | 0.040 | 0.300 | 3.00 | 8.00 |
| min | 0.800 | 0.850 | 1.320 | 7.70 | 2.00 |
| max | 1.963 | 0.990 | 4.300 | 37.60 | 84.90 |

#### defect_detail

| 지표 | x_position_mm | y_position_mm | width_mm | height_mm | area_mm2 | confidence | est_rework_min |
|---|---|---|---|---|---|---|---|
| mean | 1,050.7 | 425.6 | 26.0 | 15.5 | 252.5 | 0.920 | 32.0 |
| std | 548.2 | 216.1 | 13.8 | 8.4 | 142.8 | 0.041 | 24.7 |
| min | 100.0 | 50.0 | 2.0 | 1.0 | 5.0 | 0.850 | 10 |
| max | 2,000.0 | 800.0 | 50.0 | 30.0 | 500.0 | 0.990 | 120 |

#### daily_summary

| 지표 | total_inspections | pass_count | fail_count | yield_rate |
|---|---|---|---|---|
| mean | 9.41 | 9.03 | 0.38 | 95.50 |
| std | 7.27 | 7.02 | 0.67 | 11.59 |
| min | 1 | 0 | 0 | 0.00 |
| max | 45 | 44 | 7 | 100.00 |
| median | 8 | 8 | 0 | 100.00 |

---

### 결함 분포

#### 결함 유형 (defect_detail)
| 코드 | 건수 | 비율 |
|---|---|---|
| SCR (스크래치) | 42,432 | 24.8% |
| DNT (덴트) | 25,583 | 15.0% |
| PBB (도장기포) | 20,738 | 12.1% |
| DST (이물질) | 17,150 | 10.0% |
| PDR (도장흘림) | 17,111 | 10.0% |
| ORG (오렌지필) | 13,782 | 8.1% |
| GAP (Gap불량) | 13,605 | 8.0% |
| CLP (클립마크) | 8,492 | 5.0% |
| CRK (크랙) | 6,841 | 4.0% |
| WLD (용접불량) | 5,170 | 3.0% |

#### 심각도 (defect_detail)
| severity | 건수 | 비율 |
|---|---|---|
| MINOR | 119,705 | 70.0% |
| CRITICAL | 25,616 | 15.0% |
| MAJOR | 25,583 | 15.0% |

#### 구역별 분포: 12개 zone에 거의 균등 분포 (14,085～14,464건, 편차 < 3%)

---

### FK 정합성 체크 결과

| FK 관계 | 결과 |
|---|---|
| inspection_master.model_code → master_model | **OK** |
| inspection_master.color_code → master_color | **OK** |
| inspection_master.plant_code+line_code → master_plant_line | **OK** |
| inspection_master.camera_id → master_camera | **OK** |
| defect_detail.inspection_id → inspection_master | **OK** (0건 불일치) |
| defect_detail.defect_type_code → master_defect_type | **OK** |
| defect_detail.zone_code → master_zone | **OK** |
| daily_summary.model_code → master_model | **OK** |
| daily_summary.plant_code+line_code → master_plant_line | **OK** |

> **FK 정합성 100%** — 모든 외래키 관계가 마스터 테이블과 정확히 매칭됨.

### Cross-check: daily_summary.total_inspections 합계 = 3,000,000 = inspection_master 행 수 → **일치**

---

### 주요 발견사항

1. **데이터 품질 우수** — Null 0%, FK 정합성 100%, 집계 cross-check 일치.
2. **FAIL률 4.07%** — 전체 300만건 중 122,092건 불량. 불균형 분류 문제(imbalanced).
3. **FAIL 1건당 평균 결함 1.4개** — 170,904 결함 / 122,092 FAIL. 1결함 70%, 2결함 20%, 3결함 10%.
4. **스크래치(SCR)가 최다 결함** — 전체의 24.8%. 다음으로 덴트(15%), 도장기포(12.1%).
5. **심각도 MINOR 70%** — CRITICAL(GAP/CRK/WLD) 15%, MAJOR(DNT) 15%.
6. **구역별 균등 분포** — 12개 zone에 거의 동일하게 분포 (시뮬레이션 데이터 특성).
7. **수치형 분포 대칭적** — mean ≈ median, 정규분포에 가까운 패턴.

---

## 2단계 심층 EDA 결과 (2026-04-05)

> 분석 노트북: `eda_visualization.ipynb` (14개 시각화 섹션, 실행 검증 완료)

### 핵심 발견사항 (Top 3)

| # | 발견 | 수치 | 비즈니스 임팩트 |
|---|---|---|---|
| 1 | **C조(야간 22시) 불량률 돌출** | 6.02% (A조 4.12%, B조 3.77%) | C조는 전체의 5.9%만 담당하나 불량률이 평균 대비 +48%. 야간 품질 감독 강화 필요 |
| 2 | **교대 시작 직후 불량 급증** | 06시 6.08%, 07시 5.94%, 21시 5.95% vs 정상시간 3.4～3.6% | 설비 워밍업/인수인계 공백. 교대 직후 30분 집중 모니터링 권장 |
| 3 | **저습도(< 25%) 환경에서 불량률 상승** | 4.3～4.5% vs 평균 4.07% | 도장 부스 습도 모니터링 알림 시스템 도입 권장. 온도는 영향 없음 |

### 교대조·시간대 상세

- **A조(06～13시)**: 4.12%, 검사 1,411,316건 (47.0%)
- **B조(14～21시)**: 3.77%, 검사 1,412,017건 (47.1%) — 가장 우수
- **C조(22시)**: 6.02%, 검사 176,667건 (5.9%) — 25개월간 일관되게 높음 (구조적 패턴)
- 월별 불량률 3.97～4.20% 범위에서 안정적 — 계절 트렌드 없음, 공정 in-control 상태

### 결함 유형별 재작업 비용 (노트북 실행 확인)

| 결함 | 심각도 | 건수 | 비율 | 총 재작업(h) | 재작업률 |
|---|---|---|---|---|---|
| SCR (스크래치) | MINOR | 42,432 | 24.8% | 10,608 | 30% |
| DNT (덴트) | MAJOR | 25,583 | 15.0% | **19,187** | 100% |
| PBB (도장기포) | MINOR | 20,738 | 12.1% | 10,369 | 30% |
| DST (이물질) | MINOR | 17,150 | 10.0% | 2,858 | 30% |
| PDR (도장흘림) | MINOR | 17,111 | 10.0% | 7,130 | 30% |
| ORG (오렌지필) | MINOR | 13,782 | 8.1% | 4,594 | 31% |
| GAP (Gap불량) | CRITICAL | 13,605 | 8.0% | **13,605** | 100% |
| CLP (클립마크) | MINOR | 8,492 | 5.0% | 2,123 | 30% |
| CRK (크랙) | CRITICAL | 6,841 | 4.0% | 10,262 | 100% |
| WLD (용접불량) | CRITICAL | 5,170 | 3.0% | 10,340 | 100% |
| **합계** | | **170,904** | | **91,076** | |

### 결함 관리 우선순위

| 순위 | 결함 | 근거 |
|---|---|---|
| 1순위 | DNT(덴트) | 재작업 비용 최대 (19,187h), 100% 재작업 필수, 고빈도(15%) |
| 2순위 | GAP(Gap불량) | 재작업 비용 2위 (13,605h), CRITICAL, 100% 재작업 |
| 3순위 | WLD(용접불량), CRK(크랙) | 건당 120분/90분으로 단건 비용 극대 (총 10,340h/10,262h) |
| 4순위 | SCR(스크래치) | 발생 빈도 1위(24.8%), 다중결함의 핵심 동반자 (Top 10 동시발생 조합 중 7개에 포함) |

### 결함 동시발생 Top 5

| 조합 | 건수 |
|---|---|
| DNT(덴트) + SCR(스크래치) | 4,002 |
| PBB(도장기포) + SCR(스크래치) | 3,288 |
| DST(이물질) + SCR(스크래치) | 2,699 |
| PDR(도장흘림) + SCR(스크래치) | 2,642 |
| GAP(Gap불량) + SCR(스크래치) | 2,181 |

> 다중결함 검사 36,609건 중 SCR이 거의 모든 조합에 동반 — SCR 예방이 다중결함 저감의 레버리지 포인트

### 공장·라인·작업자

- **공장 간 불량률 차이 미미**: ASN 4.09%, ULN 4.07%, HWS 4.06%, GWJ 4.04%
- **라인 단위 편차**: UL5(4.16%) ～ HW3(3.96%), 최대 0.20%p
- **작업자 100명**: 불량률 3.82～4.35% (std 0.12%p) — 개인 차이보다 공정/환경 요인이 지배적

### 시뮬레이션 데이터 특성

- 구역별 결함 분포 균등 (12개 zone 편차 < 3%), 결함 좌표(x,y) 균일분포
- `confidence_score`가 PASS/FAIL을 구분하지 못함 (PASS 0.9201 ± 0.0404 vs FAIL 0.9202 ± 0.0404)
- `inference_time_sec`도 PASS/FAIL 간 차이 없음
- 공장/모델/색상/카메라별 불량률 차이 극미 (3.96～4.16% 범위)
- 수치형 변수 간 상관계수 ≈ 0, 모두 독립적으로 생성된 패턴

### 모델링 제언

- **유효 피처**: `shift`, `hour` (교대 시작 시간대), `humidity_pct` (저습도 구간), `line_code` (약한 신호)
- **무효 피처**: `confidence_score`, `inference_time_sec`, `ambient_temp_c`, `model_code`, `color_code`
- **클래스 불균형** (FAIL 4.07%): SMOTE, class_weight 조정 등 필요
- 범주형 교차 피처 엔지니어링 권장: `shift × hour`, `shift × plant`
- 다중결함 예측 시 SCR 동반 확률 모델링 고려

---

## 3단계 테이블 관계 분석 (2026-04-06)

> 분석 노트북: `data_relationship_analysis.ipynb` (전체 실행 검증 완료)

### 1. 테이블 관계 검증

#### inspection_master ↔ defect_detail 매칭 분포

| 결함 수 | 검사 건수 | 비율 |
|---|---|---|
| 0건 (PASS) | 2,877,908 | 95.93% |
| 1건 | 85,483 | 2.85% |
| 2건 | 24,406 | 0.81% |
| 3건 | 12,203 | 0.41% |

- FAIL 건의 결함 수 분포: 1건(70.02%), 2건(19.99%), 3건(9.99%)

#### 데이터 정합성: **100% 정합**

- PASS인데 defect_detail에 있는 건: **0건**
- FAIL인데 defect_detail에 없는 건: **0건**

#### daily_summary ↔ inspection_master 집계 검증: **완벽 일치**

- 318,812행 전건 매칭, 미매칭 0건
- 정수형 컬럼(total/pass/fail_count): **100% 정확 일치**
- 실수형 컬럼(avg_inference/takt/confidence/temp/humidity): **max_diff=0.000** (오차 없음)
- yield_rate: max_diff=0.005 (반올림 오차 이내)

### 2. 마스터 테이블 분포 — 쏠림 분석

| 마스터 | CV(변동계수) | max/min 비율 | 판정 |
|---|---|---|---|
| model_code | 45.0% | 5.01x | **쏠림 있음** (일부 모델 집중) |
| color_code | 91.1% | 20.19x | **심한 쏠림** (인기 색상 집중) |
| camera_id | 0.1% | 1.00x | 완벽 균등 |
| plant+line | — | — | 라인별 차이 존재 |

### 3. 카디널리티

| 관계 | 카디널리티 |
|---|---|
| inspection_master → master_model | N:1 (3,000,000 → 12) |
| inspection_master → master_color | N:1 (3,000,000 → 15) |
| inspection_master → master_plant_line | N:1 (3,000,000 → 13) |
| inspection_master → master_camera | N:1 (3,000,000 → 6) |
| inspection_master → defect_detail | 1:N (평균 1:1.4, max 1:3) |
| defect_detail → master_defect_type | N:1 (170,904 → 10) |
| defect_detail → master_zone | N:1 (170,904 → 12) |
| daily_summary → inspection_master | 집계 관계 (SUM/AVG) |

### 4. 이미지-정형 데이터 연결 가능성

> 이미지 측 메타 파일: `track_a_images/data.yaml`, `track_a_images/classes.txt`, `track_a_images/metadata.json`

#### YOLO class_id ↔ master_defect_type (data.yaml 명시 매핑)

| class_id | YOLO name | master_defect_type | severity | bbox 수 |
|---|---|---|---|---|
| 0 | scratch | **SCR** (스크래치) | MINOR | 325 |
| 1 | dent | **DNT** (덴트) | MAJOR | 252 |
| 2 | paint_bubble | **PBB** (도장기포) | MINOR | 166 |
| 3 | paint_drip | **PDR** (도장흘림) | MINOR | 116 |
| 4 | dust | **DST** (이물질) | MINOR | 151 |
| 5 | orange_peel | **ORG** (오렌지필) | MINOR | 121 |
| 6 | crack | **CRK** (크랙) | CRITICAL | 54 |
| 7 | gap_fault | **GAP** (Gap불량) | CRITICAL | 99 |

- **8개 YOLO 클래스 전부 1:1 명시 매핑** (data.yaml 기준)
- 이미지 데이터에 **없는 defect_type**: CLP(클립마크), WLD(용접불량) 2개
- **매핑 커버리지: 8/10 = 80%**
- YOLO 라벨 총 1,284개 바운딩 박스, 빈 라벨 파일 169개 (결함 없는 이미지)

#### zone 매핑 (이미지 8개 → master_zone 12개)

| 이미지 zone | master_zone | 매핑 |
|---|---|---|
| hood, front_door, rear_door, roof, trunk, rocker | HOOD, FD, RD, ROOF, TRUNK, ROCKER | 1:1 정확 (6/8) |
| bumper | BUMPER_F, BUMPER_R | 1:2 모호 (앞뒤 구분 불가) |
| fender | FF, RF | 1:2 모호 (앞뒤 구분 불가) |
| (없음) | QTR_L, QTR_R | 대응 없음 |

#### color 매핑 (이미지 10개 → master_color 15개)

- 1:1 추정 가능: black→B3L, red→R4M, pearl_white→SWP, navy→NB5
- 1:N 모호: blue/silver/gray/white (각 2후보)
- 매핑 불가: bronze, green (master_color에 대응 코드 없음)

#### 인스턴스 레벨 조인 (이미지 ↔ 정형 개별 레코드)

- **불가** — 공유 키(inspection_id, body_number) 부재
- 바운딩박스 좌표는 **정규화(0～1)** vs defect_detail은 **mm 단위** — 체계 상이

### 핵심 결론

1. **정형 데이터 정합성 완벽** — PASS/FAIL↔결함, daily_summary 집계 모두 100% 일치
2. **마스터 분포 비균등** — color_code(CV 91.1%, 20배 차이), model_code(CV 45%, 5배 차이) 쏠림 존재
3. **YOLO ↔ defect_type 매핑 존재** — data.yaml에 8개 클래스 1:1 명시 매핑 (gap_fault 포함), CLP/WLD만 이미지에 없음
4. **인스턴스 레벨 조인만 불가** — 공유 키 부재로 이미지와 정형 레코드 직접 연결은 안 되지만, **코드/스키마 레벨 매핑은 성립**
5. **활용 방향**: 이미지는 YOLO 결함 검출 모델 학습/검증, 정형은 프로세스 분석에 각각 활용. 모델 예측 결과(class_id)를 master_defect_type에 매핑하여 두 트랙 결과를 동일 스키마로 통합 가능

---

## 4단계 Phase 1-A 모델링 결과 (2026-04-08)

> 분석 노트북: `model_lgbm_fail_prediction.ipynb` (40 cells, 전체 실행 검증 완료)

### 모델 개요
- **알고리즘**: LightGBM binary classification (`objective='binary'`, `class_weight='balanced'`)
- **Train 기간**: 2023-01-01 ～ 2024-06-30 (2,171,646행, FAIL 4.071%)
- **Test 기간**: 2024-07-01 ～ 2025-01-24 (828,354행, FAIL 4.067%)
- 검증 세트: Test에서 20% 층화 샘플 (early stopping 용)
- 최종 평가 세트: 662,684행
- **시간 기준 분리** 적용 (랜덤 분리 금지 — 미래 leakage 방지)

### 결과 ① 전체 피처 모델 (명세 지시 피처 세트)

| 지표 | 값 |
|---|---|
| Best Threshold | 0.05 |
| Precision | **1.0000** |
| Recall    | **1.0000** |
| F1        | **1.0000** |
| AUC-ROC   | **1.0000** |
| Best Iteration | **1** (single split) |

**SHAP Top 1**: `defect_count` (|SHAP|=0.0996) — 나머지 전 피처 |SHAP|=0.0

> **해석 — Target Leakage 확정**: `defect_detail` 테이블은 정의상 **FAIL 판정 직후에만 생성**되는 데이터이므로 `defect_count / has_critical / has_major / max_rework_min / dominant_defect` 5종은 타겟과 동치인 사후결정 피처다. 모델은 1-split 결정 트리(`defect_count >= 1 → FAIL`)로 수렴하여 나머지 피처를 학습조차 하지 않았다. **실운영 불가능**.

### 결과 ② CLEAN 모델 (Leakage 피처 5종 제거 후 재학습)

**제외 피처**: `defect_count`, `has_critical`, `has_major`, `max_rework_min`, `dominant_defect`

| 지표 | 값 |
|---|---|
| Best Threshold | 0.05 |
| Precision | **0.0482** |
| Recall    | **0.0011** |
| F1        | **0.0022** |
| AUC-ROC   | **0.5558** |
| Best Iteration | 4 |

> **해석**: AUC 0.556 ≈ 거의 랜덤(0.5). 시뮬레이션 데이터의 구조상 **정형 피처만으로는 FAIL 예측이 본질적으로 불가능**함이 확인됨. 이는 2단계 EDA의 "confidence_score, inference_time_sec, ambient_temp_c 등 대부분 피처가 PASS/FAIL 간 차이 없음" 결론과 정합.

### SHAP 피처 중요도 Top 5 (CLEAN 모델)

| 순위 | 피처 | 한글명 | 평균 \|SHAP\| |
|---|---|---|---|
| 1 | `shift_hour` | 교대_시간교차 | **0.0429** |
| 2 | `line_fail_rate` | 라인별불량률 (target encoding) | 0.0022 |
| 3 | `ambient_temp_c` | 주변온도(°C) | 0.0011 |
| 4 | `takt_time_sec` | 택트타임(초) | 0.0010 |
| 5 | `humidity_pct` | 습도(%) | 0.0009 |

> `shift_hour` 가 다른 피처보다 20배 가까이 큰 중요도를 가짐 — 미미한 총 성능 속에서도 **교대 × 시간 조합이 유일한 실질 신호**.

### EDA 인사이트 검증 (CLEAN 모델 기준)

| EDA 인사이트 | 대표 피처 | SHAP rank | Top 5 진입 |
|---|---|---|---|
| C조(야간 22시) 불량률 돌출 | `shift_hour` | **1** | **확인** |
| 교대 시작 직후 불량 급증 | `shift_hour` / `is_shift_start` / `hour` | **1** | **확인** |
| 저습도(<25%) 환경 불량률 상승 | `low_humidity` / `humidity_pct` | **5** | **확인** |

> 2단계 EDA에서 발견한 3대 인사이트가 **전부 CLEAN 모델 SHAP Top 5에 진입** — EDA 분석 신호가 모델 학습에 일관되게 전달됨을 확인.

### 모델링 결론

1. **명세대로 결함 집계 피처를 포함하면 모델은 의미 없는 F1=1.0 을 달성** — defect_detail 은 FAIL 판정 사후에 생성되므로 실시간 예측에 사용 불가.
2. **CLEAN 모델 AUC 0.556** — 시뮬레이션 데이터는 정형 피처만으로는 실질적 예측 불가능한 구조. EDA에서 확인한 것처럼 대부분의 수치형/범주형 피처가 PASS/FAIL 간 거의 동일한 분포를 가진다.
3. **유일한 실질 신호는 `shift_hour`** — EDA에서 발견한 "C조(야간 22시) 6.02%", "교대 시작 직후 불량 급증" 패턴이 모델에서도 지배적 피처로 재확인됨.
4. **실용적 제언**:
   - 본 데이터셋은 **생성형 시뮬레이션의 특성**상 정형 FAIL 예측 모델링의 한계가 명확 → 모델링 과제로 부적합.
   - 대신 **프로세스 모니터링/관리** 관점에서 활용: C조 야간 감독 강화, 교대 시작 30분 집중 모니터링, 저습도 알림 시스템 도입 등 EDA 발견 인사이트가 더 가치 있음.
   - FAIL 예측 모델링이 정말 필요하다면 **이미지 기반 YOLO 결함 검출 모델**(Track A 이미지 데이터)이 유일하게 의미 있는 접근.
5. **리포팅 관점**: 본 실험은 **"데이터의 예측 가능성 한계"를 정량화**한 것 — 클린 모델의 낮은 AUC 자체가 "이 데이터에서는 프로세스 피처로 FAIL 을 예측할 수 없다"는 명확한 결론을 제공.

---

## 5단계 Phase 1-B YOLO 모델링 결과 (2026-04-08)

> **최종 채택 모델**: **YOLOv11s** (`yolo_runs/paintguard_v11s/`)
> 분석 노트북: `model_yolo_v11s_detection.ipynb` (24 cells, 전체 실행 검증 완료)
> 학습 산출물: `yolo_runs/paintguard_v11s/weights/best.pt`, `results.csv`
> Phase 2 입력 파일: `yolo_inference_results.csv` (v11s val 200장 추론 결과, 289행)
>
> 초기 실험(v8n) 결과와 노트북(`model_yolo_defect_detection.ipynb`, `yolo_runs/paintguard_v1/`)도 동일 경로에 영구 보존.

### 교체 배경
- 초기 실험(v8n)은 느슨한 IoU(mAP@0.5) 에서 이미 포화(0.9931)에 도달했지만, **strict IoU(mAP@0.5:0.95)** 에서는 0.8111 로 여유가 있었다.
- 특히 **GAP(Gap불량) 0.5695 / PDR(도장흘림) 0.7408 / CRK(크랙) 0.7765** 3종은 bbox 회귀 정확도가 낮아 리스크 스코어링 품질을 제한.
- 더 큰 모델 용량(9.4M params, v8n 대비 ×3.1)으로 **strict IoU 개선**을 목표로 **YOLOv11s** 재학습 진행.

### 모델 개요 (v11s, 신규 채택)
- **아키텍처**: **YOLOv11s** (small, COCO pretrained 18.4 MB, 9.4M params, 21.6 GFLOPs)
- **학습 데이터**: 800 train / 200 val (이미지 1280×720)
- **클래스 8종**: scratch / dent / paint_bubble / paint_drip / dust / orange_peel / crack / gap_fault
- **GT bbox**: train 1,044 / val 240 (빈 라벨 train 133, val 36)
- **학습 파라미터**: epochs=20 (20 epoch 전부 완주, no early stop), imgsz=640, batch=16, AdamW lr=0.001, patience=8, hsv 증강 + fliplr 0.5 (flipud 금지: 차량 방향 고정), mosaic=1.0
- **환경**: CPU (AMD Ryzen 7 3800XT, torch 2.11+cpu)
- **학습 시간**: **141.2분 (2.35시간)** — v8n 대비 약 +20% (epoch당 ≈ 7.1분)

### 전체 성능 (val 200장) — v11s

| 지표 | v11s (최종) | v8n (초기) | Δ (v11s−v8n) |
|---|---:|---:|---:|
| mAP@0.5 | 0.9875 | 0.9931 | -0.0056 |
| **mAP@0.5:0.95** | **0.8656** | 0.8111 | **+0.0545** |
| Precision | 0.9401 | 0.9628 | -0.0227 |
| Recall | 0.9975 | 0.9889 | +0.0086 |

> **해석**: 느슨한 IoU(mAP@0.5) 는 양 모델 모두 0.99 근처 포화로 차이 미미. 핵심은 **strict IoU(mAP@0.5:0.95) 가 0.811 → 0.866 으로 +6.7% 향상** — bbox 위치/크기의 회귀 정확도가 전반적으로 개선되었고, 리스크 스코어링에 직결되는 지표 개선임. Precision 소폭 하락(-2.3%p) 은 0.0086 더 높아진 Recall 과 상쇄되어 결과적으로 탐지 커버리지가 더 넓어졌다.

### 클래스별 성능 — v11s vs v8n

| class_id | 한글명(코드) | 심각도 | val bbox | v8n mAP@0.5:0.95 | v11s mAP@0.5:0.95 | Δ |
|---|---|---|---:|---:|---:|---:|
| 0 | 스크래치 (SCR) | MINOR | 65 | 0.8739 | **0.9383** | **+0.0644** |
| 1 | 덴트 (DNT) | MAJOR | 48 | 0.9732 | **0.9818** | +0.0086 |
| 2 | 도장기포 (PBB) | MINOR | 31 | 0.8898 | **0.9255** | +0.0357 |
| 3 | **도장흘림 (PDR)** | MINOR | 14 | 0.7408 | **0.8477** | **+0.1069** |
| 4 | 이물질 (DST) | MINOR | 33 | 0.8080 | **0.9000** | +0.0920 |
| 5 | 오렌지필 (ORG) | MINOR | 23 | 0.8573 | **0.9138** | +0.0565 |
| 6 | **크랙 (CRK)** | CRITICAL | 5 | 0.7765 | **0.8931** | **+0.1166** |
| 7 | **Gap불량 (GAP)** | CRITICAL | 21 | 0.5695 | **0.5248** | **-0.0447** |

#### v11s 상세 (P / R / mAP@0.5 / mAP@0.5:0.95)

| 한글명 | P | R | mAP@0.5 | mAP@0.5:0.95 |
|---|---:|---:|---:|---:|
| 스크래치 | 0.9895 | 1.0000 | 0.995 | 0.9383 |
| 덴트 | 0.9865 | 1.0000 | 0.995 | 0.9818 |
| 도장기포 | 0.9828 | 1.0000 | 0.995 | 0.9255 |
| 도장흘림 | 0.9552 | 1.0000 | 0.995 | 0.8477 |
| 이물질 | 0.9667 | 1.0000 | 0.995 | 0.9000 |
| 오렌지필 | 0.9754 | 1.0000 | 0.995 | 0.9138 |
| 크랙 | 0.8903 | 1.0000 | 0.995 | 0.8931 |
| Gap불량 | 0.7742 | 0.9803 | 0.9348 | 0.5248 |

- **최고**: DNT(덴트) — mAP@0.5:0.95=0.9818 (v8n 에서도 최고였으며 소폭 추가 개선)
- **최저**: GAP(Gap불량) — mAP@0.5:0.95=**0.5248** (v8n 0.5695 에서 오히려 악화, -0.0447)
- v8n 에서 취약 3종이었던 **PDR, CRK 는 큰 폭으로 개선**: PDR +10.7%, CRK +11.7% — strict IoU 목표 달성
- 그러나 **GAP 는 역행** — 얇고 길쭉한 bbox 형태의 구조적 한계는 모델 용량 증가만으로 해결되지 않음을 시사. 추가 조치(SIoU loss, focal loss, oversampling) 필요.
- **7/8 클래스 mAP@0.5:0.95 개선** — GAP 악화에도 전체 평균은 +6.7% 상승

### val 추론 결과 (Phase 2 입력 파일) — v11s

- **저장 파일**: `yolo_inference_results.csv` (UTF-8-SIG, **289행 × 16컬럼**, v11s 결과로 **덮어쓰기 완료**)
- **컬럼**: image_file / zone / color / image_id / class_id / class_name / defect_type_code / severity / conf / bbox_x1~y2 / bbox_w_norm / bbox_h_norm / area_norm
- **탐지 성공 이미지**: **162 / 200 장**
- **총 탐지 bbox**: **251개** (val GT 240개 대비 +11, v8n 243개 대비 +8 — 재현율 향상에 따른 탐지 증가)
- **결함 없는 이미지**: 38장은 `class_id=NaN` 더미 행으로 포함 → **val 200장 100% 커버리지** 유지
- **defect_type_code 매핑** 자동 적용 (class_id → SCR/DNT/.../GAP, master_defect_type 와 호환)
- **파일명 파싱**: `{zone}_{color}_{id}.jpg` 패턴 (`pearl_white`, `front_door` 등 다단어 토큰 처리)

### 교차 검증: v11s 탐지 분포 vs 정형 `defect_detail` 분포

#### zone 분포 비교 (이미지 측 BUMPER_F+R, FF+RF 합산)

| zone | v11s 탐지 비율 | 정형 DB 비율 | 차이 | (참고) v8n |
|---|---:|---:|---:|---:|
| **ROCKER** | 16.33% | 8.32% | **+8.01%p** | 14.81% |
| **FF+RF** | 15.94% | 16.65% | -0.71%p | 15.23% |
| BUMPER_F+R | 13.94% | 16.70% | -2.76%p | 14.40% |
| **TRUNK** | 13.15% | 8.35% | **+4.80%p** | 13.58% |
| **HOOD** | 12.75% | 8.29% | **+4.46%p** | 13.17% |
| RD | 10.76% | 8.29% | +2.47%p | 11.11% |
| FD | 8.76% | 8.30% | +0.46%p | 9.05% |
| ROOF | 8.37% | 8.39% | -0.02%p | 8.64% |
| QTR_L | 0.00% | 8.36% | **-8.36%p** | 0.00% |
| QTR_R | 0.00% | 8.35% | **-8.35%p** | 0.00% |

- **이미지 측 누락 구역**: `QTR_L`, `QTR_R` (쿼터패널 좌/우) — v8n 과 동일하게 이미지 촬영본 자체 부재. 정형 DB 의 16.7% 이미지 탐지 불가.
- **분포 패턴**: v11s 는 v8n 과 유사한 쏠림(ROCKER/TRUNK/HOOD 과대)을 보이되 ROCKER 쏠림이 한층 강해짐(+1.5%p) — 학습/val 데이터의 해당 zone 비율 반영.

#### defect_type 분포 비교

| 코드 | 한글 | v11s 비율 | 정형 비율 | 차이 | (참고) v8n |
|---|---|---:|---:|---:|---:|
| SCR | 스크래치 | 25.90% | 24.83% | +1.07%p | 27.57% |
| DNT | 덴트 | 19.12% | 14.97% | +4.15%p | 19.75% |
| DST | 이물질 | 13.55% | 10.03% | +3.52%p | 13.17% |
| PBB | 도장기포 | 12.35% | 12.13% | +0.22%p | 12.76% |
| **GAP** | **Gap불량** | **11.95%** | 7.96% | **+3.99%p** | 9.88% |
| ORG | 오렌지필 | 9.16% | 8.06% | +1.10%p | 9.05% |
| PDR | 도장흘림 | 5.98% | 10.01% | -4.03%p | 5.76% |
| CRK | 크랙 | 1.99% | 4.00% | -2.01%p | 2.06% |
| **CLP** | **클립마크** | **0.00%** | **4.97%** | **-4.97%p** | 0.00% |
| **WLD** | **용접불량** | **0.00%** | **3.03%** | **-3.03%p** | 0.00% |

- **이미지에 없는 결함**: CLP(클립마크), WLD(용접불량) — v8n 과 동일. 정형 DB 의 8% 는 이미지로 탐지 불가 (데이터 자체 부재).
- **GAP 탐지 비율 증가**: v8n 9.88% → v11s 11.95% — strict IoU 는 떨어졌지만 **탐지 자체 빈도는 증가**(더 공격적으로 검출). GAP 탐지 recall 은 향상되나 bbox 정확도는 저하.
- **CRK / PDR**: 여전히 정형 DB 대비 과소 탐지 (각 -2.01%p, -4.03%p) — val 셋에 bbox 수 자체가 적은(14, 5) 한계 유지.

### 초기 실험 (YOLOv8n baseline, 2026-04-08)

> 교체 이전의 v8n 결과. 역사 보존용 스냅샷 — `yolo_runs/paintguard_v1/weights/best.pt`, `model_yolo_defect_detection.ipynb` (38 cells) 로 영구 보존.

**v8n 전체 성능** (val 200장, 17 epoch 에 early stop, 약 2시간)

| 지표 | 값 |
|---|---:|
| mAP@0.5 | 0.9931 |
| mAP@0.5:0.95 | 0.8111 |
| Precision | 0.9628 |
| Recall | 0.9889 |

**v8n 클래스별 성능**

| class_id | 한글명(코드) | 심각도 | val bbox | Precision | Recall | mAP@0.5 | mAP@0.5:0.95 |
|---|---|---|---:|---:|---:|---:|---:|
| 0 | 스크래치 (SCR) | MINOR | 65 | 0.9441 | 1.0000 | 0.9936 | 0.8739 |
| 1 | 덴트 (DNT) | MAJOR | 48 | 0.9876 | 1.0000 | 0.9950 | 0.9732 |
| 2 | 도장기포 (PBB) | MINOR | 31 | 0.9748 | 1.0000 | 0.9950 | 0.8898 |
| 3 | 도장흘림 (PDR) | MINOR | 14 | 0.9575 | 1.0000 | 0.9950 | 0.7408 |
| 4 | 이물질 (DST) | MINOR | 33 | 1.0000 | 0.9810 | 0.9950 | 0.8080 |
| 5 | 오렌지필 (ORG) | MINOR | 23 | 1.0000 | 0.9778 | 0.9950 | 0.8573 |
| 6 | 크랙 (CRK) | CRITICAL | 5 | 0.9023 | 1.0000 | 0.9950 | 0.7765 |
| 7 | Gap불량 (GAP) | CRITICAL | 21 | 0.9358 | 0.9524 | 0.9815 | 0.5695 |

v8n 당시 추론 결과는 280행, 243 탐지(163장)였음 — 현재 `yolo_inference_results.csv` 는 v11s 결과(289행, 251 탐지)로 덮어씌워졌으므로 v8n 분포가 필요하면 `yolo_runs/paintguard_v1/` 에서 재생성 필요.

### 결론

1. **v8n → v11s 교체 성공** — 핵심 지표(**strict mAP@0.5:0.95**) 가 0.8111 → **0.8656** 으로 **+6.7% 향상**. 리스크 스코어링에 직결되는 bbox 정확도 개선 달성.
2. **7/8 클래스 개선** — 특히 v8n 최약점이었던 **PDR +10.7%, CRK +11.7%** 는 strict IoU 기준 0.75 미만 → 0.85+ 로 회복. 얇은 객체(PDR) / 희소 클래스(CRK val 5개) 모두 YOLOv11s 증가된 capacity 와 FPN 개선의 혜택을 받음.
3. **유일한 역행은 GAP(Gap불량) -4.5%p** — 얇고 길쭉한 bbox 는 anchor-free head 에서도 회귀가 어려운 본질적 과제. Recall 은 유지되나 위치 정확도가 하락 → **후속 실험 필요**: SIoU/EIoU loss, GAP 클래스 oversampling, imgsz 확대(640→960).
4. **Phase 1-A 와의 대조 재확인** — 정형 CLEAN 모델 AUC 0.556 vs **v11s strict mAP 0.866** — "FAIL 예측이 필요하면 이미지를 써야 한다" 는 결론이 한층 강화됨 (양 모델 모두 완료 후 비교).
5. **데이터 보강 필요 영역 (v8n 과 동일)**:
   - **누락 zone**: QTR_L / QTR_R (이미지 0장)
   - **누락 결함**: CLP(클립마크) / WLD(용접불량) — 정형 DB 8% 분량
   - **부족 결함**: CRK(크랙) val 5개 / GAP(Gap불량) val 21개
6. **Phase 2 입력 갱신 완료** — `yolo_inference_results.csv` (v11s, 289행 / 251 탐지) 로 덮어쓰기. **6단계 프로파일 매핑 결과는 2026-04-09 에 v11s 기준으로 전 셀 재실행 완료** — 수치는 6단계 섹션 참조 (탐지 243→251, 등급 분포 26/50/75/100 건).
7. **재현성 보장** — v8n 노트북(`model_yolo_defect_detection.ipynb`) / 학습 산출물(`yolo_runs/paintguard_v1/`) 모두 그대로 보존. `model_yolo_v11s_detection.ipynb` 실행 시 최신 v11s 수치가 `_yolo_result_v11s.json` 으로 출력됨.

---

## 6단계 Phase 2 프로파일 매핑 결과 (최초 2026-04-08 / v11s 재실행 2026-04-09)

> 분석 노트북: `model_profile_mapping.ipynb` (35 cells, 전체 실행 검증 완료)
> 산출물: `defect_profile_table.csv`, `_profile_result.json`
> **2026-04-09 갱신**: YOLO 추론 파일이 v8n(243 탐지) → v11s(251 탐지) 로 교체됨에 따라 노트북 전 셀 재실행. 노트북 코드/마크다운 변경 없음. `defect_profile_table.csv` 는 `defect_detail.csv` 기반이라 내용 동일(해시 불변), `_profile_result.json` 과 리스크 등급 집계만 갱신.

### 설계 원칙
- **인스턴스 직접 조인 불가** (이미지/정형 간 공유 키 부재) → **프로파일 레벨 매핑**으로 우회
- 프레이밍: ❌ "이 scratch 는 C조에서 발생했다" → ✅ "이 scratch 와 **유사한 과거 결함**은 주로 C조에서 발생했다"

### 프로파일 테이블 (defect_profile_table.csv)
- **행 수**: **120행** (10 defect_type × 12 zone, 모든 조합 존재)
- **n_samples 범위**: 최소 393 / 중앙값 1,295 / 최대 3,692건 — 모든 셀이 통계적으로 충분한 표본
- **컬럼 18개**: 교대조 분포(A/B/C), peak_hour, shift_start_ratio, 환경(humidity/temp), 재작업, severity, std_rework_time_min 등
- 정형 데이터 170,904건을 `defect_type × zone` 단위로 사전 집계

### 매핑 결과 (v11s 기준)
| 항목 | 값 | (참고) v8n |
|---|---:|---:|
| YOLO 탐지 | **251건** | 243건 |
| explode 후 행 (bumper/fender 1:2) | **326행** | 315행 |
| **매핑 성공률** | **100.0%** (실패 0건) | 100.0% |

> 모든 YOLO 탐지가 프로파일 테이블에 성공적으로 조회됨 — 매핑 누락 케이스 0건.

### 리스크 스코어 (총 100점)
| 항목 | 가중치 | 근거 |
|---|---:|---|
| 심각도 | 40 | CRITICAL 40 / MAJOR 25 / MINOR 10 |
| C조(야간) 발생 비율 | 20 | EDA 인사이트 #1 |
| 저습도 환경 비율 | 15 | EDA 인사이트 #3 |
| 재작업 필요 비율 | 15 | 운영 비용 직결 |
| YOLO 탐지 conf | 10 | 모델 확신도 |

#### 등급 분포 (251건 기준, **사분위수 기반**)

> 고정 임계값(80/60/40)은 시뮬레이션 데이터에서 CRITICAL 0건 문제가 있어
> **분위수 컷오프**(top 10% / 10~30% / 30~60% / bottom 40%)로 변경.
> 임계값은 `risk_per_bbox` 분포에서 동적으로 산출 → 운영 데이터에서도 동일 코드로 동작.

| 등급 | 분위수 구간 | 임계값 | 건수 | 비율 | (참고) v8n 건수 |
|---|---|---:|---:|---:|---:|
| **CRITICAL** | ≥ q90 | ≥ 60.91 | **26건** | 10.4% | 25건 |
| **HIGH**     | q70 ~ q90 | 50.80 ~ 60.91 | **50건** | 19.9% | 48건 |
| **MEDIUM**   | q40 ~ q70 | 25.20 ~ 50.80 | **75건** | 29.9% | 73건 |
| **LOW**      | < q40 | < 25.20 | **100건** | 39.8% | 97건 |

- **평균** 35.10 / **최대** 66.19 / **최소** 20.15 (v8n: 34.80 / 66.15 / 20.38)
- 분포는 **이중 봉우리** — MINOR 결함(severity 10점 + 환경)이 25점 부근, MAJOR/CRITICAL 결함(severity 25/40 + 환경)이 50점 이상에 군집. 사분위수 컷이 두 봉우리를 자연스럽게 분리. v11s 추론의 추가 8 탐지가 고르게 분포되어 등급별 비율은 거의 변동 없이 건수만 비례 증가.

### 핵심 발견
- **리스크 최고 탐지**: `trunk_silver_000878.jpg` — 크랙(CRITICAL) / score **66.19** / **CRITICAL** (q90 컷 진입) — v8n 당시 1위였던 `rear_door_red_000886.jpg`(66.15) 를 미세하게 넘어선 신규 1위
- **C조 발생 비율 최고 조합**: Gap불량 × ROOF (11.56%, n=1,168) — 야간 + 천장면 결함 패턴 (v8n 과 동일, 정형 DB 기반이라 v11s 교체에 영향 없음)
- 절대 점수보다 **상대 순위/분위수 위치**가 운영 의사결정에 더 직접적

### 통합 시연 시나리오 (Phase 3 미리보기)
| 등급 | 샘플 이미지 | 결함 / 구역 | score | 권고 조치 |
|---|---|---|---:|---|
| **CRITICAL** | fender_bronze_000840.jpg | Gap불량 / fender | 61.83 | 즉시 라인 정지 및 전수 재검사 |
| **HIGH**     | rocker_bronze_000952.jpg | 덴트 / rocker | 51.28 | 교대 시작 직후 집중 모니터링 / 습도 25% 이상 유지 |
| **LOW**      | front_door_navy_000818.jpg | 이물질 / front_door | 24.75 | 정기 모니터링 유지 |

### 결론
1. **프로파일 테이블 120행 완전 채움** — 모든 (defect_type, zone) 조합에 표본 393건 이상 확보, lookup 안정성 100%. (해시 불변 — 정형 DB 기반이라 v11s 교체와 무관)
2. **YOLO 251건 → 프로파일 매핑 100% 성공** — bumper/fender 의 1:2 모호성은 양쪽 zone 평균으로 처리. v8n(243) 대비 +8 탐지 전부 매핑 성공.
3. **리스크 스코어로 정형/이미지 두 트랙 통합** — YOLO 탐지(이미지) 와 EDA 인사이트(정형) 가 1건 단위로 결합되어 운영 의사결정 입력으로 사용 가능.
4. **사분위수 등급으로 데이터 분포 적응** — 고정 임계값 대신 q40/q70/q90 컷을 사용해 시뮬레이션/운영 데이터 모두에서 일정한 등급 비율(10/20/30/40%) 보장. **v11s 재실행 시에도 건수만 비례 증가, 비율은 10.4/19.9/29.9/39.8% 로 거의 불변** — 분위수 등급이 분포 변화에 자동 적응함을 실증.
5. **Phase 3 데이터 계층 완성** — `defect_profile_table.csv` + `yolo_inference_results.csv` + 분위수 기반 리스크 함수 → Streamlit 대시보드에서 즉시 사용 가능.
6. **v11s 재실행 결과 요약** (2026-04-09): 탐지 243→251 (+8, +3.3%), 평균 risk 34.80→35.10, 최고 risk 66.15→66.19, 최고 위험 탐지는 `rear_door_red_000886.jpg` → `trunk_silver_000878.jpg` 로 교체. 임계값(q90) 은 60.91 로 불변 — q90 근처의 CRITICAL 경계 분포가 안정적임을 시사.

---

## 7단계 PaintGuard 프로젝트 마무리 (2026-04-09)

- **Phase 1-A / 1-B / Phase 2 전 단계 완료** — 정형 LightGBM (CLEAN AUC 0.556), YOLO v8n → v11s (strict mAP 0.866), 색상 분류 v11s-cls (Top-1 1.0), 프로파일 매핑 (251건 100% 성공) 모두 산출.
- **최종 산출물**: `model_profile_mapping.ipynb` — 맨 끝에 **PaintGuard 프로젝트 총평 셀 4개 추가** (markdown 제목 / 코드 시각화 / markdown 수치표 / markdown 총평). 총 셀 수 36 → **40셀** (24 code → 25 code, 12 md → 15 md). 기존 36셀은 그대로 보존.
- **시각화**: `paintguard_final_summary.png` (2×2 레이아웃, dpi=150, ~211 KB)
  - 좌상: 단계별 완성도 (EDA/1-A/1-B/Phase2 = 100%, Phase3 = 0% 예정)
  - 우상: 모델별 핵심 성능 비교 (LightGBM 0.556 / v8n 0.8111 / v11s 0.8656)
  - 좌하: 리스크 등급 분포 pie (26/50/75/100)
  - 우하: 결함 클래스별 mAP@0.5:0.95 (GAP 0.5248 "개선 필요" 주석)
- **전체 실행 검증 완료** — 40셀 / 에러 0건, `paintguard_final_summary.png` 신규 생성 확인.
- **다음**: MES 생산량/예지보전 파트 완성 후 **Phase 3 통합 대시보드** 로 연결 예정. PaintGuard 는 MES 4개 레이어 중 **공정 + 품질** 파트에 해당.
