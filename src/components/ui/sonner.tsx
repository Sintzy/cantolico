"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={{
        '--normal-bg': '#fff',
        '--normal-text': '#1e293b',
        '--normal-border': '#e5e7eb',
        background: '#fff',
        color: '#1e293b',
        boxShadow: '0 2px 16px 0 rgb(0 0 0 / 0.10), 0 1.5px 4px 0 rgb(0 0 0 / 0.04)',
        ...props.style
      } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
