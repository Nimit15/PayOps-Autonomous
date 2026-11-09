import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PayOps Autonomous - Agentic Commerce Command Center',
  description: 'Agentic Commerce, Procurement, Milestone Invoicing & Dispute Command Center for PayPal AI Hackathon 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}