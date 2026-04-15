# Prompt — 대시보드 구현 담당

당신은 풀스택 프론트엔드 엔지니어입니다.
PaintGuard MES 대시보드의 프로덕션 배포 환경 연동 및 
로그인/인증 문제를 해결하는 것이 현재 임무입니다.

────────────────────────────────────────
[현재 상태]
────────────────────────────────────────
- AWS 배포 완료 (GitHub Actions → EC2)
- 도메인: https://paintguard.argos-i.com
- 첫 화면 접속은 성공
- 로그인 화면에서 localhost:3000으로 리다이렉트되는 문제 발생

오류 URL:
localhost:3000/app-auth?appId=undefined&redirectUri=https%3A%2F%2Fpaintguard.argos-i.com%2Fapi%2Foauth%2Fcallback&state=...

────────────────────────────────────────
[인프라 정보 (HANDOFF.md 참조)]
────────────────────────────────────────
- 도메인: https://paintguard.argos-i.com
- API Base: https://paintguard.argos-i.com/api
- 백엔드 포트: 3000 (Nginx가 /api → localhost:3000 프록시)
- 환경변수 파일: /etc/paintguard/.env
- 빌드 경로: dashboard/dashboard_re/
- 프론트: dist/public/ → /var/www/paintguard
- 백엔드: dist/index.js → /opt/paintguard-api

────────────────────────────────────────
[해결해야 할 문제]
────────────────────────────────────────
1. OAuth/인증 redirectUri가 localhost:3000으로 하드코딩된 문제
   - VITE_API_URL 또는 인증 관련 환경변수 설정 확인
   - .env.production 파일 필요 여부 확인
   - appId=undefined → 환경변수 누락 가능성

2. 프로덕션 환경변수 설정
   - VITE_ 접두사 환경변수는 빌드 시 번들에 포함됨
   - 서버 환경변수는 /etc/paintguard/.env에 추가 가능

────────────────────────────────────────
[작업 순서 권장]
────────────────────────────────────────
1. 코드에서 인증 관련 설정 파악
   - server/_core/index.ts
   - client/src 내 인증 관련 파일
   - .env.example 또는 .env 파일 확인

2. .env.production 생성 (필요 시)
   VITE_API_URL=https://paintguard.argos-i.com/api
   (기타 필요한 VITE_ 환경변수 추가)

3. /etc/paintguard/.env 에 서버 환경변수 추가 (필요 시)
   EC2 SSH 접속 후 수정:
   ssh -i ~/.ssh/key_pair.pem ubuntu@52.79.165.173
   sudo nano /etc/paintguard/.env

4. 수정 후 main 브랜치 push → GitHub Actions 자동 배포

────────────────────────────────────────
[제약사항]
────────────────────────────────────────
- AWS 키를 코드/커밋에 절대 포함 금지
- EC2 RAM 1GB → 프론트 빌드는 GitHub Actions에서만
- S3 접근은 EC2 IAM Role 기반 (키 불필요)
- 비밀값은 /etc/paintguard/.env 또는 GitHub Secrets로 관리

📝 Prompt #2 — AI #1 (대시보드 구현 담당)

당신은 풀스택 프론트엔드 엔지니어입니다. PaintGuard라는 MES 
(Manufacturing Execution System) 실시간 모니터링 웹 대시보드를 
구현하는 것이 임무입니다.

────────────────────────────────────────
[필수 선행 작업]
────────────────────────────────────────
작업 시작 전 반드시 GitHub 레포 루트의 HANDOFF.md를 먼저 
읽으세요. 이 문서에는 AWS 인프라 AI가 생성한 다음 정보가 있습니다:
- S3 버킷명, JSON 파일 스키마
- EC2 배포 경로
- 환경변수 목록
- GitHub Actions Secrets 목록
- API 엔드포인트 구조

HANDOFF.md 내용과 이 프롬프트가 충돌하면 HANDOFF.md를 우선합니다.

