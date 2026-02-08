const createdAtFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ModelInfo({ modelId }: { modelId?: string }) {
  if (!modelId) {
    return null;
  }

  return <span className="font-medium text-muted-foreground">{modelId}</span>;
}

export function SpeedInfo({
  tokensPerSecond,
  mockedTokensPerSecond = 42,
}: {
  tokensPerSecond?: number;
  mockedTokensPerSecond?: number;
}) {
  const value =
    typeof tokensPerSecond === "number" && Number.isFinite(tokensPerSecond)
      ? tokensPerSecond
      : mockedTokensPerSecond;

  return <span>{value.toFixed(1)} tok/s</span>;
}

export function CreatedAtInfo({ createdAt }: { createdAt?: number }) {
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) {
    return null;
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (
    <time className="text-muted-foreground/80" dateTime={date.toISOString()}>
      {createdAtFormatter.format(date)}
    </time>
  );
}
