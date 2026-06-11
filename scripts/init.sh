#!/usr/bin/env bash
# Initialisiert eine neue Webseite aus diesem Template:
#   ./scripts/init.sh <projekt-name>
set -euo pipefail

NAME="${1:?Usage: ./scripts/init.sh <projekt-name>}"
OLD="website-template"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

grep -rl --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git "$OLD" . \
  | grep -v 'scripts/init.sh' \
  | xargs sed -i.bak "s/$OLD/$NAME/g"
find . -name '*.bak' -not -path './node_modules/*' -delete

echo "Fertig. Nächste Schritte:"
echo "  1. app/page.tsx mit echtem Inhalt füllen, Startseiten-Demo ersetzen."
echo "  2. README.md anpassen, dieses Script löschen."
echo "  3. pnpm install && pnpm run build"