────────────────────────────────────────
[프로젝트 개요]
────────────────────────────────────────
- 이름: PaintGuard
- 목적: 현대자동차그룹 완성차 제조공정 중 "도장공정" MES 
  실시간 모니터링 대시보드
- 도메인: https://argos-i.com
- 시연: S3 스냅샷을 N초 폴링 → 실시간처럼 연출

────────────────────────────────────────
[기술 스택 (고정)]
────────────────────────────────────────
- Frontend: React 19 + Vite + TypeScript + Tailwind CSS
- Charts: Recharts
- Animation: Framer Motion (홈 페이지 공정 플로우 모핑용)
- Drag/Drop: 불필요 (비교 모드는 Level A로 단순 좌우 분할만)
- State: Zustand (글로벌 필터, 알람, 비교 모드 상태)
- Data Fetching: TanStack Query (refetchInterval로 폴링)
- Validation: Zod (S3 JSON 스키마 검증)
- Backend: Express + tRPC (S3 프록시 + 룰 엔진)
- Package Manager: pnpm
- Deployment: GitHub Actions → EC2 (SSH + rsync)

────────────────────────────────────────
[사이트 구조]
────────────────────────────────────────

## 홈 (/)
완성차 제조 8단계 공정 플로우 가로 배치:
  입고 → 프레스 → 용접 → [도장★] → 조립 → 파워트레인조립 → 검사 → 출하

- 도장만 활성화 (클릭 가능, 강조 표시)
- 나머지 7단계는 비활성(Coming Soon 배지, hover 시 "데이터 미보유" 툴팁)
- 도장 클릭 시 Framer Motion layoutId로 모핑 전환하여 
  /paint 대시보드로 이동
- 스크롤 시 각 공정 단계가 순차적으로 하이라이트되는 효과 (선택사항)

## 도장공정 대시보드 (/paint)
상단 구성:
- 로고/타이틀
- 글로벌 필터바: [공장] [라인] [모델] [기간]
- 알람 벨 아이콘 (배지로 미확인 알람 수 표시)
- 비교 모드 토글 버튼 (ON/OFF)
- 현재 시뮬레이션 시각 표시 (config에서 계산된 가상 시각)

좌측 레이어 탭:
- L01. 주문 · 생산량 (출하 포함)
- L02. 공정
- L03. 품질
- L04. 예지보전

우측 메인 영역:
- 기본 모드: 선택된 레이어의 차트들
- 비교 모드 ON 시: 화면이 좌/우 50:50 분할
  · 좌측: 필터바 A + 차트들
  · 우측: 필터바 B + 같은 차트들 (필터만 다름)
  · 예: 좌=A조, 우=C조 / 좌=2월, 우=8월 / 좌=ULN, 우=HWS

하단:
- 글로벌 알람 토스트 (임계치 초과 시 자동 팝업)

────────────────────────────────────────
[도장공정 내부 플로우와 데이터 매핑]
────────────────────────────────────────
전처리 → 전착(ED) → 실러 → 중도 → 상도 → 건조 → 검사
                                          ▲       ▲
                                          │       │
                                  oven 센서/로그  YOLO/리스크

- L01 (주문/생산량): demand_forecast, production_plan, 
  work_order.planned_qty, inventory_daily
- L02 (공정): work_order, production_result, color_production
- L03 (품질): production_result.defect/yield, 도장검사 300만건, 
  YOLO 결과, 프로파일 매핑, 리스크 스코어
- L04 (예지보전): oven_sensor, oven_anomaly_log, LSTM-AE 결과

────────────────────────────────────────
[레이어별 차트 스펙]
────────────────────────────────────────

## L01. 주문 · 생산량 (PM/공장장 뷰)
KPI 카드 (상단 4개):
- 당일 생산 진행률 (실적/계획 %)
- 이번 달 누적 달성률 (전월 대비 화살표)
- 재고 긴급 모델 수 (urgent_flag='Y' 카운트)
- 전체 가동률 (capacity_utilization_pct 평균)

