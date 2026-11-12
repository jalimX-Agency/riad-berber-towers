// The real <html> lives in app/[locale]/layout.tsx (public site) and app/admin/layout.tsx (admin).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
