# Web Final QC Report

## 목적

`PROJECT_DASHBOARD` 웹개발 다음 단계로, 현재 저장소는 고품질 관제형 웹 완성품이 아니라 다른 컴퓨터에서 총괄 작업을 이어가기 위한 정적 웹 하네스와 파이프라인 초안이다.

## 구현한 웹 화면

- `index.html`: Dashboard V2 관제형 시뮬레이터 진입점
- `admin.html`: 팀원 입력/수정 및 공유 JSON 내보내기 화면
- `demo.html`: 교수 시연용 Demo Mode 화면

## 팀원 공유 기능

- 팀원 이름, 담당 영역, 항목명, 상태, 목표값, 측정값, 공유 메모 입력
- 브라우저 localStorage 저장
- `team-admin-records.json` 내보내기
- 실제 계정, 서버, 데이터베이스 연동 없음

## 오차 검수 기능

- `scripts/measurement-error.js`에서 목표값/측정값 기반 오차율 계산
- 등급: 양호, 검토, 위험, 즉시 수정, 입력 오류
- 실제 테스트 전 PASS 처리 없음

## Demo Mode 구성

- `hardware-mock.js` 기반 mock motor event
- mock sensor reading
- 아침/점심/저녁 복용 선택 시연
- 화면 문구는 `DEMO ONLY`, `검증 필요` 기준
- 실제 GPIO, 모터, 센서 제어 없음

## 금지 조건 확인

- 실제 GPIO 제어 금지: 준수
- 실제 모터 제어 금지: 준수
- 실제 센서 제어 금지: 준수
- 실제 테스트 전 PASS 처리 금지: 준수
- 성공률을 실제 결과처럼 표현 금지: 준수, 시뮬레이션/추정/DEMO로 표현
- Flask/FastAPI 필수 아님: 정적 웹으로 유지

## 남은 검증 필요 항목

- 실제 알약 치수 입력 후 반복 시뮬레이션 값 검토
- 팀원별 실제 측정값 누적
- 9인치 터치스크린 해상도에서 버튼 크기 확인
- Chrome/Safari 파일 열기 기준 JSON/PNG 다운로드 확인
- GitHub Pages 배포 후 상대 경로 확인
- 실제 하드웨어 테스트 전 전원/GND/센서 브래킷 검수

## 즉시 수정 필요 TOP 5

1. 실제 치수 입력값이 없으면 예시값과 실측값이 혼동될 수 있으므로 입력 출처 표시가 필요하다.
2. 확률식 계수는 실물 테스트 전 임시값이므로 보고서에는 추정 모델로 명확히 표현해야 한다.
3. Admin 기록은 localStorage 기반이므로 팀원 간 자동 동기화가 되지 않는다.
4. Demo Mode는 시연 전용이므로 실제 성공률이나 제품 완성 판단으로 쓰면 안 된다.
5. 모바일/9인치 화면에서 스크롤 길이가 길어 발표용 캡처 구간을 미리 정해야 한다.

## 다음 Codex 작업 추천

1. `admin.html` 기록을 Dashboard V2의 결과 패널과 연동한다.
2. `scripts/measurement-error.js`를 검수 스크립트에서 샘플 데이터로 테스트한다.
3. 9인치 터치스크린 기준 시연용 CSS 모드를 추가한다.
4. GitHub Pages 배포 후 `admin.html`, `demo.html` 링크를 확인한다.
5. 실제 테스트 데이터 CSV를 읽어 확률식 보정값으로 변환하는 도구를 추가한다.
