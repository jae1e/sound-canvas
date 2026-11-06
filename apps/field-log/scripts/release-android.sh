#!/usr/bin/env bash
# Builds the release APK, publishes it to the tailnet server and optionally to a private draft release.
# Usage: scripts/release-android.sh [--github] ["release notes"]
set -euo pipefail

GITHUB=0
if [[ "${1:-}" == "--github" ]]; then GITHUB=1; shift; fi
NOTES="${1:-Field Voice Log build}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
SERVER_DIR="$REPO_DIR/services/field-log-server"
VERSION_NAME="0.1.0"
DRAFT_RELEASE="untagged-b7add92e51efdd982ca9"

# 1. Version code (minutes since 2026-01-01 UTC) and git sha (with -dirty when the tree has changes).
NOW=$(date -u +%s)
EPOCH=$(date -u -d '2026-01-01T00:00:00Z' +%s)
export FVL_VERSION_CODE=$(( (NOW - EPOCH) / 60 ))
SHA=$(git -C "$REPO_DIR" rev-parse --short HEAD)
if [[ -n "$(git -C "$REPO_DIR" status --porcelain)" ]]; then SHA="$SHA-dirty"; fi
export FVL_GIT_SHA="$SHA"
echo "[release] versionCode=$FVL_VERSION_CODE sha=$FVL_GIT_SHA name=$VERSION_NAME"

# 2. Typecheck, lint (React hooks rules) and unit tests must pass before anything is built.
cd "$APP_DIR"
pnpm -s check

# 3. Generate the Android project.
npx expo prebuild --clean --platform android

# 3. Build, serialised with other heavy jobs and capped in memory.
flock /home/jaeil/.cache/fvl-heavy.lock \
  systemd-run --user --scope -q -p MemoryMax=10G -p MemorySwapMax=0 \
  bash -c "source /home/jaeil/dev/sound-canvas/scripts/android-env.sh && cd '$APP_DIR/android' && ./gradlew --no-daemon :app:assembleRelease"

APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK" ]] || { echo "[release] APK not found: $APK" >&2; exit 1; }
echo "[release] built $APK ($(du -h "$APK" | cut -f1))"

# 4. Publish to the tailnet server.
cd "$SERVER_DIR"
uv run --no-sync fls publish-apk "$APK" \
  --version-code "$FVL_VERSION_CODE" --version-name "$VERSION_NAME" --git-sha "$FVL_GIT_SHA" --notes "$NOTES"

# 5. Optional: attach to the PRIVATE draft release. Never publish that release (the repo is public).
if [[ "$GITHUB" == 1 ]]; then
  NAMED="$(mktemp -d)/field-voice-log-$FVL_VERSION_CODE-$FVL_GIT_SHA.apk"
  cp "$APK" "$NAMED"
  gh release upload "$DRAFT_RELEASE" "$NAMED" -R jae1e/sound-canvas --clobber
  rm -rf "$(dirname "$NAMED")"
  echo "[release] uploaded to the draft release (left unpublished)"
fi
