import type { ChatErrorMetadata } from "@ai-monorepo/convex/convex/schema";
import {
  ArrowRightIcon,
  CpuIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui-custom/chat/primitives/status-message";
import { cn, type Prettify } from "@/lib/utils";

export type ChatStatusMessageTone = "error" | "cancelled";

type ChatStatusMessageRootProps = ComponentProps<typeof StatusMessage.Root> & {
  tone?: ChatStatusMessageTone;
};

const toneStyles: Record<ChatStatusMessageTone, string> = {
  error: "border-destructive/35 bg-destructive/5",
  cancelled: "border-amber-400/35 bg-amber-500/5",
};

function ChatStatusMessageRoot({
  className,
  tone = "error",
  ...props
}: ChatStatusMessageRootProps) {
  return (
    <StatusMessage.Root
      className={cn(
        "group rounded-md border px-3 py-2 text-sm",
        toneStyles[tone],
        className
      )}
      data-tone={tone}
      {...props}
    />
  );
}

function ChatStatusMessageHeader({
  className,
  ...props
}: ComponentProps<typeof StatusMessage.Header>) {
  return (
    <StatusMessage.Header
      className={cn("items-center", className)}
      {...props}
    />
  );
}

function ChatStatusMessageIcon({
  className,
  ...props
}: ComponentProps<typeof StatusMessage.Icon>) {
  return (
    <StatusMessage.Icon
      className={cn(
        "text-muted-foreground",
        "group-data-[tone=error]:text-destructive",
        "group-data-[tone=cancelled]:text-amber-600",
        className
      )}
      {...props}
    />
  );
}

function ChatStatusMessageTitle({
  className,
  ...props
}: ComponentProps<typeof StatusMessage.Title>) {
  return (
    <StatusMessage.Title
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  );
}

function ChatStatusMessageContent({
  className,
  ...props
}: ComponentProps<typeof StatusMessage.Content>) {
  return (
    <StatusMessage.Content className={cn("gap-1", className)} {...props} />
  );
}

function ChatStatusMessageDescription({
  className,
  ...props
}: ComponentProps<typeof StatusMessage.Description>) {
  return (
    <StatusMessage.Description
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

function ChatStatusMessageActions({
  className,
  ...props
}: ComponentProps<typeof StatusMessage.Actions>) {
  return <StatusMessage.Actions className={cn("mt-1", className)} {...props} />;
}

function ChatStatusMessageFooter({
  className,
  ...props
}: ComponentProps<typeof StatusMessage.Footer>) {
  return <StatusMessage.Footer className={cn("mt-1", className)} {...props} />;
}

export const ChatStatusMessage = {
  Root: ChatStatusMessageRoot,
  Header: ChatStatusMessageHeader,
  Icon: ChatStatusMessageIcon,
  Title: ChatStatusMessageTitle,
  Content: ChatStatusMessageContent,
  Description: ChatStatusMessageDescription,
  Actions: ChatStatusMessageActions,
  Footer: ChatStatusMessageFooter,
};

type ExtractMemberByKind<
  T extends { kind: string },
  K extends T["kind"],
> = Extract<T, { kind: K }>;
type ExtractParams<T> = T extends { params: infer P } ? P : never;

const supportedLocales = ["en", "fr"] as const;
const defaultLocale = "en" as const satisfies SupportedLocale;
type SupportedLocale = (typeof supportedLocales)[number];
type DefaultLocale = typeof defaultLocale;

type PerLocalMapping<T> = Prettify<
  {
    [K in SupportedLocale]?: T;
  } & {
    [K in DefaultLocale]: T;
  }
>;

type ErrorI18nMessageBuilder = {
  [K in ChatErrorMetadata["kind"]]: ExtractParams<
    ExtractMemberByKind<ChatErrorMetadata, K>
  > extends never
    ? PerLocalMapping<() => string[]>
    : PerLocalMapping<
        (
          params: ExtractParams<ExtractMemberByKind<ChatErrorMetadata, K>>
        ) => string[]
      >;
};

const errorI18nMessageBuilder: ErrorI18nMessageBuilder = {
  AI_API_ERROR: {
    en: () => ["AI Provider Error", "Please try with another provider."],
    fr: () => [
      "Erreur de reponse du modele",
      "Veuillez reessayer avec un autre modele.",
    ],
  },
  UNKNOWN_ERROR: {
    en: () => [
      "Unknown Error. Our teams have been informed.",
      "Sorry for the inconvenience.",
    ],
    fr: () => [
      "Erreur Inconnue. Nos equipes ont ete informees.",
      "Desole pour le derangement.",
    ],
  },
  MAX_OUTPUT_TOKENS_EXCEEDED: {
    en: ({ maxOutputTokens, retryWithSuggestedModelIds }) => {
      const messages = ["Max output tokens exceeded."];
      if (maxOutputTokens) {
        messages.push(`limit: [${maxOutputTokens}] tokens`);
      }
      if (retryWithSuggestedModelIds) {
        messages.push(
          `Please retry with a larger model (ex: ${retryWithSuggestedModelIds.join(", ")})`
        );
      }
      return messages;
    },
    fr: ({ maxOutputTokens, retryWithSuggestedModelIds }) => {
      const messages = ["La limite de taille de la reponse a ete depassee."];
      if (maxOutputTokens) {
        messages.push(`limite: [${maxOutputTokens}] tokens`);
      }
      if (retryWithSuggestedModelIds) {
        messages.push(
          `Veuillez reessayer avec un modele plus gros (ex: ${retryWithSuggestedModelIds.join(", ")})`
        );
      }
      return messages;
    },
  },
};

const fallbackErrorMessages: PerLocalMapping<() => string[]> = {
  en: () => ["Something went wrong.", "Please try again."],
  fr: () => ["Une erreur est survenue.", "Veuillez reessayer."],
};

const cancelledMessages: PerLocalMapping<() => string[]> = {
  en: () => ["Response cancelled.", "You can retry when ready."],
  fr: () => ["Reponse annulee.", "Vous pouvez reessayer quand vous voulez."],
};

const errorTitle: PerLocalMapping<string> = {
  en: "Error",
  fr: "Erreur",
};

const cancelledTitle: PerLocalMapping<string> = {
  en: "Cancelled",
  fr: "Annule",
};

function resolveLocale<T>(
  builder: PerLocalMapping<T>,
  locale?: SupportedLocale
) {
  return builder[locale ?? defaultLocale] ?? builder[defaultLocale];
}

function getErrorMessages(
  errorMetadata: ChatErrorMetadata | undefined,
  locale?: SupportedLocale
) {
  if (!errorMetadata) {
    return resolveLocale(fallbackErrorMessages, locale)();
  }

  const messageFactory =
    errorI18nMessageBuilder[errorMetadata.kind][locale ?? defaultLocale] ??
    errorI18nMessageBuilder[errorMetadata.kind][defaultLocale];

  return "params" in errorMetadata
    ? messageFactory(errorMetadata.params)
    : messageFactory({});
}

function getCancelledMessages(locale?: SupportedLocale) {
  return resolveLocale(cancelledMessages, locale)();
}

export type ChatMessageErrorBlockProps = {
  errorMetadata?: ChatErrorMetadata;
  onRetry?: () => void;
  onRetryWithModel?: () => void;
  locale?: SupportedLocale;
  className?: string;
};

export function ChatMessageErrorBlock({
  errorMetadata,
  onRetry,
  onRetryWithModel,
  locale,
  className,
}: ChatMessageErrorBlockProps) {
  const messages = getErrorMessages(errorMetadata, locale);
  const title = resolveLocale(errorTitle, locale);
  const hasActions = Boolean(onRetry || onRetryWithModel);

  return (
    <ChatStatusMessage.Root className={className} tone="error">
      <ChatStatusMessage.Header>
        <ChatStatusMessage.Icon>
          <TriangleAlertIcon />
        </ChatStatusMessage.Icon>
        <ChatStatusMessage.Title>{title}</ChatStatusMessage.Title>
      </ChatStatusMessage.Header>
      {messages.length > 0 && (
        <ChatStatusMessage.Content>
          <ChatStatusMessage.Description>
            {messages.map((message, index) => (
              <span key={`error-${index}`}>{message}</span>
            ))}
          </ChatStatusMessage.Description>
        </ChatStatusMessage.Content>
      )}
      {hasActions && (
        <ChatStatusMessage.Actions>
          {onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              type="button"
              variant="secondary"
            >
              <span className="flex items-center justify-center">
                <RefreshCcwIcon className="size-4" />
              </span>
              Retry
            </Button>
          )}
          {onRetryWithModel && (
            <Button
              onClick={onRetryWithModel}
              size="sm"
              type="button"
              variant="ghost"
            >
              <span className="flex items-center justify-center">
                <CpuIcon className="size-4" />
              </span>
              Retry with model
            </Button>
          )}
        </ChatStatusMessage.Actions>
      )}
    </ChatStatusMessage.Root>
  );
}

export type ChatMessageCancelledBlockProps = {
  onContinue?: () => void;
  onRetryWithModel?: () => void;
  locale?: SupportedLocale;
  className?: string;
};

export function ChatMessageCancelledBlock({
  onContinue,
  onRetryWithModel,
  locale,
  className,
}: ChatMessageCancelledBlockProps) {
  const messages = getCancelledMessages(locale);
  const title = resolveLocale(cancelledTitle, locale);
  const hasActions = Boolean(onContinue || onRetryWithModel);

  return (
    <ChatStatusMessage.Root className={className} tone="cancelled">
      <ChatStatusMessage.Header>
        <ChatStatusMessage.Icon>
          <XCircleIcon />
        </ChatStatusMessage.Icon>
        <ChatStatusMessage.Title>{title}</ChatStatusMessage.Title>
      </ChatStatusMessage.Header>
      {messages.length > 0 && (
        <ChatStatusMessage.Content>
          <ChatStatusMessage.Description>
            {messages.map((message, index) => (
              <span key={`cancelled-${index}`}>{message}</span>
            ))}
          </ChatStatusMessage.Description>
        </ChatStatusMessage.Content>
      )}
      {hasActions && (
        <ChatStatusMessage.Actions>
          {onContinue && (
            <Button
              onClick={onContinue}
              size="sm"
              type="button"
              variant="secondary"
            >
              <span className="flex items-center justify-center">
                <ArrowRightIcon className="size-4" />
              </span>
              Continue
            </Button>
          )}
          {onRetryWithModel && (
            <Button
              onClick={onRetryWithModel}
              size="sm"
              type="button"
              variant="ghost"
            >
              <span className="flex items-center justify-center">
                <CpuIcon className="size-4" />
              </span>
              Retry with model
            </Button>
          )}
        </ChatStatusMessage.Actions>
      )}
    </ChatStatusMessage.Root>
  );
}
