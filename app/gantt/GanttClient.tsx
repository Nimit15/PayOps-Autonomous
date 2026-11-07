'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';

// Import Bryntum models directly (they are classes, not React components)
import { TaskModel, DependencyModel, ResourceModel, CalendarModel, ProjectModel } from '@bryntum/gantt';

// Dynamically import Bryntum Gantt components to avoid SSR issues
// These are defined as lazy components so they only load on client
const BryntumGantt = (await import('@bryntum/gantt-react')).BryntumGantt;
const BryntumGanttProjectModel = (await import('@bryntum/gantt-react')).BryntumGanttProjectModel;

import { listDisputes, getDispute, getOrder } from '@/lib/paypal-client';
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
  lockedByPayment?: boolean; // Payment-locked milestone
  paymentId?: string;
  disputeId?: string;
  priority?: number;
  resourceIds?: string[];
}

interface GanttDependency {
  id: string;
  fromTask: string;
  toTask: string;
  type: 0 | 1 | 2 | 3; // 0=Start-to-Start, 1=Start-to-End, 2=End-to-Start, 3=End-to-End
  lag?: number;
  lagUnit?: 'h' | 'd' | 'w';
}

interface GanttResource {
  id: string;
  name: string;
  type?: 'person' | 'team' | 'equipment';
  calendarId?: string;
  email?: string;
}

function createProjectCalendar(): CalendarModel {
  const calendar = new CalendarModel({
    name: 'PayOps Standard',
    intervals: [
      // Monday - Thursday recurring working days
      {
        name: 'Weekday Working Hours',
        isWorking: true,
        recurrentStartDate: 'on Monday, Tuesday, Wednesday, Thursday', // later library syntax
        recurrentEndDate: 'on Monday, Tuesday, Wednesday, Thursday',
        recurrentDatesTimeZone: 'America/Los_Angeles',
        availability: [
          { startDate: '09:00', endDate: '17:00' },
        ],
      },
      // Friday short day
      {
        name: 'Friday Short Day',
        isWorking: true,
        recurrentStartDate: 'on Friday', // later library syntax
        recurrentEndDate: 'on Friday',
        recurrentDatesTimeZone: 'America/Los_Angeles',
        availability: [
          { startDate: '09:00', endDate: '15:00' },
        ],
      },
      // Weekend - non-working
      {
        name: 'Weekend',
        isWorking: false,
        recurrentStartDate: 'on Saturday, Sunday', // later library syntax
        recurrentEndDate: 'on Saturday, Sunday',
        recurrentDatesTimeZone: 'America/Los_Angeles',
      },
    ],
  });
  return calendar;
}

