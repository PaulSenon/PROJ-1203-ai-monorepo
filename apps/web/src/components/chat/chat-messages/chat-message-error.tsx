import type { ChatErrorMetadata } from "@ai-monorepo/convex/convex/schema";
import { RefreshCcwIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { cn, type Prettify } from "@/lib/utils";

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

type ErrorComponentMapping = {
  [K in ChatErrorMetadata["kind"]]: ExtractParams<
    ExtractMemberByKind<ChatErrorMetadata, K>
  > extends never
    ? React.ComponentType
    : React.ComponentType<
        ExtractParams<ExtractMemberByKind<ChatErrorMetadata, K>>
      >;
};

const errorI18nMessageBuilder: ErrorI18nMessageBuilder = {
  AI_API_ERROR: {
    en: () => ["AI Provider Error", "Please try with another provider."],
    fr: () => [
      "Erreur de réponse du modèle",
      "Veuillez réessayer avec un autre modèle.",
    ],
  },
  UNKNOWN_ERROR: {
    en: () => [
      "Unknown Error. Our teams have been informed.",
      "Sorry for the inconvenience.",
    ],
    fr: () => [
      "Erreur Inconnue. Nos équipes ont été informées.",
      "Désolé pour le dérangement.",
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
      const messages = ["La limite de taille de la réponse a été dépassée."];
      if (maxOutputTokens) {
        messages.push(`limite: [${maxOutputTokens}] tokens`);
      }
      if (retryWithSuggestedModelIds) {
        messages.push(
          `Veuillez réessayer avec un modèle plus gros (ex: ${retryWithSuggestedModelIds.join(", ")})`
        );
      }
      return messages;
    },
  },
};

const I18nErrorMessage = memo(
  <T extends ChatErrorMetadata>({
    errorMetadata,
    locale,
  }: {
    errorMetadata: T;
    locale?: SupportedLocale;
  }) => {
    const i18n = errorI18nMessageBuilder;

    const messageFactory =
      i18n[errorMetadata.kind][locale ?? defaultLocale] ??
      i18n[errorMetadata.kind][defaultLocale];

    const messages =
      "params" in errorMetadata
        ? messageFactory(errorMetadata.params)
        : messageFactory({});

    return (
      <div>
        {messages.map((message, i) => (
          <div className={cn("text-sm", i === 0 && "font-medium")} key={i}>
            {message}
          </div>
        ))}
      </div>
    );
  }
);

export function ChatMessageError({
  errorMetadata,
  onRetry,
}: {
  errorMetadata: ChatErrorMetadata;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <I18nErrorMessage errorMetadata={errorMetadata} />
      <Button onClick={onRetry} size="default" variant="ghost">
        <RefreshCcwIcon className="size-4" />
        {"Retry"}
      </Button>
    </div>
  );
}
