#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <iterations>" >&2
  exit 1
fi

if ! [[ "$1" =~ ^[1-9][0-9]*$ ]]; then
  echo "iterations must be a positive integer" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMPT_FILE="$SCRIPT_DIR/prompt.md"
ATTACH_URL="${OPENCODE_ATTACH_URL:-http://localhost:4096}"
ALLOW_LOCAL_FALLBACK="${RALPH_ALLOW_LOCAL_FALLBACK:-1}"
ITERATIONS="$1"
MODEL="${RALPH_MODEL:-openai/gpt-5.3-codex}"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Missing prompt file: $PROMPT_FILE" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required but not found." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not found." >&2
  echo "Install jq in your env or rebuild dev image (Dockerfile.devEnv now includes jq)." >&2
  exit 1
fi

if ! (cd "$REPO_ROOT" && pnpm exec opencode --version >/dev/null 2>&1); then
  echo "opencode is not available via pnpm exec in this repo." >&2
  exit 1
fi

prompt="$(<"$PROMPT_FILE")"

stream_text='select(.type == "text") | .part.text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'

run_attach() {
  local message="$1"
  (cd "$REPO_ROOT" && pnpm exec opencode run --attach "$ATTACH_URL" --dir "$REPO_ROOT" --format json --model "$MODEL" "$message")
}

run_local() {
  local message="$1"
  (cd "$REPO_ROOT" && pnpm exec opencode run --dir "$REPO_ROOT" --format json --model "$MODEL" "$message")
}

for ((i = 1; i <= ITERATIONS; i++)); do
  tmpfile="$(mktemp)"
  trap 'rm -f "$tmpfile"' EXIT

  echo "------- ITERATION $i --------"

  ralph_commits="$(git -C "$REPO_ROOT" log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || true)"
  if [ -z "$ralph_commits" ]; then
    ralph_commits="No RALPH commits found"
  fi

  message="$prompt"
  message+=$'\n\n'
  message+="Previous RALPH commits: $ralph_commits"

  if ! run_attach "$message" | tee "$tmpfile" | jq --unbuffered -rj "$stream_text"; then
    if [ "$ALLOW_LOCAL_FALLBACK" != "1" ]; then
      echo "Attach failed at $ATTACH_URL and local fallback disabled." >&2
      echo "Start server with: pnpm exec opencode web --port 4096 --hostname 0.0.0.0" >&2
      exit 1
    fi
    echo "Attach failed at $ATTACH_URL. Falling back to local opencode run." >&2
    run_local "$message" | tee "$tmpfile" | jq --unbuffered -rj "$stream_text"
  fi

  result="$(jq -rs '[.[] | select(.type == "text") | .part.text // empty] | join("\n")' "$tmpfile")"

  if [[ "$result" == *"<promise>NO MORE TASKS</promise>"* ]]; then
    echo "Ralph complete after $i iterations."
    exit 0
  fi

  if [[ "$result" == *"<promise>ABORT</promise>"* ]]; then
    echo "Ralph aborted after $i iterations."
    exit 1
  fi

  rm -f "$tmpfile"
  trap - EXIT
done

echo "Reached $ITERATIONS iterations. No completion/abort promise found."