function transformDisputeToTasks(disputes: Dispute[]): { tasks: GanttTask[]; dependencies: GanttDependency[]; resources: GanttResource[] } {
  const tasks: GanttTask[] = [];
  const dependencies: GanttDependency[] = [];
  const resources: GanttResource[] = [];
  const resourceMap = new Map<string, GanttResource>();

  // Add a root project task
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
    const estimatedResolution = new Date(createDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks default

    // Add dispute team resource
    const resourceId = `dispute-team-${index % 3}`;
    if (!resourceMap.has(resourceId)) {
      const resource: GanttResource = {
        id: resourceId,
        name: `Dispute Team ${String.fromCharCode(65 + (index % 3))}`,
        type: 'team',
        calendarId: 'PayOps Standard',
        email: `dispute-team-${String.fromCharCode(97 + (index % 3))}@payops.example`,
      };
      resourceMap.set(resourceId, resource);
    }

    // Phase 1: Triage & Evidence Collection
    const triageTask: GanttTask = {
      id: `dispute-${dispute.dispute_id}-triage`,
      name: `Triage: ${dispute.reason}`,
      startDate: createDate,
      endDate: new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      duration: 3,
      durationUnit: 'd',
      percentDone: dispute.status === 'OPEN' ? 0 : dispute.status === 'UNDER_REVIEW' ? 50 : 100,
      parentId: 'project-root',
      cls: 'dispute-triage',
      disputeId: dispute.dispute_id,
      priority: dispute.dispute_amount && Number(dispute.dispute_amount.value) > 5000 ? 1 : 2,
      resourceIds: [resourceId],
    };
    tasks.push(triageTask);

    // Phase 2: Evidence Collection
    const evidenceTask: GanttTask = {
      id: `dispute-${dispute.dispute_id}-evidence`,
      name: `Evidence Collection`,
      startDate: new Date(triageTask.endDate as Date),
      endDate: new Date(Date.parse(triageTask.endDate as string) + 5 * 24 * 60 * 60 * 1000),
      duration: 5,
      durationUnit: 'd',
      percentDone: dispute.status === 'UNDER_REVIEW' ? 50 : 0,
      parentId: 'project-root',
      cls: 'dispute-evidence',
      disputeId: dispute.dispute_id,
      manuallyScheduled: false,
      resourceIds: [resourceId],
    };
    tasks.push(evidenceTask);

    // Phase 3: Submit Response (Payment-locked if merchant needs to pay)
    const isMerchantLiable = dispute.dispute_channel === 'EXTERNAL' || dispute.reason === 'UNAUTHORIZED';
    const responseTask: GanttTask = {
      id: `dispute-${dispute.dispute_id}-response`,
      name: `Submit Response${isMerchantLiable ? ' (Payment Locked)' : ''}`,
      startDate: new Date(evidenceTask.endDate as Date),
      endDate: new Date(Date.parse(evidenceTask.endDate as string) + 2 * 24 * 60 * 60 * 1000),
      duration: 2,
      durationUnit: 'd',
      percentDone: 0,
      parentId: 'project-root',
      cls: isMerchantLiable ? 'dispute-response payment-locked' : 'dispute-response',
      disputeId: dispute.dispute_id,
      manuallyScheduled: isMerchantLiable, // Payment-locked = manually scheduled until payment clears
      lockedByPayment: isMerchantLiable,
      resourceIds: [resourceId],
    };
    tasks.push(responseTask);

    // Phase 4: Resolution Milestone
    const resolutionTask: GanttTask = {
      id: `dispute-${dispute.dispute_id}-resolution`,
      name: `Resolution: ${dispute.dispute_outcome?.outcome_code ? dispute.dispute_outcome.outcome_code : 'Pending'}`,
      startDate: estimatedResolution,
      endDate: estimatedResolution,
      duration: 0,
      durationUnit: 'd',
      percentDone: dispute.status === 'RESOLVED' ? 100 : 0,
      parentId: 'project-root',
      type: 'milestone',
      cls: 'dispute-resolution',
      disputeId: dispute.dispute_id,
      resourceIds: [resourceId],
    };
    tasks.push(resolutionTask);

    // Dependencies: Triage -> Evidence -> Response -> Resolution
    dependencies.push(
      { id: `dep-${dispute.dispute_id}-1`, fromTask: triageTask.id, toTask: evidenceTask.id, type: 2 }, // End-to-Start
      { id: `dep-${dispute.dispute_id}-2`, fromTask: evidenceTask.id, toTask: responseTask.id, type: 2 },
      { id: `dep-${dispute.dispute_id}-3`, fromTask: responseTask.id, toTask: resolutionTask.id, type: 2 }
    );
  });

  return { tasks, dependencies, resources: [...resourceMap.values()] };
}

