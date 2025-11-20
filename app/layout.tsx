import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { UserProvider } from "@/components/user-provider"

export const metadata: Metadata = {
  title: 'DTM Messaging App',
  description: 'SMS messaging app using Telstra\'s API',
  generator: 'DTM Messaging App',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
