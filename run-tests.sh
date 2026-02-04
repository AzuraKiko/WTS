#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_NAME="${NODE_ENV:-}"
PROJECT_NAME=""
GREP_PATTERN=""
WORKERS=""
REPORTER="html"
OPEN_REPORT="true"
HEADED="false"
UI_MODE="false"
LIST_ONLY="false"
SUITE_NAME=""
TEST_PATHS=()
OCR_PID=""
ENABLE_OCR="false"

print_help() {
  cat <<'EOF'
Chạy Playwright tests nhanh gọn, có báo cáo.

Usage:
  ./run-tests.sh [options] [test_path...]

Options:
  -a, --all                 Chạy tất cả tests (mặc định)
  -t, --test <path>          Chạy file/thư mục test (lặp lại được)
  -g, --grep <pattern>       Lọc test theo tiêu đề
  -p, --project <name>       Chỉ chạy project (Chrome/Firefox/Edge)
  -e, --env <dev|uat|prod>   Set NODE_ENV
  -w, --workers <n>          Override số workers
  -s, --suite <api|ui>       Chạy theo suite tests/api hoặc tests/ui
      --api                  Chạy tests/api
      --ui-tests             Chạy tests/ui
  -r, --reporter <name>      html | allure | <custom>
      --open-report          Mở báo cáo sau khi chạy (html/allure)
      --no-ocr               Không khởi động OCR service
      --headed               Chạy ở chế độ có UI trình duyệt
      --ui                   Chạy Playwright UI mode
      --list                 Liệt kê tests sẽ chạy (không execute)
  -h, --help                 Hiển thị trợ giúp

Examples:
  ./run-tests.sh
  ./run-tests.sh -p Chrome -g "login"
  ./run-tests.sh -t tests/ui/5.\ asset.spec.ts
  ./run-tests.sh tests/api/login.spec.ts tests/ui/1.\ priceBoard.spec.ts
  ./run-tests.sh --api
  ./run-tests.sh --ui-tests
  ./run-tests.sh -r allure --open-report
  ./run-tests.sh --api
  ./run-tests.sh --ui-tests
  hoặc ./run-tests.sh -s api hoặc ./run-tests.sh -s ui
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--all)
      shift
      ;;
    -t|--test)
      TEST_PATHS+=("$2")
      shift 2
      ;;
    -g|--grep)
      GREP_PATTERN="$2"
      shift 2
      ;;
    -p|--project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    -e|--env)
      ENV_NAME="$2"
      shift 2
      ;;
    -w|--workers)
      WORKERS="$2"
      shift 2
      ;;
    -s|--suite)
      SUITE_NAME="$2"
      shift 2
      ;;
    --api)
      SUITE_NAME="api"
      shift
      ;;
    --ui-tests)
      SUITE_NAME="ui"
      shift
      ;;
    -r|--reporter)
      REPORTER="$2"
      shift 2
      ;;
    --open-report)
      OPEN_REPORT="true"
      shift
      ;;
    --no-ocr)
      ENABLE_OCR="false"
      shift
      ;;
    --headed)
      HEADED="true"
      shift
      ;;
    --ui)
      UI_MODE="true"
      shift
      ;;
    --list)
      LIST_ONLY="true"
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        TEST_PATHS+=("$1")
        shift
      done
      ;;
    *)
      TEST_PATHS+=("$1")
      shift
      ;;
  esac
done

start_ocr_service() {
  local ocr_health_url="http://localhost:8000/health"

  if curl --silent --fail "$ocr_health_url" >/dev/null; then
    return 0
  fi

  echo "Starting OCR service at http://localhost:8000"
  npm run ocr:build
  npm run ocr:start &
  OCR_PID="$!"

  for _ in {1..20}; do
    if curl --silent --fail "$ocr_health_url" >/dev/null; then
      echo "OCR service is up"
      return 0
    fi
    sleep 0.5
  done

  echo "OCR service failed to start after 10s"
  return 1
}

cleanup() {
  if [[ -n "$OCR_PID" ]]; then
    kill "$OCR_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ "$LIST_ONLY" != "true" ]]; then
  rm -rf "$ROOT_DIR/playwright-report" "$ROOT_DIR/test-results" "$ROOT_DIR/allure-results"
  rm -rf "$ROOT_DIR"/test-results-*
fi

CMD=(npx playwright test)

if [[ -n "$PROJECT_NAME" ]]; then
  CMD+=(--project="$PROJECT_NAME")
fi

if [[ -n "$GREP_PATTERN" ]]; then
  CMD+=(--grep "$GREP_PATTERN")
fi

if [[ -n "$WORKERS" ]]; then
  CMD+=(--workers "$WORKERS")
fi

if [[ "$HEADED" == "true" ]]; then
  CMD+=(--headed)
fi

if [[ "$UI_MODE" == "true" ]]; then
  CMD+=(--ui)
fi

if [[ "$LIST_ONLY" == "true" ]]; then
  CMD+=(--list)
fi

if [[ -n "$REPORTER" ]]; then
  CMD+=(--reporter "$REPORTER")
fi

if [[ "$SUITE_NAME" == "api" ]]; then
  TEST_PATHS+=("tests/api")
elif [[ "$SUITE_NAME" == "ui" ]]; then
  TEST_PATHS+=("tests/ui")
fi

if [[ ${#TEST_PATHS[@]} -gt 0 ]]; then
  CMD+=("${TEST_PATHS[@]}")
fi

if [[ "$LIST_ONLY" != "true" && "$ENABLE_OCR" == "true" ]]; then
  start_ocr_service
fi

if [[ -n "$ENV_NAME" ]]; then
  NODE_ENV="$ENV_NAME" "${CMD[@]}"
else
  "${CMD[@]}"
fi

if [[ "$OPEN_REPORT" == "true" ]]; then
  if [[ "$REPORTER" == "allure" || "$REPORTER" == "allure-playwright" ]]; then
    npx allure serve allure-results
  else
    npx playwright show-report
  fi
fi
