import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RepoPlan — GitHub Issue to Implementation Plan",
  description:
    "Turn GitHub issues and feature requests into detailed, codebase-aware implementation plans using AI-powered repository analysis.",
  keywords: ["GitHub", "implementation plan", "AI", "LangGraph", "code analysis"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
