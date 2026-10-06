#!/usr/bin/env bash
# Archives the iOS app (Release, generic iOS device) and exports an .ipa with automatic signing.
# Outputs (output/ is git-ignored): Cubo.xcarchive and cubo-<version>-<git sha>.ipa.
#
# Usage: npm run build:ipa [-- <mode>]
#   (no flag)  development IPA: installs on the devices registered in your developer account
#   --adhoc    ad-hoc IPA (release-testing): same, but signed for distribution (needs a distribution cert)
#   --store    App Store Connect IPA, ready to upload (Transporter or Xcode Organizer) for TestFlight
#   --archive  stop after the archive (no export, so no distribution signing needed)
# Team id: DEVELOPMENT_TEAM read from ios/Cubo.xcodeproj/project.pbxproj; override with TEAM_ID=XXXXXXXXXX.
# Needs Xcode signed in to your Apple account (Settings > Accounts) and ios/Pods installed
# (this script runs `pod install` if missing).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

METHOD="debugging"
ARCHIVE_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --adhoc) METHOD="release-testing" ;;
    --store) METHOD="app-store-connect" ;;
    --archive) ARCHIVE_ONLY=1 ;;
    *) echo "error: unknown option $arg (use --adhoc, --store or --archive)" >&2; exit 1 ;;
  esac
done

if [ ! -d node_modules ]; then
  echo "node_modules missing: running npm install"
  npm install
fi
if [ ! -d ios/Pods ]; then
  echo "ios/Pods missing: running pod install"
  (cd ios && pod install)
fi

TEAM="${TEAM_ID:-$(sed -n 's/.*DEVELOPMENT_TEAM = "\{0,1\}\([A-Z0-9]*\)"\{0,1\};.*/\1/p' ios/Cubo.xcodeproj/project.pbxproj | head -1)}"
if [ -z "$TEAM" ]; then
  echo "error: no DEVELOPMENT_TEAM in the Xcode project. Run with TEAM_ID=XXXXXXXXXX." >&2
  exit 1
fi

VERSION="$(sed -n "s/^  version: '\([^']*\)'.*/\1/p" app.config.ts | head -1)"
if [ -z "$VERSION" ]; then
  echo "error: could not read the version from app.config.ts." >&2
  exit 1
fi
SHA="$(git rev-parse --short HEAD)"

mkdir -p output
ARCHIVE="output/Cubo.xcarchive"
rm -rf "$ARCHIVE"

echo "Archiving (team $TEAM)..."
xcodebuild archive \
  -workspace ios/Cubo.xcworkspace \
  -scheme Cubo \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM" \
  CODE_SIGN_STYLE=Automatic

echo "Archive: $ROOT/$ARCHIVE"
if [ "$ARCHIVE_ONLY" = 1 ]; then
  exit 0
fi

EXPORT_DIR="output/export-$METHOD"
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"
OPTIONS="$EXPORT_DIR/ExportOptions.plist"
cat > "$OPTIONS" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>$METHOD</string>
  <key>teamID</key><string>$TEAM</string>
  <key>signingStyle</key><string>automatic</string>
  <key>stripSwiftSymbols</key><true/>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
PLIST

echo "Exporting ($METHOD)..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$OPTIONS" \
  -allowProvisioningUpdates

IPA="$(ls "$EXPORT_DIR"/*.ipa 2>/dev/null | head -1 || true)"
if [ -z "$IPA" ]; then
  echo "error: no .ipa found in $EXPORT_DIR after the export." >&2
  exit 1
fi
DEST="output/cubo-$VERSION-$SHA.ipa"
cp "$IPA" "$DEST"
echo "IPA ($METHOD): $ROOT/$DEST ($(du -h "$DEST" | cut -f1))"
