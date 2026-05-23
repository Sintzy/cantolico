"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", resolvedTheme } = useTheme()
  const currentTheme = theme === "system" ? resolvedTheme : theme

  return (
    <Sonner
      theme={(currentTheme ?? "light") as ToasterProps["theme"]}
      className="toaster group"
      style={{
        '--normal-bg': 'hsl(var(--card))',
        '--normal-text': 'hsl(var(--card-foreground))',
        '--normal-border': 'hsl(var(--border))',
        ...props.style
      } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