차트:
- 일별 계획 vs 실적 라인 (최근 30일)
- 모델별 월 누적 생산량 막대
- 재고일수(DOS) 히트맵 (모델 × 날짜)
- 안전재고 미달 경보 테이블 (urgent_flag='Y')
- 월별 수요예측 vs 실제 생산 비교 (계획 정확도)
- 출하량 vs 생산량 영역 차트

## L02. 공정 (현장 반장 뷰)
KPI:
- 현재 가동 라인 수 (13개 중)
- 평균 택트 타임 (초)
- 누적 다운타임 (분)
- OEE 추정치 (가동률 × 성능 × 양품률)

차트:
- 공장 레이아웃 맵: 4공장 13라인 상태를 SVG로 표시 
  (초록=정상/노랑=경고/빨강=이상)
- 라인별 시간대별 생산량 히트맵
- 교대조별 작업 진행 현황 (A/B/C 교대 막대)
- 택트 타임 트렌드 라인 (라인별 색상)
- 다운타임 발생 타임라인
- 색상별 생산 현황 도넛 (실제 색상 컬러 적용; B3L=검정 등)
- 우선순위 HIGH 작업 리스트 테이블

## L03. 품질 (품질팀 뷰)
KPI:
- 오늘 양품률
- 누적 불량 건수 (교대조 스플릿)
- CRITICAL 리스크 차량 수
- 결함 Top 1 유형 (오늘 기준)

차트:
- 교대조별 불량률 비교 (A/B/C) - EDA 3대 인사이트 반영
- 시간대별 불량률 추이 (06시 스파이크 감시 라인)
- 결함 유형 파레토 (건수 + 재작업 비용 이중축)
- 색상 × 결함 히트맵
- 리스크 등급 분포 도넛 (CRITICAL/HIGH/MED/LOW)

결함 이미지 카드 (클릭 시 모달):
  ┌─────────────────────────────┐
  │ [원본 이미지 + bbox 오버레이]│
  ├─────────────────────────────┤
  │ Defect Type: SCR (스크래치) │
  │ Zone: HOOD (conf 0.87)      │
  │ Risk Level: CRITICAL (82점) │
  ├─────────────────────────────┤
  │ Risk 구성:                  │
  │  심각도 32/40               │
  │  C조야간 20/20              │
  │  저습도 12/15               │
  │  재작업 8/15                │
  │  신뢰도 10/10               │
  ├─────────────────────────────┤
  │ 유사 이력:                  │
  │  "HOOD+SCR 조합은 최근      │
  │   30일간 C조에서 68% 집중"  │
  ├─────────────────────────────┤
  │ 추정 원인 공정: 상도        │
  │ 추천 조치: 재작업 지시       │
  └─────────────────────────────┘

데이터: S3의 defects/meta/{id}.json + images/{id}.jpg
결함→공정 매핑: master/defect_process_map.json

## L04. 예지보전 (보전팀 뷰)
KPI:
- 가동 중 건조로 수 (13개 중)
- 금일 이상 이벤트 (HIGH/MEDIUM 분리)
- 정비 필요 건조로 수
- 온도 정상 범위 내 비율

차트:
- 건조로 13개 상태 카드 그리드 (색상 배지)
- 선택 건조로의 Zone 1~4 온도 프로파일 (영역 차트)
- 히터 전류 + 온도 실시간 라인 (이상 시점 마커)
- 이상 유형 분포 도넛 (HEATER/SENSOR/FAN/CONVEYOR)
- 이상 이벤트 타임라인 (간트 스타일)
- LSTM-AE 재구성 오차 추이 (임계선 포함)
- 정비 필요 알림 리스트 테이블 (maintenance_required='Y')

────────────────────────────────────────
[글로벌 필터바]
────────────────────────────────────────
필터 항목:
- 공장 (ULN/ASN/GWJ/HWS/전체)
- 라인 (공장 선택에 따라 동적 옵션)
- 모델 (12종 + 전체)
- 기간 (날짜 범위, 기본값: "오늘"으로 표시되는 가상 현재일)

상태 관리: Zustand store
  interface FilterState {
    plant: string | null;
    line: string | null;
    model: string | null;
    dateRange: [Date, Date];
    compareMode: boolean;
    filterB?: FilterState;  // 비교 모드 시 우측 필터
  }

