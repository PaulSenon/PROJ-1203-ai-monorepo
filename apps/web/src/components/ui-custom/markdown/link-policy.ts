export type LinkKind =
  | "in_app"
  | "external_trusted"
  | "external_untrusted"
  | "invalid";

export const DEFAULT_TRUSTED_DOMAINS: string[] = [];

const LEADING_DOTS_PATTERN = /^\.+/;

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(LEADING_DOTS_PATTERN, "");
}

export function isTrustedHostname(
  hostname: string,
  trustedDomains: string[]
): boolean {
  const normalizedHostname = normalizeDomain(hostname);
  if (!normalizedHostname) return false;

  for (const domain of trustedDomains) {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) continue;

    if (
      normalizedHostname === normalizedDomain ||
      normalizedHostname.endsWith(`.${normalizedDomain}`)
    ) {
      return true;
    }
  }

  return false;
}

export function resolveLinkKind(
  href: string,
  origin: string,
  trustedDomains: string[] = DEFAULT_TRUSTED_DOMAINS
): LinkKind {
  try {
    const resolvedUrl = new URL(href, origin);

    if (resolvedUrl.origin === origin) {
      return "in_app";
    }

    if (isTrustedHostname(resolvedUrl.hostname, trustedDomains)) {
      return "external_trusted";
    }

    return "external_untrusted";
  } catch {
    return "invalid";
  }
}
