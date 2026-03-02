#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMPT_FILE="$SCRIPT_DIR/prompt.md"
ATTACH_URL="${OPENCODE_ATTACH_URL:-http://localhost:4096}"
ALLOW_LOCAL_FALLBACK="${RALPH_ALLOW_LOCAL_FALLBACK:-1}"
MODEL="${RALPH_MODEL:-openai/gpt-5.3-codex}"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Missing prompt file: $PROMPT_FILE" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required but not found." >&2
  exit 1
fi

if ! (cd "$REPO_ROOT" && pnpm exec opencode --version >/dev/null 2>&1); then
  echo "opencode is not available via pnpm exec in this repo." >&2
  exit 1
fi

prompt="$(<"$PROMPT_FILE")"
ralph_commits="$(git -C "$REPO_ROOT" log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || true)"

if [ -z "$ralph_commits" ]; then
  ralph_commits="No RALPH commits found"
fi

message="$prompt"
message+=$'\n\n'
message+="Previous RALPH commits: $ralph_commits"

run_attach() {
  (cd "$REPO_ROOT" && pnpm exec opencode run --attach "$ATTACH_URL" --dir "$REPO_ROOT" --model "$MODEL" "$message")
}

run_local() {
  (cd "$REPO_ROOT" && pnpm exec opencode run --dir "$REPO_ROOT" --model "$MODEL" "$message")
}

if run_attach; then
  exit 0
fi

if [ "$ALLOW_LOCAL_FALLBACK" = "1" ]; then
  echo "Attach failed at $ATTACH_URL. Falling back to local opencode run." >&2
  run_local
  exit 0
fi

echo "Attach failed at $ATTACH_URL and local fallback disabled." >&2
echo "Start server with: pnpm exec opencode web --port 4096 --hostname 0.0.0.0" >&2
exit 1
