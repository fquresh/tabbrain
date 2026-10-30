#!/bin/sh
# Renders the PNG icons from icon.svg and icon-16.svg with headless Chrome.
# Usage: icons/render-icons.sh
# Set CHROME to use a different Chrome binary.
set -eu
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

render() { # <svg> <size> [drawing size, centered]
    art="${3:-$2}"
    page="$tmp/$2.html"
    printf '<body style="margin:0"><img src="file://%s/%s" width="%s" height="%s" style="display:block;margin:%spx">' \
        "$PWD" "$1" "$art" "$art" "$(( ($2 - art) / 2 ))" > "$page"
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
        --default-background-color=00000000 --user-data-dir="$tmp/profile" \
        --window-size="$2,$2" --screenshot="$PWD/icon$2.png" "file://$page" >/dev/null 2>&1
    echo "icon$2.png"
}

render icon-16.svg 16
render icon.svg 32
render icon.svg 48
# Chrome asks for a 96 px drawing with 16 px of padding in the 128 px icon
render icon.svg 128 96
