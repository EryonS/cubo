#!/bin/sh
# Live reload on iOS: serves www/ from this Mac and points the app at it.
# Simulator or iPhone on the same Wi-Fi. Reload the page from Safari > Develop (Cmd+R).
# Back to the bundled www/: npx cap copy ios.
PORT=8000
HOST=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo localhost)

python3 -m http.server "$PORT" --directory www &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' INT TERM EXIT

npx cap run ios -l --host "$HOST" --port "$PORT" || exit 1
echo "Serving www/ on http://$HOST:$PORT (Ctrl+C to stop)"
wait $SERVER