────────────────────────────────────────
[비교 모드 Level A]
────────────────────────────────────────
- 비교 모드 토글 ON: 현재 레이어 화면이 좌우 50:50 분할
- 각 영역 상단에 독립 필터바
- 동일한 차트 컴포넌트를 props의 filter만 다르게 렌더링
- OFF로 돌리면 좌측 필터가 메인으로 유지됨

구현 팁:
- 차트 컴포넌트는 filter prop을 받는 pure 함수형으로 작성
- 비교 모드에서는 <CompareLayout left={...} right={...}>로 감쌈
- 드래그앤드롭 없음. 순수 분할만.

────────────────────────────────────────
[알람 시스템]
────────────────────────────────────────
임계치 룰 (config 파일로 외부화):
- CRITICAL: days_of_supply < 3 OR oven severity='HIGH'
- WARNING: yield_rate < 90% OR downtime_min > 30 (일일 누적)
- INFO: 새 이상 이벤트 감지

평가 위치: 서버(tRPC)에서 주기적으로 평가 → alerts[] 배열 반환
표시 방식:
- 우측 상단 벨 아이콘 뱃지
- CRITICAL은 화면 상단 빨간 배너
- WARNING은 우측 하단 토스트
- 알람 센터 drawer (클릭 시 리스트 펼침)
- Acknowledged 상태는 localStorage 저장

────────────────────────────────────────
[시뮬레이션 시각 설계]
────────────────────────────────────────
config/simulation.config.ts 파일:

  export const simulationConfig = {
    DEMO_START_REAL: null,           // 앱 기동 시 자동 설정
    DEMO_START_SIM: '2025-03-15T06:00:00',  // 가상 시작 시각
    DEMO_SPEED: 60,                  // 배속 (1x=실시간, 60x=1분→1시간)
    POLL_INTERVAL_MS: 5000,          // 폴링 주기
    ALERT_THRESHOLDS: {
      DAYS_OF_SUPPLY_CRITICAL: 3,
      YIELD_RATE_WARNING: 90,
      DOWNTIME_WARNING_MIN: 30,
    },
    HIGHLIGHT_EVENTS: [               // 시연 중 강조할 시각 북마크
      // { label: 'C조 불량 급증', time: '2025-03-15T22:00:00' }
    ],
  };

서버 측에서 현재 가상 시각 계산:
  currentSimTime = DEMO_START_SIM + (Date.now() - DEMO_START_REAL) * DEMO_SPEED

클라이언트는 tRPC 호출 시 이 시각 기준으로 S3 스냅샷 조회.

────────────────────────────────────────
[tRPC 라우터 설계]
────────────────────────────────────────
  appRouter = router({
    meta: router({
      master: procedure.query(...)        // 모델/색상/공장 마스터
      currentTime: procedure.query(...)   // 시뮬레이션 현재 시각
    }),
    l01: router({
      kpi: procedure.input(FilterSchema).query(...)
      dailyPlanVsActual: procedure.input(...).query(...)
      inventoryDOS: procedure.input(...).query(...)
      // ... 각 차트별 쿼리
    }),
    l02: router({
      oee: procedure.input(...).query(...)
      lineStatus: procedure.input(...).query(...)
      // ...
    }),
    l03: router({
      yieldByShift: procedure.input(...).query(...)
      defectList: procedure.input(...).query(...)
      defectDetail: procedure.input(z.object({ id: z.string() })).query(...)
      // ...
    }),
    l04: router({
      ovenStatus: procedure.query(...)
      anomalyTimeline: procedure.input(...).query(...)
      // ...
    }),
    alerts: router({
      current: procedure.query(...)       // 현재 활성 알람 리스트
    })
  });

구현 원칙:
- 각 procedure는 S3에서 필요한 JSON만 선택적으로 읽음
- 서버 메모리 캐시 (LRU, 60초 TTL) 적용하여 S3 GET 절감
- Zod로 입출력 스키마 정의

