"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ptPT } from "@clerk/localizations";
import { ReactNode } from "react";

export default function AuthSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <ClerkProvider localization={ptPT}>{children}</ClerkProvider>;
}
