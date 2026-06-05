import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ullim — Contents Generator',
  description: 'Instagram caption and hashtag generator for the ullim DJ collective',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
