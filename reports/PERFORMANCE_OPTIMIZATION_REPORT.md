# Nutronics Web Performance Optimization Report

## 1. 수정한 파일 목록

- `index.html`: 발표 첫 화면 중심 구조로 재배치, PPT AI 파트 24~28 내용을 웹 섹션으로 통합, 이미지 width/height/loading/decoding 적용.
- `styles.css`: 경량 CSS로 재작성, 레이아웃 안정화, 카드/증빙 섹션/반응형 처리.
- `app.js`: 무거운 기존 장문 시뮬레이터를 발표용 핵심 로직으로 축소, 가로 캡슐 토출 캔버스, PASS/FAIL, CSV/JSON/PNG 저장 유지.
- `package.json`: 요청된 npm scripts와 성능 관련 devDependencies 명시.
- `vite.config.mjs`: Vite, gzip/Brotli, bundle visualizer, PWA 선택 적용 구조 준비.
- `lighthouserc.json`: LCP 2.5초, CLS 0.1, TBT 200ms, Performance 90+ 기준 작성.
- `scripts/optimize-images.py`: PPT/AI 증빙 이미지를 WebP로 변환.
- `scripts/build-static.mjs`: npm 없는 환경에서도 dist, gzip, Brotli, bundle-report.html 생성.
- `scripts/perf-check.mjs`: dist 파일 크기, 이미지 크기, lazy/dimension/compression 체크.

## 2. 설치한 패키지 목록

현재 Codex 런타임에는 `npm/npx/pnpm/yarn`이 없어 실제 패키지 설치는 수행하지 못했습니다. 대신 `package.json`에 아래 설치 대상과 scripts를 준비했습니다.

- `vite`
- `vite-plugin-compression`
- `rollup-plugin-visualizer`
- `@lhci/cli`
- `vite-plugin-pwa`
- `sharp`

회사 PC에서는 `npm install` 후 `npm run build && npm run lhci`를 실행하면 됩니다.

## 3. 제거한 병목 요소

- 기존 장문 입력/시뮬레이션 JS를 발표용 핵심 로직으로 축소.
- 외부 CDN, 외부 폰트, 무거운 3D/애니메이션 라이브러리 미사용.
- 대용량 PNG/JPG를 dist에서 제거하고 WebP만 사용.
- 첫 화면은 캔버스 기반 경량 시뮬레이션과 텍스트 UI만 로드.
- AI 대시보드/Project OS/제품 렌더 이미지는 below-the-fold lazy loading 처리.
- gzip/Brotli 압축 파일 생성.

## 4. Lighthouse 결과

이 런타임에는 npm 기반 Lighthouse CI 실행 도구가 없어 실제 Lighthouse 점수는 실행하지 못했습니다. 대신 `lighthouserc.json`과 `npm run lhci` 스크립트를 준비했고, 로컬 fallback 성능 체크는 모두 통과했습니다.

Fallback 체크:

- dist 생성: pass
- app.js 100KB 이하: pass
- 이미지 500KB 이하: pass
- 이미지 width/height 명시: pass
- lazy loading 적용: pass
- gzip/Brotli 산출물 존재: pass

## 5. 번들 분석 결과

- `dist/app.js`: 9.3KB
- `dist/styles.css`: 4.9KB
- `dist/index.html`: 9.1KB
- `assets/ai-dashboard.webp`: 50.6KB
- `assets/project-os.webp`: 65.0KB
- `assets/product-render.webp`: 72.7KB
- `dist/bundle-report.html`: 생성 완료
- 전체 배포 ZIP: 약 589KB

## 6. 발표 슬라이드용 한 문단 요약

Nutronics 발표용 웹 시뮬레이터는 외부 CDN과 무거운 라이브러리를 제거한 정적 웹 구조로 최적화했으며, 첫 화면 JS를 9.3KB 수준으로 줄였습니다. AI 파이프라인, 검증 하네스, GitHub 증빙, Project OS 이미지는 WebP로 변환하고 lazy loading 및 명시적 width/height를 적용해 CLS와 초기 로딩 부담을 줄였습니다. dist 빌드, gzip/Brotli 압축, bundle-report.html, lighthouserc.json을 포함해 발표장 네트워크가 불안정해도 빠르게 열리는 오프라인 친화 구조로 정리했습니다.
