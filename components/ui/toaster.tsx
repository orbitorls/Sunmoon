"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * The app is light-mode only, so the toast colours are fixed rather than
 * synced to a theme. Without a mounted Toaster every `toast()` call in the
 * app is silently dropped.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#0f172a",
          "--normal-border": "#e2e8f0",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
