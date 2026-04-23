import type {
  MessageError,
  MessageErrorKind,
} from "@ai-monorepo/ai/types/uiMessage";
import { StatusBlock } from "@/components/ui-custom/feedback/status-block";

const supportedStatusErrorLocales = ["en", "fr"] as const;
const defaultStatusErrorLocale = "fr" as const;

type StatusErrorLocale = (typeof supportedStatusErrorLocales)[number];
type DefaultStatusErrorLocale = typeof defaultStatusErrorLocale;

type ErrorByKind<K extends MessageErrorKind> = Extract<
  MessageError,
  { kind: K }
>;
type ErrorParamsByKind<K extends MessageErrorKind> = ErrorByKind<K> extends {
  params: infer Params;
}
  ? Params
  : never;

type PerLocaleMapping<T> = {
  [L in StatusErrorLocale]?: T;
} & {
  [L in DefaultStatusErrorLocale]: T;
};

type ErrorCopy = {
  title: string;
  bodyLines: string[];
};

type ErrorMessageBuilderByKind = {
  [K in MessageErrorKind]: ErrorParamsByKind<K> extends never
    ? PerLocaleMapping<() => ErrorCopy>
    : PerLocaleMapping<(params: ErrorParamsByKind<K>) => ErrorCopy>;
};

const errorMessageBuilderByKind: ErrorMessageBuilderByKind = {
  AI_API_ERROR: {
    en: () => ({
      title: "AI Provider Error",
      bodyLines: ["Send a new message to try again."],
    }),
    fr: () => ({
      title: "Erreur du fournisseur IA",
      bodyLines: ["Envoyez un nouveau message pour reessayer."],
    }),
  },
  UNKNOWN_ERROR: {
    en: () => ({
      title: "Unknown Error",
      bodyLines: ["Send a new message to try again."],
    }),
    fr: () => ({
      title: "Erreur inconnue",
      bodyLines: ["Envoyez un nouveau message pour reessayer."],
    }),
  },
  MAX_OUTPUT_TOKENS_EXCEEDED: {
    en: (params) => {
      const bodyLines = ["Send a new message to try again."];

      if (typeof params.maxOutputTokens === "number") {
        bodyLines.push(`Max output limit: ${params.maxOutputTokens} tokens.`);
      }

      const suggestedModelIds =
        params.retryWithSuggestedModelIds?.filter(Boolean);

      if (suggestedModelIds?.length) {
        bodyLines.push(`Suggested models: ${suggestedModelIds.join(", ")}.`);
      }

      return {
        title: "Max output tokens exceeded",
        bodyLines,
      };
    },
    fr: (params) => {
      const bodyLines = ["Envoyez un nouveau message pour reessayer."];

      if (typeof params.maxOutputTokens === "number") {
        bodyLines.push(`Limite de sortie: ${params.maxOutputTokens} tokens.`);
      }

      const suggestedModelIds =
        params.retryWithSuggestedModelIds?.filter(Boolean);

      if (suggestedModelIds?.length) {
        bodyLines.push(`Modeles suggeres: ${suggestedModelIds.join(", ")}.`);
      }

      return {
        title: "Limite de tokens de sortie depassee",
        bodyLines,
      };
    },
  },
};

function getLocalizedErrorCopy(error: MessageError, locale: StatusErrorLocale) {
  if (error.kind === "AI_API_ERROR") {
    const buildCopy =
      errorMessageBuilderByKind.AI_API_ERROR[locale] ??
      errorMessageBuilderByKind.AI_API_ERROR[defaultStatusErrorLocale];
    return buildCopy();
  }

  if (error.kind === "MAX_OUTPUT_TOKENS_EXCEEDED") {
    const buildCopy =
      errorMessageBuilderByKind.MAX_OUTPUT_TOKENS_EXCEEDED[locale] ??
      errorMessageBuilderByKind.MAX_OUTPUT_TOKENS_EXCEEDED[
        defaultStatusErrorLocale
      ];
    return buildCopy(error.params);
  }

  const buildCopy =
    errorMessageBuilderByKind.UNKNOWN_ERROR[locale] ??
    errorMessageBuilderByKind.UNKNOWN_ERROR[defaultStatusErrorLocale];
  return buildCopy();
}

function getErrorContent(
  error: MessageError | undefined,
  locale: StatusErrorLocale
) {
  // POC: local i18n mapping stays in this file until app-wide i18n is ready.
  // Keep UI copy controlled by kind mapping; do not surface raw error.message.
  if (!error) {
    const fallbackBuilder =
      errorMessageBuilderByKind.UNKNOWN_ERROR[locale] ??
      errorMessageBuilderByKind.UNKNOWN_ERROR[defaultStatusErrorLocale];
    const fallbackCopy = fallbackBuilder();

    return {
      title: fallbackCopy.title,
      body: fallbackCopy.bodyLines.join(" "),
    };
  }

  const copy = getLocalizedErrorCopy(error, locale);
  return {
    title: copy.title,
    body: copy.bodyLines.join(" "),
  };
}

type ErrorStatusPartProps = {
  error?: MessageError;
};

export function ErrorStatusPart({ error }: ErrorStatusPartProps) {
  const { title, body } = getErrorContent(error, defaultStatusErrorLocale);

  return (
    <StatusBlock.Root className="w-full" kind="error">
      <StatusBlock.Content>
        <StatusBlock.Title>{title}</StatusBlock.Title>
        <StatusBlock.Body>{body}</StatusBlock.Body>
      </StatusBlock.Content>
    </StatusBlock.Root>
  );
}
