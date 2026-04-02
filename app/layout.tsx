import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Northstar — Product Management',
  description: 'AI-powered product management. Northstar scans JIRA, Confluence, and Slack to keep your roadmap in sync.',
  icons: {
    icon: '/assets/northstar-icon.svg',
    apple: '/assets/northstar-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"' }}>
        {children}
      </body>
    </html>
  );
}
