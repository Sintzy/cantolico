"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ptPT } from "@clerk/localizations";
import { useSession } from "@clerk/nextjs";
import { Fragment, ReactNode } from "react";

export default function AuthSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClerkProvider localization={ptPT} afterMultiSessionSingleSignOutUrl="/">
      <MultisessionSupport>{children}</MultisessionSupport>
    </ClerkProvider>
  );
}

function MultisessionSupport({ children }: { children: ReactNode }) {
  const { session } = useSession();

  return <Fragment key={session ? session.id : "no-users"}>{children}</Fragment>;
}
