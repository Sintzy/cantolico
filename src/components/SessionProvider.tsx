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
    <ClerkProvider
      localization={ptPT}
      afterMultiSessionSingleSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "var(--clerk-color-primary)",
          colorBackground: "var(--clerk-color-background)",
          colorText: "var(--clerk-color-foreground)",
          colorTextOnPrimaryBackground: "var(--clerk-color-primary-foreground)",
          colorInputBackground: "var(--clerk-color-input)",
          colorInputText: "var(--clerk-color-input-foreground)",
          colorDanger: "var(--clerk-color-danger)",
          colorSuccess: "var(--clerk-color-success)",
          colorWarning: "var(--clerk-color-warning)",
          borderRadius: "var(--clerk-border-radius)",
          spacingUnit: "var(--clerk-spacing)",
        },
      }}
    >
      <MultisessionSupport>{children}</MultisessionSupport>
    </ClerkProvider>
  );
}

function MultisessionSupport({ children }: { children: ReactNode }) {
  const { session } = useSession();

  return <Fragment key={session ? session.id : "no-users"}>{children}</Fragment>;
}
