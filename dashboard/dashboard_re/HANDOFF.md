# HANDOFF.md — AWS 인프라 → 대시보드 AI

## 1. 도메인 & 엔드포인트

| 항목 | 값 |
|---|---|
| 메인 도메인 | `https://paintguard.argos-i.com` |
| API Base | `https://paintguard.argos-i.com/api` |
| 프론트 배포 경로 | `/var/www/paintguard` |
| 백엔드 배포 경로 | `/opt/paintguard-api` |

---

## 2. S3

| 항목 | 값 |
|---|---|
| 버킷명 | `project2-argos-i-376715672571-ap-northeast-2-an` |
| 리전 | `ap-northeast-2` |
| 접근 방식 | EC2 IAM Role (키 없음, 코드에 키 포함 금지) |

### S3 폴더 구조

```
s3://project2-argos-i-376715672571-ap-northeast-2-an/
  master/
    model.json              ← 차량 모델 마스터
    color.json              ← 색상 마스터
    plant_line.json         ← 공장/라인 마스터
    defect_process_map.json ← 결함→공정 매핑
  aggregates/
    kpi_daily.json          ← 일별 KPI (agg_plant_daily 기반)
    shift_defect_rate.json  ← 교대조별 불량률
    color_distribution.json ← 색상별 생산 비율
    line_monthly.json       ← 라인별 월간 집계
    env_bins.json           ← 환경 구간별 집계
    oven_status.json        ← 건조로 최신 상태 (최신 500행)
  alerts/
    events.json             ← 이상 이벤트 타임라인 (12,861건)
  snapshots/
    daily/all.json          ← 생산계획 전체 (날짜 컬럼 미탐지로 단일 파일)
  work_orders/
    {YYYY-MM-DD}.json       ← 날짜별 작업지시 (2025-02-01 ~ 2025-12-31)
```

### 주요 JSON 스키마

**master/defect_process_map.json**
```json
{
  "SCR": { "process": "상도", "name_kr": "스크래치" },
  "DNT": { "process": "차체이송/프레스", "name_kr": "덴트" },
  "PDR": { "process": "상도/건조", "name_kr": "미세요철" },
  "RUN": { "process": "상도", "name_kr": "흐름" },
  "ORG": { "process": "상도/건조", "name_kr": "귤껍질" },
  "GAP": { "process": "조립", "name_kr": "단차" },
  "CRK": { "process": "건조", "name_kr": "크랙" },
  "CLP": { "process": "조립", "name_kr": "클립누락" },
  "WLD": { "process": "용접", "name_kr": "용접불량" },
  "OTH": { "process": "기타", "name_kr": "기타" }
}
```

---

## 3. EC2

| 항목 | 값 |
|---|---|
| 퍼블릭 IP | `52.79.165.173` |
| OS | Ubuntu 22.04 (6.8.0-1051-aws) |
| Node.js | v24.14.1 |
| pnpm | 10.4.1 |
| PM2 | 6.0.14 |
| 프론트 배포 경로 | `/var/www/paintguard` |
| 백엔드 배포 경로 | `/opt/paintguard-api` |
| 환경변수 파일 | `/etc/paintguard/.env` |
| PM2 프로세스명 | `paintguard-api` |
| 백엔드 포트 | `3000` |

---

## 4. 환경변수 (/etc/paintguard/.env)

```env
AWS_REGION=ap-northeast-2
DATA_BUCKET_NAME=project2-argos-i-376715672571-ap-northeast-2-an
DEMO_START_SIM=2025-03-15T06:00:00
DEMO_SPEED=60
PORT=3000
NODE_ENV=production
```

---

## 5. Nginx 설정

| 항목 | 값 |
|---|---|
| 설정 파일 | `/etc/nginx/sites-enabled/default` |
| 인증서 | Let's Encrypt (만료: 2026-07-09) |

### 라우팅 규칙

```
/ → /var/www/paintguard (React 정적 파일, SPA 라우팅 지원)
/api → localhost:3000 (Express + tRPC 프록시)
gzip 압축 활성화
HTTP → HTTPS 강제 리다이렉트
```

---

## 6. GitHub Actions

### 배포 방식
- main 브랜치 push → 자동 배포
- pnpm build → rsync → PM2 재시작
- 배포 시 보안 그룹에 러너 IP 동적 추가/제거

### 필요 Secrets (이미 등록됨)

| Secret | 값 |
|---|---|
| `EC2_HOST` | `52.79.165.173` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | .pem 파일 전체 내용 |
| `FRONTEND_PATH` | `/var/www/paintguard` |
| `BACKEND_PATH` | `/opt/paintguard-api` |
| `AWS_ACCESS_KEY_ID` | IAM_kwon 키 |
| `AWS_SECRET_ACCESS_KEY` | IAM_kwon 시크릿 |

---

## 7. 빌드 구조

```
dashboard/dashboard_re/   ← 작업 디렉토리
  client/                 ← React 프론트엔드
  server/                 ← Express + tRPC 백엔드
  shared/                 ← 공용 타입
  package.json            ← 모노레포 루트
```

### 빌드 명령어

```bash
pnpm install --frozen-lockfile
pnpm build
# → dist/public/   (프론트 정적 파일)
# → dist/index.js  (백엔드 번들)
```

---

## 8. 시연 시뮬레이션 기본값

| 항목 | 값 |
|---|---|
| `DEMO_START_SIM` | `2025-03-15T06:00:00` |
| `DEMO_SPEED` | `60` (1분 → 1시간) |
| 폴링 주기 | `5000ms` |

---

## 9. 현재 이슈

- 로그인 화면에서 `localhost:3000`으로 리다이렉트되는 문제 발생
- OAuth 콜백 URL이 프로덕션 도메인으로 설정되지 않은 것으로 추정
- 환경변수 또는 코드에서 `VITE_API_URL` 또는 `redirectUri` 관련 설정 확인 필요

---

## 10. 주의사항

- EC2 RAM 1GB → 프론트 빌드는 반드시 GitHub Actions에서 진행
- S3 GET 프리티어 월 20,000건 → 서버 캐시 필수
- AWS 키를 코드/커밋에 절대 포함 금지 (EC2는 IAM Role로 해결)
- EC2, RDS 미사용 시 반드시 stop (비용 절감)
