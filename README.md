# Nutronics Presentation Website

4명이 역할을 나누어 설계·제작·테스트한 스마트 영양제 디스펜서 팀 프로젝트의 발표용 웹사이트입니다.
메인 페이지는 프로젝트 배경, 팀 역할, 구조 설명, 제작 증빙, 기술 구조를 한 번에 보여주고, 시뮬레이터 페이지는 약 한 알이 약통에서 컵으로 떨어지는 흐름을 발표 중 바로 이해할 수 있게 보여줍니다.

## 프로젝트 개요

- 프로젝트명: Nutronics Smart Supplement Dispenser
- 핵심 메시지: 단순 알림이 아니라 실제 캡슐 배출까지 연결하는 스마트 디스펜서
- 구조 키워드: 3단 디스크 구조, 사선 램프, 가로 원통형 토출구
- 발표 목적: 실제 제작 과정을 증빙하고, 4인 역할 분담이 드러나는 팀 프로젝트 발표 경험 제공

## 4인 역할 구조

- Team Member 01 / 기구 설계
  - 3단 디스크 구조 설계
  - 사선 램프와 캡슐 포켓 설계
  - 가로 토출구 및 SolidWorks 모델링
- Team Member 02 / 회로·전원
  - 모터 구동 채널 연결
  - 전원 분배 및 퓨즈 보호 구성
  - 감지부·구동부 배선 정리
- Team Member 03 / 제어·DB
  - 복용 스케줄 및 순차 배출 로직
  - 상태 기록과 오류 처리 흐름
  - 걸림 감지 및 재시도 처리
- Team Member 04 / 웹·문서·발표
  - 발표용 웹사이트 제작
  - 시뮬레이터 구현
  - 시각자료, 발표 흐름, 증빙 정리

## 주요 기능

- 메인 페이지
  - 4인 팀 프로젝트 메시지가 바로 드러나는 Hero 구성
  - 문제 정의, 솔루션 구조, 제작 증빙, 타임라인, 기술 구조, 향후 고도화 방향 정리
  - 실제 작업 사진, 회로도, UI 화면, 테스트 장면 활용
- 시뮬레이터
  - 실제 프로토타입 사진 기반 배출 흐름
  - 약통, 한 알 선택, 아래 통로, 컵 도착 4단계 표시
  - 자동 재생과 다시보기 버튼
  - 발표자가 설명하지 않아도 흐름이 보이는 영상형 쇼케이스

## 로컬 실행 방법

정적 웹사이트이므로 간단한 로컬 서버로 바로 실행할 수 있습니다.

```bash
python3 -m http.server 4173
```

브라우저에서 다음 주소를 엽니다.

- 메인 페이지: `http://localhost:4173/`
- 발표 사이트 직접 경로: `http://localhost:4173/website/index.html`
- 시뮬레이터: `http://localhost:4173/website/simulator.html`

## GitHub Pages 배포 URL

- 메인 페이지: [https://estona815.github.io/smart-pill-sim-website/](https://estona815.github.io/smart-pill-sim-website/)
- 시뮬레이터: [https://estona815.github.io/smart-pill-sim-website/website/simulator.html](https://estona815.github.io/smart-pill-sim-website/website/simulator.html)

## 저장소 구조

```text
index.html
assets/
app.js
styles.css
website/
  index.html
  simulator.html
  styles.css
  simulator.css
  script.js
  simulator.js
  assets/
scripts/
dist/
```

- `index.html`: GitHub Pages 루트 진입 파일
- `assets/`, `app.js`, `styles.css`: 루트 랜딩 페이지 및 정적 자산
- `website/`: 발표용 웹사이트와 시뮬레이터
- `website/assets/`: 렌더, 회로도, 테스트 사진, QR 코드, 컨셉 이미지
- `scripts/`, `dist/`: 배포 및 빌드 관련 보조 파일

## 향후 개선점

- 다양한 캡슐 크기에 대응하는 포켓 규격 보정
- 걸림 감지 정교화와 예외 처리 강화
- 실제 감지 피드백 포인트 확장
- 모바일 연동 및 원격 상태 확인
- 케이스 내구성과 외관 통합 개선

## 참고

이번 리디자인 작업의 중심은 `website/` 아래 발표 사이트와 시뮬레이터입니다.
공개 URL 유지와 GitHub Pages 상대경로 호환을 위해 루트 `index.html`과 `website/` 경로를 함께 유지합니다.
