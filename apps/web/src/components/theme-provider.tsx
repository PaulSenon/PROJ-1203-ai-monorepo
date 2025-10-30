import {
  useTheme as _useTheme,
  ThemeProvider as NextThemesProvider,
} from "next-themes";
import type * as React from "react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export const useTheme = _useTheme;
