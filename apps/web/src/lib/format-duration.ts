export function formatDurationMs(durationMs: number | undefined) {
  if (durationMs === undefined || Number.isNaN(durationMs)) return undefined;

  const clampedMs = Math.max(0, durationMs);
  if (clampedMs < 1000) {
    return `${Math.round(clampedMs)}ms`;
  }

  const totalSeconds = clampedMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days}d ${remainingHours}h`;
}
