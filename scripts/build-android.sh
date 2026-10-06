#!/usr/bin/env bash
# Builds a release APK (standalone JS bundle embedded, no Metro needed), arm64-v8a only,
# and copies it to output/cubo-<version>-<git sha>.apk (output/ is git-ignored).
# Signing: the Expo template signs release with the debug keystore (android/app/debug.keystore),
# which is fine for sideloading. For a real keystore (Play Store), add a release signingConfig
# in android/app/build.gradle through a config plugin in app.config.ts, never by hand in android/.
# Usage: npm run build:apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# JAVA_HOME: use the environment's, else a JDK 17 found by macOS.
if [ -z "${JAVA_HOME:-}" ] && [ -x /usr/libexec/java_home ]; then
  JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  export JAVA_HOME
fi
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "error: JAVA_HOME is not set or invalid. Install a JDK 17 and export JAVA_HOME." >&2
  exit 1
fi

# ANDROID_HOME: the environment's, else the default Android Studio location.
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  ANDROID_HOME="$HOME/Library/Android/sdk"
fi
if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "$ANDROID_HOME" ]; then
  echo "error: ANDROID_HOME is not set or invalid. Install the Android SDK and export ANDROID_HOME." >&2
  exit 1
fi
export ANDROID_HOME

if [ ! -d node_modules ]; then
  echo "node_modules missing: running npm install"
  npm install
fi

VERSION="$(sed -n "s/^  version: '\([^']*\)'.*/\1/p" app.config.ts | head -1)"
if [ -z "$VERSION" ]; then
  echo "error: could not read the version from app.config.ts." >&2
  exit 1
fi
SHA="$(git rev-parse --short HEAD)"

(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a)

APK="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  echo "error: $APK not found after the build." >&2
  exit 1
fi

mkdir -p output
DEST="output/cubo-$VERSION-$SHA.apk"
cp "$APK" "$DEST"
echo "APK: $ROOT/$DEST ($(du -h "$DEST" | cut -f1))"
echo "Install: adb install -r $DEST (or open the file on the phone)"
