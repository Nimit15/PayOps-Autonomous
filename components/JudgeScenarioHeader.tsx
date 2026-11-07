'use client';

import { useState } from 'react';

interface JudgeScenarioHeaderProps {
  onScenarioSelect: (scenario: 'autonomous' | 'approval' | 'dispute') => void;
  activeScenario: 'autonomous' | 'approval' | 'dispute' | null;
  onToggleInspector: () => void;
  inspectorOpen: boolean;
}

const SCENARIOS = [
  {
    id: 'autonomous' as const,
    label: 'Autonomous',
    subtitle: '$500 cap',
    description: 'Auto-approve payments ≤ $500',
    icon: '⚡',
    color: 'var(--emerald)',
  },
  {
    id: 'approval' as const,
    label: 'Approval Required',
    subtitle: '$15,000 cap',
    description: 'Escalate payments > $500 to approver',
    icon: '🛡️',
    color: 'var(--amber)',
  },
  {
    id: 'dispute' as const,
    label: 'Dispute Flow',
    subtitle: 'Chargeback demo',
    description: 'End-to-end dispute resolution',
    icon: '⚔️',
    color: 'var(--crimson)',
  },
];

export default function JudgeScenarioHeader({
  onScenarioSelect,
  activeScenario,
  onToggleInspector,
  inspectorOpen,
}: JudgeScenarioHeaderProps) {
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);

  return (
    <header className="w-full border-b border-[var(--border-hairline)] bg-[var(--bg-card)] sticky top-0 z-40">
      <div className="max-w-full mx-auto px-4">
        <div className="h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--paypal-blue), var(--paypal-blue-light))' }}>
              <span className="font-bold text-white text-sm">PAY</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">PayOps Autonomous</h1>
              <p className="text-xs text-[var(--text-muted)]">PayPal AI Hackathon 2026</p>
            </div>
          </div>

          {/* Scenario Buttons */}
          <div className="flex items-center gap-2">
            {SCENARIOS.map((scenario) => {
              const isActive = activeScenario === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onScenarioSelect(scenario.id)}
                  onMouseEnter={() => setHoveredScenario(scenario.id)}
                  onMouseLeave={() => setHoveredScenario(null)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 min-w-[140px] ${
                    isActive
                      ? 'text-white shadow-lg'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]'
                  }`}
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${scenario.color}, ${scenario.color}dd)`
                      : undefined,
                    border: isActive ? `2px solid ${scenario.color}` : '1px solid var(--border-hairline)',
                    boxShadow: isActive ? `0 0 20px ${scenario.color}40` : undefined,
                  }}
                  title={scenario.description}
                >
                  <span className="text-base">{scenario.icon}</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className={isActive ? 'font-semibold' : 'font-medium'}>{scenario.label}</span>
                    <span className={`text-xs ${isActive ? 'opacity-90' : 'text-[var(--text-muted)]'}`}>{scenario.subtitle}</span>
                  </div>
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: scenario.color }} />
                  )}
                  {hoveredScenario === scenario.id && !isActive && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-lg whitespace-nowrap z-50">
                      {scenario.description}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Demo Mode Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--emerald)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--emerald)]" />
              </span>
              <span className="text-xs text-[var(--emerald)] font-medium">DEMO MODE</span>
            </div>

            {/* Inspector Toggle */}
            <button
              type="button"
              onClick={onToggleInspector}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                inspectorOpen
                  ? 'bg-[var(--paypal-blue)] text-white shadow-[0_0_20px_var(--paypal-blue-glow)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{inspectorOpen ? 'Hide Inspector' : 'Show Inspector'}</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-muted)]">
                <span>⌘</span><span>I</span>
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}