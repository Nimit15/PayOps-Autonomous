// Simple demo mode check - no Node.js dependencies
// Can be safely imported in both client and server components

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
}