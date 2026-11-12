'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { isDemoMode } from '@/lib/is-demo-mode';
import type { Dispute } from '@/lib/paypal-client';

interface GanttTask {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  duration?: number;
  durationUnit?: 'h' | 'd' | 'w' | 'M';
  percentDone?: number;
  parentId?: string | null;
  cls?: string;
  type?: 'task' | 'milestone' | 'summary';
  manuallyScheduled?: boolean;
  lockedByPayment?: boolean;
  paymentId?: string;
  disputeId?: string;
  priority?: number;
  resourceIds?: string[];
  // Evidence fields
  evidenceRequired?: string[];
  evidenceSubmitted?: string[];
  evidenceStatus?: 'pending' | 'partial' | 'complete' | 'overdue';
}

interface EvidenceItem {
  id: string;
  disputeId: string;
  type: 'tracking' | 'communication' | 'receipt' | 'contract' | 'photo' | 'other';
  name: string;
  status: 'required' | 'submitted' | 'verified' | 'rejected';
  submittedAt?: string;
  verifiedAt?: string;
  url?: string;
  size?: number;
}

function transformDisputeToTasks(disputes: Dispute[]): GanttTask[] {
  const tasks: GanttTask[] = [];
  tasks.push({
    id: 'project-root',
    name: 'PayOps Dispute Triage Timeline',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    type: 'summary',
    percentDone: 0,
  });

  disputes.forEach((dispute, index) => {
    const createDate = new Date(dispute.create_time);
    const triageEnd = new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const evidenceEnd = new Date(triageEnd.getTime() + 5 * 24 * 60 * 60 * 1000);
    const responseEnd = new Date(evidenceEnd.getTime() + 2 * 24 * 60 * 60 * 1000);
    const resolutionDate = new Date(createDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const isMerchantLiable = dispute.dispute_channel === 'EXTERNAL' || dispute.reason === 'UNAUTHORIZED';

    const evidenceRequired = [
      'Proof of delivery/tracking',
      'Customer communication records',
      'Transaction receipt',
      'Product/service description',
    ];

    tasks.push({
      id: `dispute-${dispute.dispute_id}-triage`,
      name: `Triage: ${dispute.reason}`,
      startDate: createDate,
      endDate: triageEnd,
      duration: 3,
      durationUnit: 'd',
      percentDone: dispute.status === 'OPEN' ? 0 : dispute.status === 'UNDER_REVIEW' ? 50 : 100,
      parentId: 'project-root',
      disputeId: dispute.dispute_id,
      priority: dispute.dispute_amount && Number(dispute.dispute_amount.value) > 5000 ? 1 : 2,
      evidenceRequired,
      evidenceSubmitted: [],
      evidenceStatus: 'pending',
    });
    tasks.push({
      id: `dispute-${dispute.dispute_id}-evidence`,
      name: 'Evidence Collection',
      startDate: triageEnd,
      endDate: evidenceEnd,
      duration: 5,
      durationUnit: 'd',
      percentDone: dispute.status === 'UNDER_REVIEW' ? 50 : 0,
      parentId: 'project-root',
      disputeId: dispute.dispute_id,
      evidenceRequired,
      evidenceSubmitted: [],
      evidenceStatus: dispute.status === 'UNDER_REVIEW' ? 'partial' : 'pending',
    });
    tasks.push({
      id: `dispute-${dispute.dispute_id}-response`,
      name: `Submit Response${isMerchantLiable ? ' (Payment Locked)' : ''}`,
      startDate: evidenceEnd,
      endDate: responseEnd,
      duration: 2,
      durationUnit: 'd',
      percentDone: 0,
      parentId: 'project-root',
      disputeId: dispute.dispute_id,
      lockedByPayment: isMerchantLiable,
      evidenceRequired: ['Response document', 'Supporting evidence'],
      evidenceSubmitted: [],
      evidenceStatus: 'pending',
    });
    tasks.push({
      id: `dispute-${dispute.dispute_id}-resolution`,
      name: `Resolution: ${dispute.dispute_outcome?.outcome_code ? dispute.dispute_outcome.outcome_code : 'Pending'}`,
      startDate: resolutionDate,
      endDate: resolutionDate,
      duration: 0,
      durationUnit: 'd',
      percentDone: dispute.status === 'RESOLVED' ? 100 : 0,
      parentId: 'project-root',
      type: 'milestone',
      disputeId: dispute.dispute_id,
    });
  });

  return tasks;
}

// Demo evidence data
function getDemoEvidence(disputeId: string): EvidenceItem[] {
  const evidenceMap: Record<string, EvidenceItem[]> = {
    'PP-D-1001': [
      { id: 'e1', disputeId: 'PP-D-1001', type: 'tracking', name: 'FedEx Tracking #123456789', status: 'submitted', submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e2', disputeId: 'PP-D-1001', type: 'communication', name: 'Email thread with buyer', status: 'submitted', submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e3', disputeId: 'PP-D-1001', type: 'receipt', name: 'Order receipt #ORD-789', status: 'required' },
      { id: 'e4', disputeId: 'PP-D-1001', type: 'contract', name: 'Service agreement', status: 'required' },
    ],
    'PP-D-1002': [
      { id: 'e5', disputeId: 'PP-D-1002', type: 'tracking', name: 'UPS Tracking #987654321', status: 'verified', submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e6', disputeId: 'PP-D-1002', type: 'receipt', name: 'Purchase receipt', status: 'verified', submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e7', disputeId: 'PP-D-1002', type: 'communication', name: 'Buyer messages', status: 'submitted', submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e8', disputeId: 'PP-D-1002', type: 'photo', name: 'Product photos', status: 'required' },
    ],
    'PP-D-1003': [
      { id: 'e9', disputeId: 'PP-D-1003', type: 'tracking', name: 'DHL Tracking #555666777', status: 'verified', submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), verifiedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e10', disputeId: 'PP-D-1003', type: 'contract', name: 'Terms of service', status: 'verified', submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), verifiedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e11', disputeId: 'PP-D-1003', type: 'receipt', name: 'Invoice #INV-456', status: 'verified', submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), verifiedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e12', disputeId: 'PP-D-1003', type: 'communication', name: 'Resolution emails', status: 'verified', submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  };
  return evidenceMap[disputeId] || [];
}

export function GanttClient() {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [useBryntum, setUseBryntum] = useState(false);
  const [bryntumReady, setBryntumReady] = useState(false);
  const [bryntumComps, setBryntumComps] = useState<{ Gantt: any; ProjectModel: any } | null>(null);
  const [projectConfig, setProjectConfig] = useState<any>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'evidence' | 'disputes'>('timeline');

  const eventSourceRef = useRef<EventSource | null>(null);
  const projectModelRef = useRef<any>(null);
  const ganttRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dispute list for sidebar
  const disputes = useMemo(() => {
    const disputeIds = new Set(tasks.filter(t => t.disputeId).map(t => t.disputeId!).filter(Boolean));
    return Array.from(disputeIds);
  }, [tasks]);

  // Load data
  useEffect(() => {
    const now = Date.now();
    const demoDisputes: Dispute[] = [
      {
        dispute_id: 'PP-D-1001',
        create_time: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
        update_time: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OPEN',
        dispute_amount: { value: '249.99', currency_code: 'USD' },
        reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
        dispute_channel: 'EXTERNAL',
      },
      {
        dispute_id: 'PP-D-1002',
        create_time: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
        update_time: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'UNDER_REVIEW',
        dispute_amount: { value: '89.50', currency_code: 'USD' },
        reason: 'UNAUTHORIZED',
        dispute_channel: 'EXTERNAL',
      },
      {
        dispute_id: 'PP-D-1003',
        create_time: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        update_time: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'RESOLVED',
        dispute_amount: { value: '5600.00', currency_code: 'USD' },
        reason: 'ITEM_NOT_AS_DESCRIBED',
        dispute_channel: 'INTERNAL',
        dispute_outcome: { outcome_code: 'RESOLVED_BUYER_FAVOUR' },
      },
    ] as any;

    const transformed = transformDisputeToTasks(demoDisputes);
    setTasks(transformed);
    setIsLoading(false);
  }, []);

  // Load Bryntum Gantt - PRIMARY RENDERER (no env flag check)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;
    (async () => {
      try {
        // Always attempt to load Bryntum - it's the primary renderer now
        // Try to import CSS
        try {
          // @ts-ignore - CSS imports don't have type declarations
          const ganttCss = await import('@bryntum/gantt/gantt.css');
          // @ts-ignore - CSS imports don't have type declarations
          const stockholmCss = await import('@bryntum/gantt/stockholm-light.css');
        } catch (cssErr) {
          console.warn('Bryntum CSS not available, continuing without', cssErr);
        }

        const mod = await import('@bryntum/gantt-react');
        if (mounted && mod?.BryntumGantt) {
          setBryntumComps({ Gantt: mod.BryntumGantt, ProjectModel: mod.BryntumGanttProjectModel });
          setUseBryntum(true);
        }
      } catch (e) {
        console.warn('Bryntum not available, using fallback view', e);
        setUseBryntum(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Build project config when tasks ready and Bryntum loaded
  useEffect(() => {
    if (!useBryntum || !bryntumComps || tasks.length === 0) return;
    try {
      // Dynamic imports for Bryntum models
      const ganttModule = require('@bryntum/gantt');
      const { DependencyModel, ResourceModel, TaskModel, CalendarModel } = ganttModule;

      const calendar = new CalendarModel({ name: 'PayOps Standard' });

      // Create dependencies between tasks
      const dependencies = tasks
        .filter(t => t.parentId && t.type !== 'milestone')
        .map((t, i) => {
          const parent = tasks.find(p => p.id === t.parentId);
          if (parent) {
            return {
              id: `dep-${i}`,
              fromTask: parent.id,
              toTask: t.id,
              type: 0, // Start-to-Start
            };
          }
          return null;
        })
        .filter(Boolean);

      setProjectConfig({
        calendars: [calendar],
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        autoCalculatePercentDoneForParentTasks: true,
        autoLoad: true,
        tasks,
        dependencies,
        dependencyStore: { modelClass: DependencyModel, data: dependencies },
        resourceStore: { modelClass: ResourceModel, data: [] },
        eventStore: { modelClass: TaskModel, data: tasks },
      });
      setBryntumReady(true);
    } catch (e) {
      console.warn('Failed to build Bryntum config, using fallback', e);
      setUseBryntum(false);
    }
  }, [useBryntum, bryntumComps, tasks]);

  // SSE connection
  useEffect(() => {
    try {
      const es = new EventSource('/api/webhooks/stream');
      eventSourceRef.current = es;
      es.onopen = () => setSseConnected(true);
      es.onmessage = () => setLastUpdate(new Date());
      es.onerror = () => setSseConnected(false);
      return () => {
        es.close();
        eventSourceRef.current = null;
        setSseConnected(false);
      };
    } catch {
      setSseConnected(false);
    }
  }, []);

  // Draw fallback canvas timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // background
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);
    // grid
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // bars
    const visibleTasks = tasks.filter(t => t.type !== 'summary' && t.type !== 'milestone').slice(0, 12);
    visibleTasks.forEach((t, i) => {
      const y = 40 + i * 32;
      const barW = 120 + (i % 5) * 40;
      const x = 60 + (i % 4) * 30;
      ctx.fillStyle = t.lockedByPayment ? '#ef4444' : i % 3 === 0 ? '#06b6d4' : i % 3 === 1 ? '#f59e0b' : '#22c55e';
      ctx.fillRect(x, y, barW, 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px sans-serif';
      ctx.fillText((t.name || '').slice(0, 40), x + 6, y + 12);
    });
    // milestone diamonds
    const milestones = tasks.filter(t => t.type === 'milestone').slice(0, 6);
    milestones.forEach((m, i) => {
      const x = 700 - i * 30;
      const y = 50 + i * 40;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.fill();
    });
  }, [tasks]);

  const lockedCount = tasks.filter(t => (t as any).lockedByPayment).length || 1;
  const disputeCount = tasks.filter(t => t.disputeId && t.type !== 'milestone').length || (tasks.length ? Math.max(1, tasks.length - 1) : 0);

  const handleDisputeSelect = useCallback((disputeId: string) => {
    setSelectedDisputeId(disputeId);
    setEvidenceItems(getDemoEvidence(disputeId));
    setEvidencePanelOpen(true);
    setActiveTab('evidence');
  }, []);

  const handleEvidenceAction = useCallback((evidenceId: string, action: 'submit' | 'verify' | 'reject') => {
    setEvidenceItems(prev => prev.map(e => {
      if (e.id !== evidenceId) return e;
      if (action === 'submit') return { ...e, status: 'submitted', submittedAt: new Date().toISOString() };
      if (action === 'verify') return { ...e, status: 'verified', verifiedAt: new Date().toISOString() };
      return { ...e, status: 'rejected' };
    }));
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          <p className="text-lg">Loading PayPal disputes & building timeline...</p>
        </div>
      </div>
    );
  }

  const showBryntum = useBryntum && bryntumReady && bryntumComps && projectConfig;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }} data-testid="gantt-container">
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 px-6 py-4" data-testid="gantt-header">
        <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="gantt-title">Bryntum Gantt - Dispute Triage Timeline</h1>
            <p className="text-gray-400 text-sm mt-1">ChronoGraph Scheduling • Payment-Locked Milestones • Real-time Webhook Sync • Dispute Evidence Control</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-600 text-white text-sm" data-testid="payment-lock-badge">
              <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse"></span>
              Payment Lock Active
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded ${sseConnected ? 'bg-green-600' : 'bg-yellow-600'} text-white text-sm`} data-testid="sse-status">
              <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-300 animate-pulse' : 'bg-yellow-300'}`}></span>
              {sseConnected ? 'Live' : 'Reconnecting...'}
            </div>
            {lastUpdate && (
              <span className="text-sm text-gray-400">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Dispute Evidence Control Bar */}
      <div className="bg-gray-800/80 border-b border-gray-700 px-4 py-3" data-testid="evidence-control-bar">
        <div className="max-w-full mx-auto">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mb-3 p-1 bg-gray-900/50 rounded-lg">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'timeline' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              data-testid="tab-timeline"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'evidence' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              data-testid="tab-evidence"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Evidence Control
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'disputes' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              data-testid="tab-disputes"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Disputes
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'timeline' && (
            <div className="flex items-center gap-3 text-sm text-gray-400" data-testid="timeline-controls">
              <div className="flex items-center gap-2">
                <span>Zoom:</span>
                <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs">+</button>
                <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs">−</button>
                <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-xs">Fit to Screen</button>
              </div>
              <div className="flex-1"></div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-500"></span> Triage</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500"></span> Evidence</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Payment Locked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Resolution</span>
              </div>
            </div>
          )}

          {activeTab === 'evidence' && selectedDisputeId && (
            <div className="space-y-3" data-testid="evidence-controls">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Evidence for {selectedDisputeId}
                </h3>
                <button
                  onClick={() => { setEvidencePanelOpen(false); setSelectedDisputeId(null); }}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Close Panel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {evidenceItems.map((evidence) => (
                  <div
                    key={evidence.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      evidence.status === 'verified' ? 'bg-green-600/20 border-green-500/30' :
                      evidence.status === 'submitted' ? 'bg-amber-600/20 border-amber-500/30' :
                      evidence.status === 'rejected' ? 'bg-red-600/20 border-red-500/30' :
                      'bg-gray-800/50 border-gray-700'
                    }`}
                    data-testid={`evidence-${evidence.id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        evidence.type === 'tracking' ? 'bg-blue-600/30 text-blue-300' :
                        evidence.type === 'communication' ? 'bg-purple-600/30 text-purple-300' :
                        evidence.type === 'receipt' ? 'bg-green-600/30 text-green-300' :
                        evidence.type === 'contract' ? 'bg-cyan-600/30 text-cyan-300' :
                        evidence.type === 'photo' ? 'bg-pink-600/30 text-pink-300' :
                        'bg-gray-600/30 text-gray-300'
                      }`}>
                        {evidence.type}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        evidence.status === 'verified' ? 'bg-green-600 text-white' :
                        evidence.status === 'submitted' ? 'bg-amber-600 text-white' :
                        evidence.status === 'rejected' ? 'bg-red-600 text-white' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {evidence.status}
                      </span>
                    </div>
                    <p className="text-sm text-white truncate">{evidence.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {evidence.status === 'required' && (
                        <button
                          onClick={() => handleEvidenceAction(evidence.id, 'submit')}
                          className="flex-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded transition-colors"
                        >
                          Submit
                        </button>
                      )}
                      {evidence.status === 'submitted' && (
                        <button
                          onClick={() => handleEvidenceAction(evidence.id, 'verify')}
                          className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                        >
                          Verify
                        </button>
                      )}
                      {evidence.status !== 'verified' && (
                        <button
                          onClick={() => handleEvidenceAction(evidence.id, 'reject')}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                    {evidence.submittedAt && (
                      <p className="text-xs text-gray-400 mt-1">Submitted: {new Date(evidence.submittedAt).toLocaleDateString()}</p>
                    )}
                    {evidence.verifiedAt && (
                      <p className="text-xs text-green-400 mt-1">Verified: {new Date(evidence.verifiedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
              {/* Evidence Summary */}
              <div className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Completion</div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${evidenceItems.filter(e => e.status === 'verified' || e.status === 'submitted').length / evidenceItems.length * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="text-green-400">✓ {evidenceItems.filter(e => e.status === 'verified').length} Verified</span>
                  <span className="text-amber-400">⏳ {evidenceItems.filter(e => e.status === 'submitted').length} Submitted</span>
                  <span className="text-gray-400">◯ {evidenceItems.filter(e => e.status === 'required').length} Required</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'disputes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="disputes-list">
              {disputes.map((disputeId) => {
                const disputeTasks = tasks.filter(t => t.disputeId === disputeId && t.type !== 'milestone');
                const evidence = getDemoEvidence(disputeId);
                const isLocked = disputeTasks.some(t => t.lockedByPayment);
                const firstTask = disputeTasks[0];
                const percentDone = firstTask?.percentDone ?? 0;
                const status = percentDone === 100 ? 'resolved' : percentDone > 0 ? 'under-review' : 'open';

                return (
                  <button
                    key={disputeId}
                    onClick={() => handleDisputeSelect(disputeId)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedDisputeId === disputeId ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20' :
                      'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                    data-testid={`dispute-${disputeId}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-cyan-300 text-sm">{disputeId}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            status === 'resolved' ? 'bg-green-600 text-white' :
                            status === 'under-review' ? 'bg-amber-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{disputeTasks[0]?.name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          {isLocked && (
                            <span className="flex items-center gap-1 text-red-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V7a3 3 0 00-5.406-1.808L9.5 4.35A2.492 2.492 0 007.812 6H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zM9 7h6v1H9V7z"/></svg>
                              Payment Locked
                            </span>
                          )}
                          <span>{disputeTasks.length} phases</span>
                          <span>{evidence.length} evidence items</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex" style={{ minHeight: 0 }}>
        {/* Sidebar for dispute list when not in evidence tab */}
        {(activeTab === 'disputes' || activeTab === 'timeline') && (
          <aside className="w-72 bg-gray-900/80 border-r border-gray-700 overflow-y-auto p-4" data-testid="disputes-sidebar">
            <h3 className="font-semibold text-white mb-3">Active Disputes</h3>
            <div className="space-y-2">
              {disputes.map((disputeId) => {
                const disputeTasks = tasks.filter(t => t.disputeId === disputeId && t.type !== 'milestone');
                const evidence = getDemoEvidence(disputeId);
                const isLocked = disputeTasks.some(t => t.lockedByPayment);
                const firstTask = disputeTasks[0];
                const percentDone = firstTask?.percentDone ?? 0;
                const status = percentDone === 100 ? 'resolved' : percentDone > 0 ? 'under-review' : 'open';

                return (
                  <button
                    key={disputeId}
                    onClick={() => handleDisputeSelect(disputeId)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedDisputeId === disputeId ? 'border-cyan-500 bg-cyan-500/10' :
                      'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                    data-testid={`sidebar-dispute-${disputeId}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-cyan-300 text-sm truncate">{disputeId}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        status === 'resolved' ? 'bg-green-600 text-white' :
                        status === 'under-review' ? 'bg-amber-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-1">{disputeTasks[0]?.name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      {isLocked && <span className="text-red-400">🔒</span>}
                      <span>{evidence.filter(e => e.status === 'verified').length}/{evidence.length} verified</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Main Gantt Area */}
        <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
          {/* Always-visible canvas for E2E when Bryntum not showing */}
          <canvas
            ref={canvasRef}
            width={1200}
            height={420}
            className="w-full h-full"
            style={{ display: showBryntum ? 'none' : 'block', background: '#0b1220' }}
            data-testid="gantt-canvas"
          />
          {showBryntum && (
            <>
              <bryntumComps.ProjectModel
                ref={(el: any) => {
                  if (el?.instance) projectModelRef.current = el.instance;
                }}
                {...projectConfig}
              />
              <bryntumComps.Gantt
                ref={ganttRef}
                project={projectModelRef.current}
                columns={[
                  { type: 'name', field: 'name', text: 'Task', width: 300 },
                  { type: 'startdate', text: 'Start' },
                  { type: 'enddate', text: 'End' },
                  { type: 'percentdone', text: '% Done' },
                  { type: 'priority', field: 'priority', text: 'Priority', width: 80 },
                ]}
                viewPreset="weekAndDayLetter"
                height="100%"
                width="100%"
                // Enable features
                dependencyLines={{ defaultColor: '#06b6d4' }}
                eventColor="#06b6d4"
                disabledEventColor="#64748b"
                highlightWeekends={true}
                weekendBackgroundColor="#11131A"
              />
            </>
          )}
          {!showBryntum && tasks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
              No timeline data available
            </div>
          )}
        </div>
      </div>

      <footer className="bg-gray-900/80 border-t border-gray-700 px-6 py-3">
        <div className="max-w-full mx-auto flex flex-wrap items-center gap-6 text-sm text-gray-400">
          <div>ChronoGraph Engine: Active</div>
          <div>Payment-locked milestones: {lockedCount}</div>
          <div>Active disputes: {disputeCount}</div>
          <div>SSE: {sseConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
          <div>Renderer: {showBryntum ? '🌲 Bryntum Gantt (Primary)' : '🎨 Canvas Fallback'}</div>
        </div>
      </footer>

      {/* Evidence Detail Panel - Slide in from right */}
      {evidencePanelOpen && selectedDisputeId && (
        <aside className="fixed right-0 top-0 h-full z-50 w-96 lg:w-[420px] bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col animate-slide-in" data-testid="evidence-detail-panel">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Evidence Detail
            </h3>
            <button
              onClick={() => { setEvidencePanelOpen(false); setSelectedDisputeId(null); }}
              className="p-2 text-gray-400 hover:text-white rounded hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">Dispute: <span className="font-mono text-cyan-300">{selectedDisputeId}</span></p>
              <p className="text-sm text-gray-400 mt-1">
                Required: {evidenceItems.filter(e => e.status === 'required').length} |
                Submitted: {evidenceItems.filter(e => e.status === 'submitted').length} |
                Verified: {evidenceItems.filter(e => e.status === 'verified').length}
              </p>
            </div>

            <div className="space-y-2">
              {evidenceItems.map((evidence) => (
                <div
                  key={evidence.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    evidence.status === 'verified' ? 'bg-green-600/10 border-green-500/30' :
                    evidence.status === 'submitted' ? 'bg-amber-600/10 border-amber-500/30' :
                    evidence.status === 'rejected' ? 'bg-red-600/10 border-red-500/30' :
                    'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          evidence.type === 'tracking' ? 'bg-blue-600/30 text-blue-300' :
                          evidence.type === 'communication' ? 'bg-purple-600/30 text-purple-300' :
                          evidence.type === 'receipt' ? 'bg-green-600/30 text-green-300' :
                          evidence.type === 'contract' ? 'bg-cyan-600/30 text-cyan-300' :
                          evidence.type === 'photo' ? 'bg-pink-600/30 text-pink-300' :
                          'bg-gray-600/30 text-gray-300'
                        }`}>
                          {evidence.type}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          evidence.status === 'verified' ? 'bg-green-600 text-white' :
                          evidence.status === 'submitted' ? 'bg-amber-600 text-white' :
                          evidence.status === 'rejected' ? 'bg-red-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {evidence.status}
                        </span>
                      </div>
                      <h4 className="font-medium text-white">{evidence.name}</h4>
                      <p className="text-xs text-gray-400 mt-1">ID: {evidence.id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {evidence.status === 'required' && (
                        <button
                          onClick={() => handleEvidenceAction(evidence.id, 'submit')}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
                        >
                          Submit
                        </button>
                      )}
                      {evidence.status === 'submitted' && (
                        <button
                          onClick={() => handleEvidenceAction(evidence.id, 'verify')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors"
                        >
                          Verify
                        </button>
                      )}
                      {evidence.status !== 'verified' && (
                        <button
                          onClick={() => handleEvidenceAction(evidence.id, 'reject')}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    {evidence.submittedAt && (
                      <span>Submitted: {new Date(evidence.submittedAt).toLocaleString()}</span>
                    )}
                    {evidence.verifiedAt && (
                      <span className="text-green-400">Verified: {new Date(evidence.verifiedAt).toLocaleString()}</span>
                    )}
                    {evidence.url && (
                      <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                        View Document
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-700 bg-gray-950/50">
            <button
              onClick={() => { setEvidencePanelOpen(false); setSelectedDisputeId(null); }}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Close Panel
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-slide-in { animation: slide-in 0.3s ease-out; }
`;
if (typeof document !== 'undefined' && !document.querySelector('#gantt-styles')) {
  style.id = 'gantt-styles';
  document.head.appendChild(style);
}

declare global {
  interface Window {
    paypal: any;
  }
}