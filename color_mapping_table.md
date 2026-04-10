# 색상 매핑 테이블
> 작성일: 2026-04-08
> 이미지 파일명 color → master_color color_code 매핑

---

## 매핑 확정 방법

| 방법 | 적용 색상 |
|---|---|
| 색상명 직접 대응 | black, pearl_white, red, silver, bronze |
| inspection_master 사용 빈도 기반 | white, gray |
| 이미지 육안 확인 | blue, navy |
| 동료 제보 (실제 색상명) | green(미라지그린), bronze(실키브론즈) |

---

## 최종 매핑 테이블

| 이미지 color | color_code | color_name | 매핑 유형 | 비고 |
|---|---|---|---|---|
| black | B3L | 아비스블랙 | 1:N | 블랙 계열 |
| black | ABP | 오로라블랙펄 | 1:N | 블랙 계열 |
| white | P2W | 퓨어화이트 | 1:N | 화이트 계열, 빈도 1위(18.0%) |
| white | YW6 | 문라이트클라우드 | 1:N | 화이트 계열, 빈도 2위(8.01%) |
| pearl_white | SWP | 스노우화이트펄 | 1:1 | |
| silver | SSS | 스타더스트실버 | 1:1 | |
| red | R4M | 플레임레드 | 1:1 | |
| bronze | W8Y | 실키브론즈 | 1:1 | 기존 None → 수정 |
| gray | N5M | 나이트섀도우그레이 | 1:N | 그레이 계열, 빈도 1위(8.01%) |
| gray | TW3 | 티타늄그레이 | 1:N | 그레이 계열, 빈도 2위(4.01%) |
| gray | C5G | 사이버그레이메탈릭 | 1:N | 그레이 계열, 빈도 3위(2.00%) |
| blue | V5P | 딥씨블루 | 1:1 | 육안 확인: 선명한 코발트블루 |
| navy | K3B | 그라비티블루 | 1:1 | 육안 확인: 어두운 네이비 |
| green | U3G | 마그네틱포스(미라지그린) | 1:1 | 기존 None → 수정 |

---

## master_color 미매핑 항목

| color_code | color_name | 비고 |
|---|---|---|
| WC9 | 애틀라스화이트 | 화이트 계열이나 이미지에 별도 없음 |
| C5G | 커스타드옐로우 → 사이버그레이메탈릭 | gray 계열로 처리 |
| U3G | 마그네틱포스 → 미라지그린 | green으로 처리 |

---

## range_join 코드용 딕셔너리

```python
# 1:1 매핑 (단일 코드)
color_to_code = {
    'pearl_white': 'SWP',
    'silver':      'SSS',
    'red':         'R4M',
    'bronze':      'W8Y',
    'blue':        'V5P',
    'navy':        'K3B',
    'green':       'U3G',
}

# 1:N 매핑 (계열 전체 포함)
color_to_codes = {
    'black': ['B3L', 'ABP'],
    'white': ['P2W', 'YW6'],
    'gray':  ['N5M', 'TW3', 'C5G'],
}
```

---

## 기존 코드 오류 이력

| 이미지 color | 기존 코드 | 실제 의미 | 수정 코드 |
|---|---|---|---|
| silver | SWP | 스노우화이트펄 (화이트!) | SSS |
| blue | ABP | 오로라블랙펄 (블랙!) | V5P |
| gray | YW6 | 문라이트클라우드 (화이트 계열!) | N5M, TW3, C5G |
| bronze | None | 매핑 불가 처리 | W8Y |
| green | None | 매핑 불가 처리 | U3G |
