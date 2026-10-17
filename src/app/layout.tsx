// ルートの枠。<html> と <body> と文書の題名だけを持ち、画面の本体はsrc/components/EditorPage/ にある
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/app/globals.css'
import { readStrings } from '@/lib/content/read'

const strings = readStrings()

export const metadata: Metadata = { title: strings.title }

type RootLayoutProps = { children: ReactNode }

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang={strings.lang}>
      <body>{children}</body>
    </html>
  )
}
