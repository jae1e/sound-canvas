#!/usr/bin/env bash
set -euo pipefail
GITHUB=0
if [[ "${1:-}" == "--github" ]]; then GITHUB=1; shift; fi
NOTES="${1:-Voice Coach build}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
SERVER_DIR="$REPO_DIR/services/field-log-server"
VERSION_NAME="0.2.0"
DRAFT_RELEASE="untagged-b7add92e51efdd982ca9"
NOW=$(date -u +%s); EPOCH=$(date -u -d '2026-01-01T00:00:00Z' +%s)
export FVL_VERSION_CODE=$(((NOW-EPOCH)/60))
SHA=$(git -C "$REPO_DIR" rev-parse --short HEAD)
if [[ -n "$(git -C "$REPO_DIR" status --porcelain)" ]]; then SHA="$SHA-dirty"; fi
export FVL_GIT_SHA="$SHA"
cd "$APP_DIR"; pnpm -s check
flock /home/jaeil/.cache/fvl-heavy.lock systemd-run --user --scope -q -p MemoryMax=10G -p MemorySwapMax=0 bash -c "cd '$APP_DIR' && npx expo prebuild --clean --platform android && source /home/jaeil/dev/sound-canvas/scripts/android-env.sh && cd '$APP_DIR/android' && ./gradlew --no-daemon :app:assembleRelease"
APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK" ]]
cd "$SERVER_DIR"
uv run --no-sync fls publish-apk "$APK" --version-code "$FVL_VERSION_CODE" --version-name "$VERSION_NAME" --git-sha "$FVL_GIT_SHA" --notes "$NOTES"
if [[ "$GITHUB" == 1 ]]; then
  TMP_DIR=$(mktemp -d); NAMED="$TMP_DIR/voice-coach-$FVL_VERSION_CODE-$FVL_GIT_SHA.apk"
  cp "$APK" "$NAMED"
  gh release upload "$DRAFT_RELEASE" "$NAMED" -R jae1e/sound-canvas --clobber
  rm -rf "$TMP_DIR"
fi