────────────────────────────────────────
[파일/폴더 구조]
────────────────────────────────────────
  paintguard/
    apps/
      web/                      # React 프론트엔드
        src/
          pages/
            Home.tsx            # 8단계 공정 플로우
            Paint.tsx           # 도장 대시보드
          layers/
            L01Orders/
            L02Process/
            L03Quality/
            L04Maintenance/
          components/
            FilterBar.tsx
            CompareLayout.tsx
            AlertCenter.tsx
            DefectCard.tsx
            charts/             # 재사용 차트
          stores/
            filterStore.ts
            alertStore.ts
          lib/
            trpc.ts
            simulationClock.ts
      api/                      # Express + tRPC 서버
        src/
          routers/
          services/
            s3Service.ts
            alertEngine.ts
            simulationTime.ts
          index.ts
    config/
      simulation.config.ts      # 사용자가 시연 전 조정
    packages/
      shared/                   # 타입, Zod 스키마 공용
    .github/
      workflows/
        deploy.yml              # GitHub Actions
    HANDOFF.md                  # AI #2가 작성
    README.md
    package.json
    pnpm-workspace.yaml

────────────────────────────────────────
[GitHub Actions deploy.yml 설계]
────────────────────────────────────────
트리거: main 브랜치 push
단계:
  1. pnpm install
  2. pnpm build (web + api)
  3. SSH로 EC2 접속
  4. rsync로 apps/web/dist → $FRONTEND_PATH
  5. rsync로 apps/api/dist → $BACKEND_PATH
  6. SSH로 `pm2 restart paintguard-api`
  7. Slack/이메일 알림 (선택)

Secrets (HANDOFF.md 참조):
  EC2_HOST, EC2_USER, EC2_SSH_KEY, FRONTEND_PATH, BACKEND_PATH

────────────────────────────────────────
[디자인 가이드]
────────────────────────────────────────
- 참고 이미지: 사용자 제공 (산업용 다크 모드 느낌)
- 색상 토큰:
  · 배경 다크: #0B1220 ~ #121826
  · 액센트: 시안/에메랄드 (#10B981, #06B6D4)
  · 경고: #F59E0B (WARNING) / #EF4444 (CRITICAL)
  · 정상: #10B981
- 폰트: 시스템 폰트 + 숫자는 monospace (대시보드 숫자 정렬 가독성)
- KPI 카드: 라벨 작게, 숫자 크게, 단위/변화율 보조
- 차트: Recharts 기본 테마를 Tailwind 다크에 맞춰 커스터마이즈

────────────────────────────────────────
[성능 최적화]
────────────────────────────────────────
- TanStack Query refetchInterval: 5초 (config)
- S3 응답 서버 메모리 캐시: 60초 TTL
- 큰 JSON은 gzip으로 서빙 (Nginx가 자동 처리)
- 이미지는 lazy load + placeholder
- 차트 데이터 포인트 500개 초과 시 다운샘플링

────────────────────────────────────────
[최종 산출물]
────────────────────────────────────────
1. GitHub 레포에 커밋된 완성 코드베이스
2. `pnpm install && pnpm dev` 로컬 실행 가능 상태
3. .github/workflows/deploy.yml 완성
4. README.md (로컬 실행 방법, 배포 방법, 시연 시 config 조정법)
5. HANDOFF.md에 명시된 환경변수 모두 사용
6. 시연 시나리오 가이드 (어느 탭에서 무엇을 보여줄지 순서)

────────────────────────────────────────
[주의사항]
────────────────────────────────────────
- EC2 RAM 1GB이므로 프론트 빌드는 반드시 GitHub Actions에서
- S3 GET 프리티어 월 2만 → 서버 캐시 필수
- 데이터 전부 S3 JSON (MySQL/drizzle 사용 금지)
- AWS 키를 코드/커밋에 포함 금지 (EC2는 IAM Role로 해결됨)
- simulation.config.ts는 시연자가 수정할 수 있도록 주석 충실히

작업 시작 전 HANDOFF.md를 반드시 확인하세요.