export function GanttClient() {
  const [projectConfig, setProjectConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const projectModelRef = useRef<ProjectModel | null>(null);
  const ganttRef = useRef<any>(null);

  // Load CSS on client side to avoid SSR issues
  useEffect(() => {
    require('@bryntum/gantt/gantt.css');
    require('@bryntum/gantt/stockholm-light.css');
    require('@bryntum/gantt/fontawesome/css/fontawesome.css');
    require('@bryntum/gantt/fontawesome/css/solid.css');
  }, []);

  // Build ProjectModel config for BryntumGanttProjectModel
  const buildProjectModelConfig = useCallback(async () => {
    try {
      const disputes = await listDisputes();
      const { tasks, dependencies, resources } = transformDisputeToTasks(disputes);
      const calendar = createProjectCalendar();

      return {
        calendars: [calendar],
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        autoCalculatePercentDoneForParentTasks: true,
        autoLoad: true,
        tasks,
        dependencies,
        dependencyStore: {
          modelClass: DependencyModel,
          data: dependencies,
        },
        resourceStore: {
          modelClass: ResourceModel,
          data: resources,
        },
        eventStore: {
          modelClass: TaskModel,
          data: tasks,
        },
      };
    } catch (error) {
      console.error('Failed to build ProjectModel config:', error);
      throw error;
    }
  }, []);

  // Initialize ProjectModel config and capture the instance
  useEffect(() => {
    async function initProjectModel() {
      try {
        const config = await buildProjectModelConfig();
        // The BryntumGanttProjectModel will create the instance, we just need the config
        // We'll set a flag that config is ready
        setProjectConfig(config);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Gantt:', error);
        setIsLoading(false);
      }
    }

    initProjectModel();
  }, [buildProjectModelConfig]);

  // Set up SSE connection for real-time webhook updates
  useEffect(() => {
    // Connect to SSE endpoint for real-time updates
    const es = new EventSource('/api/webhooks/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('✅ SSE connected for real-time Gantt updates');
      setSseConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'dispute_update' && data.dispute) {
          // We'll handle this by getting the project model from the Gantt ref
          if (projectModelRef.current) {
            handleDisputeUpdate(ganttRef.current.instance.project, data.dispute);
          }
        } else if (data.type === 'payment_capture' && data.payment) {
          if (projectModelRef.current) {
            handlePaymentCapture(ganttRef.current.instance.project, data.payment);
          }
        }
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    es.onerror = () => {
      console.warn('SSE connection error, retrying...');
      setSseConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setSseConnected(false);
    };
  }, []);

  const handleDisputeUpdate = useCallback((projectModel: ProjectModel, dispute: Dispute) => {
    const taskStore = projectModel.eventStore;
    const triageTask = taskStore.getById(`dispute-${dispute.dispute_id}-triage`) as TaskModel;
    const evidenceTask = taskStore.getById(`dispute-${dispute.dispute_id}-evidence`) as TaskModel;
    const responseTask = taskStore.getById(`dispute-${dispute.dispute_id}-response`) as TaskModel;
    const resolutionTask = taskStore.getById(`dispute-${dispute.dispute_id}-resolution`) as TaskModel;

    // Update task progress based on dispute status
    const statusMap: Record<string, { triage: number; evidence: number; response: number; resolution: number }> = {
      OPEN: { triage: 25, evidence: 0, response: 0, resolution: 0 },
      WAITING_FOR_BUYER_RESPONSE: { triage: 100, evidence: 50, response: 0, resolution: 0 },
      WAITING_FOR_SELLER_RESPONSE: { triage: 100, evidence: 100, response: 50, resolution: 0 },
      UNDER_REVIEW: { triage: 100, evidence: 100, response: 100, resolution: 0 },
      RESOLVED: { triage: 100, evidence: 100, response: 100, resolution: 100 },
    };

    const progress = statusMap[dispute.status] || { triage: 0, evidence: 0, response: 0, resolution: 0 };

    if (triageTask) triageTask.percentDone = progress.triage;
    if (evidenceTask) evidenceTask.percentDone = progress.evidence;
    if (responseTask) responseTask.percentDone = progress.response;
    if (resolutionTask) {
      resolutionTask.percentDone = progress.resolution;
      resolutionTask.name = `Resolution: ${dispute.dispute_outcome?.outcome_code ? dispute.dispute_outcome.outcome_code : 'Pending'}`;
    }

    // If payment locked and now resolved, unlock
    if (responseTask && dispute.status === 'RESOLVED' && (responseTask as any).lockedByPayment) {
      responseTask.manuallyScheduled = false;
      (responseTask as any).lockedByPayment = false;
      if (responseTask.cls) {
        const clsStr = responseTask.cls.toString();
        responseTask.cls = clsStr.replace(' payment-locked', '');
      }
    }
  }, []);

  const handlePaymentCapture = useCallback((projectModel: ProjectModel, payment: { id: string; invoice_id?: string; amount: { value: string; currency_code: string } }) => {
    const taskStore = projectModel.eventStore;

    // Find payment-locked tasks and unlock them
    taskStore.forEach((task) => {
      const customTask = task as any;
      if (customTask.lockedByPayment && customTask.paymentId === payment.id) {
        customTask.manuallyScheduled = false;
        customTask.lockedByPayment = false;
        if (customTask.cls) {
          const clsStr = customTask.cls.toString();
          customTask.cls = clsStr.replace(' payment-locked', '');
        }
        customTask.percentDone = 100;
      }
    });

    // Also check for disputes linked to this invoice
    if (payment.invoice_id) {
      taskStore.forEach((task) => {
        const customTask = task as any;
        if (customTask.disputeId) {
          // Trigger dispute refresh
          getDispute(customTask.disputeId).then(dispute => handleDisputeUpdate(projectModel, dispute)).catch(console.error);
        }
      });
    }
  }, [handleDisputeUpdate]);

  // Handle task edit to sync back to PayPal (for demo: just log)
  const onBeforeTaskSave = useCallback(async ({ source, taskRecord, editor }: any) => {
    console.log('Task updated:', taskRecord.id, taskRecord.name);
    if (taskRecord.disputeId) {
      // In production: call PayPal API to update dispute evidence, response, etc.
      console.log('Would sync dispute update to PayPal:', taskRecord.disputeId);
    }
    return true;
  }, []);

  const onBeforeDependencySave = useCallback(({ source, dependencyRecord, values }: any) => {
    console.log('Dependency updated:', dependencyRecord.id);
    return true;
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Bryntum Gantt - Dispute Triage Timeline</h1>
            <p className="text-gray-400 text-sm mt-1">ChronoGraph Scheduling • Payment-Locked Milestones • Real-time Webhook Sync</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded ${sseConnected ? 'bg-green-600' : 'bg-yellow-600'} text-white text-sm`}>
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

      {/* Toolbar */}
      <div className="bg-gray-800/80 border-b border-gray-700 px-4 py-3">
        <div className="max-w-full mx-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>Zoom:</span>
            <button
              onClick={() => ganttRef.current?.instance?.zoomIn()}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
            >+</button>
            <button
              onClick={() => ganttRef.current?.instance?.zoomOut()}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
            >−</button>
            <button
              onClick={() => ganttRef.current?.instance?.fitToScreen()}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-xs"
            >Fit to Screen</button>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-cyan-500"></span> Triage
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-500"></span> Evidence
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500"></span> Payment Locked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500"></span> Resolution
            </span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <BryntumGanttProjectModel
          ref={(el: any) => { if (el && el.instance) { projectModelRef.current = el.instance; console.log('ProjectModel created:', el.instance); } }}
          onDataReady={() => { console.log('ProjectModel data ready'); }}
          {...(projectConfig || {})}
        />
        <BryntumGantt
          startDate={new Date()}
          endDate={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)}
          viewPreset="weekAndDayLetter"
          rowHeight={40}
          barMargin={4}
          eventStyle="filled"
          columnLines={true}
          rowLines={true}
          showLagInTooltip={true}
          enableUndoRedoKeys={true}
          enableEventAnimations={true}
          plugins={[
            'dependencies',
            'taskedit',
            'taskmenu',
            'tasktooltip',
            'criticalpaths',
            'baselines',
            'rollups',
            'percentbar',
            'progressline',
            'nonworkingtime',
            'celltooltip',
            'filterbar',
            'columnpicker',
            'columnreorder',
            'columnresize',
            'headermenu',
            'viewpreset',
            'keymap',
          ] as any}
          columns={[
            { type: 'wbs', width: 50 },
            {
              type: 'name',
              field: 'name',
              width: 280,
              minWidth: 200,
              editor: { type: 'text' },
              renderer: ({ value, record }: any) => {
                const icons: Record<string, string> = {
                  'dispute-triage': '🔍',
                  'dispute-evidence': '📋',
                  'dispute-response': '📝',
                  'dispute-resolution': '⚖️',
                };
                const cls = record.cls || '';
                const type = Object.keys(icons).find(k => cls.includes(k)) || '';
                return `${icons[type] || '📄'} ${value}`;
              }
            },
            { type: 'startdate', field: 'startDate', format: 'MMM d', width: 100, editor: { type: 'date' } },
            { type: 'enddate', field: 'endDate', format: 'MMM d', width: 100, editor: { type: 'date' } },
            { type: 'duration', field: 'duration', width: 80, editor: { type: 'duration' } },
            {
              type: 'percentdone',
              field: 'percentDone',
              width: 100,
              editor: { type: 'number' },
              renderer: ({ value, record }: any) => {
                if (record.isMilestone) return '◆';
                return `${Math.round(value || 0)}%`;
              }
            },
            {
              field: 'priority',
              text: 'Priority',
              width: 70,
              renderer: ({ value }: any) => value === 1 ? '🔴 High' : '🟢 Normal'
            },
            {
              field: 'lockedByPayment',
              text: 'Payment Lock',
              width: 90,
              renderer: ({ value }: any) => value ? '🔒 Locked' : '🔓 Free',
            },
          ]}
          taskTooltipFeature={{
            fields: [
              { name: 'Dispute ID', field: 'disputeId' },
              { name: 'Priority', field: 'priority', renderer: (v: number) => v === 1 ? 'High' : 'Normal' },
              { name: 'Payment Locked', field: 'lockedByPayment', renderer: (v: boolean) => v ? 'Yes (awaiting payment)' : 'No' },
            ]
          }}
          dependencyEditFeature={true}
          taskEditFeature={{
            items: {
              general: true,
              advanced: true,
              resources: true,
              notes: true,
            },
          }}
          taskMenuFeature={{
            items: {
              addTaskBelow: true,
              addSubtask: true,
              removeTask: true,
              convertToMilestone: true,
              splitTask: true,
            },
          }}
          criticalPathsFeature={{
            highlight: true,
            maxCount: 3,
          }}
          baselinesFeature={{
            baselineIds: ['baseline-1', 'baseline-2'],
          }}
          progressLineFeature={{
            statusDate: new Date(),
            showForTasks: true,
          }}
          nonWorkingTimeFeature={{
            showCurrentTimeLine: true,
          }}
          filterBarFeature={true}
          columnPickerFeature={true}
          onBeforeTaskSave={onBeforeTaskSave}
          onBeforeDependencySave={onBeforeDependencySave}
          cls="h-full w-full"
          height="100%"
          width="100%"
        />
      </div>

      {/* Status Bar */}
      <footer className="bg-gray-900/80 border-t border-gray-700 px-6 py-3">
        <div className="max-w-full mx-auto flex flex-wrap items-center gap-6 text-sm text-gray-400">
          <div>ChronoGraph Engine: Active</div>
          <div>Payment-locked milestones: {projectModelRef.current?.eventStore?.query((t: any) => t.lockedByPayment)?.length || 0}</div>
          <div>Active disputes: {projectModelRef.current?.eventStore?.query((t: any) => t.disputeId && t.type !== 'milestone')?.length || 0}</div>
          <div>SSE: {sseConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
        </div>
      </footer>
    </div>
  );
}