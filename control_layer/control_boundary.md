# Safe Control Boundary

## Layers

- dashboard layer: 표시와 사용자 입력만 담당
- backend layer: 파일/데이터 처리
- simulation layer: 가상 계산
- control layer: dry-run 인터페이스
- hardware layer: 현재 미구현, 별도 브랜치 전까지 접근 금지

실제 제어 브랜치 전환 조건: hardware readiness gate가 `READY_FOR_CONTROL_TEST`이고 `real_hardware_enabled`가 명시적으로 true일 때만 검토한다.
