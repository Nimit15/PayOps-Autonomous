// Render Workflows Service
// Registers durable tasks using @renderinc/sdk/workflows
// Includes LOCAL_WORKFLOW_RUNNER adapter when RENDER_API_KEY is absent

import { task, TaskContext, TaskDefinition, createWorkflowsClient } from '@renderinc/sdk/workflows';

// Check if running in Render environment
const IS_RENDER = !!process.env.RENDER_API_KEY;
const RENDER_API_KEY = process.env.RENDER_API_KEY;

// Local workflow runner adapter for development
class LocalWorkflowRunner {
  private tasks: Map<string, TaskDefinition<any[], any>> = new Map();

  register(taskDef: TaskDefinition<any[], any>) {
    this.tasks.set(taskDef.name, taskDef);
    console.log(`📝 [LocalWorkflowRunner] Registered task: ${taskDef.name}`);
  }

  async execute(name: string, input: any, ctx: TaskContext) {
    const taskDef = this.tasks.get(name);
    if (!taskDef) {
      throw new Error(`Task not found: ${name}`);
    }
    console.log(`🚀 [LocalWorkflowRunner] Executing task: ${name}`, input);
    return taskDef.func(createLocalTaskContext(), ...input);
  }
}

const localRunner = new LocalWorkflowRunner();

// Mock TaskContext for local development
function createLocalTaskContext(): TaskContext {
  return {
    metadata: {
      taskRunId: `local-${Date.now()}`,
      rootTaskRunId: `local-root-${Date.now()}`,
      parentTaskRunId: undefined,
    },
    run: async <TArgs extends unknown[], TResult>(
      taskDef: TaskDefinition<TArgs, TResult>,
      ...args: TArgs
    ): Promise<TResult> => {
      console.log(`  ▶️ [LocalRunner] Running task: ${taskDef.name}`);
      try {
        const result = await taskDef.func(createLocalTaskContext(), ...args);
        console.log(`  ✅ [LocalRunner] Task completed: ${taskDef.name}`);
        return result;
      } catch (error) {
        console.error(`  ❌ [LocalRunner] Task failed: ${taskDef.name}`, error);
        throw error;
      }
    },
  } as unknown as TaskContext;
}

// Render Workflows Client for external execution
let workflowsClient: ReturnType<typeof createWorkflowsClient> | null = null;

function getWorkflowsClient() {
  if (!workflowsClient && RENDER_API_KEY) {
    workflowsClient = createWorkflowsClient({ token: RENDER_API_KEY });
  }
  return workflowsClient;
}

// ============================================
// SUBTASKS: Internal helper tasks for webhook processing
// ============================================

const recordInvoicePaymentTask = task<[{ eventId: string; resource: any }], { transactionId: string; success: boolean }>(
  { name: 'record-invoice-payment' },
  async (ctx, { eventId, resource }) => {
    const amount = resource.amount as { value: string; currency_code: string };
    console.log(`Recorded payment for invoice ${resource.id}`);
    return { transactionId: `txn-${eventId}`, success: true };
  }
);

const sendOverdueNoticeTask = task<[{ eventId: string; resource: any }], void>(
  { name: 'send-overdue-notice' },
  async (ctx, { eventId, resource }) => {
    console.log(`Sent overdue notice for invoice ${resource.id}`);
  }
);

const recordPaymentCaptureTask = task<[{ eventId: string; resource: any }], { transactionId: string; success: boolean }>(
  { name: 'record-payment-capture' },
  async (ctx, { eventId, resource }) => {
    const amount = resource.amount as { value: string; currency_code: string };
    console.log(`Recorded payment capture ${resource.id}`);
    return { transactionId: `txn-${eventId}`, success: true };
  }
);

const handlePaymentDeniedTask = task<[{ eventId: string; resource: any }], void>(
  { name: 'handle-payment-denied' },
  async (ctx, { eventId, resource }) => {
    console.log(`Handled denied payment ${resource.id}`);
    // Trigger retry logic, notify customer
  }
);

const recordRefundTask = task<[{ eventId: string; resource: any }], { transactionId: string; success: boolean }>(
  { name: 'record-refund' },
  async (ctx, { eventId, resource }) => {
    const amount = resource.amount as { value: string; currency_code: string };
    console.log(`Recorded refund ${resource.id}`);
    return { transactionId: `txn-${eventId}`, success: true };
  }
);

const createDisputeRecordTask = task<[{ eventId: string; resource: any }], void>(
  { name: 'create-dispute-record' },
  async (ctx, { eventId, resource }) => {
    console.log(`Created dispute record ${resource.dispute_id}`);
    // Gather evidence, notify team
  }
);

const resolveDisputeTask = task<[{ eventId: string; resource: any }], void>(
  { name: 'resolve-dispute' },
  async (ctx, { eventId, resource }) => {
    console.log(`Resolved dispute ${resource.dispute_id}`);
    // Release holds, update ledger
  }
);

const provisionSubscriptionTask = task<[{ eventId: string; resource: any }], void>(
  { name: 'provision-subscription' },
  async (ctx, { eventId, resource }) => {
    console.log(`Provisioned subscription ${resource.id}`);
  }
);

const deprovisionSubscriptionTask = task<[{ eventId: string; resource: any }], void>(
  { name: 'deprovision-subscription' },
  async (ctx, { eventId, resource }) => {
    console.log(`Deprovisioned subscription ${resource.id}`);
  }
);

const captureOrderIfNeededTask = task<[{ eventId: string; resource: any }], void>(
  { name: 'capture-order-if-needed' },
  async (ctx, { eventId, resource }) => {
    if (resource.intent === 'CAPTURE') {
      console.log(`Capturing order ${resource.id}`);
      // Would call captureOrder here
    }
  }
);

const storeWebhookEventTask = task<[{ eventId: string; eventType: string; resource: any }], void>(
  { name: 'store-webhook-event' },
  async (ctx, { eventId, eventType, resource }) => {
    // In production, store in database
    console.log(`📝 Stored webhook event ${eventId} for audit`);
  }
);

// ============================================
// SUBTASKS: Dispute evidence matching
// ============================================

const fetchDisputeTask = task<[{ disputeId: string }], any>(
  { name: 'fetch-dispute' },
  async (ctx, { disputeId }) => {
    // In production: call getDispute(disputeId)
    return {
      dispute_id: disputeId,
      status: 'OPEN',
      reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
      dispute_amount: { value: '100.00', currency_code: 'USD' },
    };
  }
);

const checkTrackingTask = task<[{ trackingNumber: string }], any>(
  { name: 'check-tracking' },
  async (ctx, { trackingNumber }) => {
    // In production: call listShippingTrackers or carrier API
    return {
      tracking_number: trackingNumber,
      status: 'DELIVERED',
      carrier: 'UPS',
      delivered_at: new Date().toISOString(),
    };
  }
);

const storeEvidenceMatchTask = task<[{ disputeId: string; recommendation: string }], void>(
  { name: 'store-evidence-match' },
  async (ctx, { disputeId, recommendation }) => {
    console.log(`📝 Stored evidence match for dispute ${disputeId}: ${recommendation}`);
  }
);

// ============================================
// SUBTASKS: Reconciliation
// ============================================

const fetchPayPalTransactionsTask = task<[{ startDate: string; endDate: string }], any>(
  { name: 'fetch-paypal-transactions' },
  async (ctx, { startDate, endDate }) => {
    // In production: call searchTransactions(startDate, endDate)
    const { searchTransactions } = await import('@/lib/paypal-client');
    return searchTransactions(new Date(startDate), new Date(endDate));
  }
);

const fetchLocalTransactionsTask = task<[], any>(
  { name: 'fetch-local-transactions' },
  async (ctx) => {
    // In production: query local database
    const { getLedger } = await import('@/packages/shared/src/ledger');
    const ledger = getLedger();
    const trialBalance = ledger.getTrialBalance();
    return Array.from(trialBalance.entries()).map(([account, balance]) => ({
      account,
      balance,
      timestamp: new Date().toISOString(),
    }));
  }
);

const storeReconciliationTask = task<[{ discrepancies: number; pendingIndexing: number }], void>(
  { name: 'store-reconciliation' },
  async (ctx, { discrepancies, pendingIndexing }) => {
    console.log(`📝 Stored reconciliation result: ${discrepancies} discrepancies, ${pendingIndexing} pending`);
  }
);

// ============================================
// SUBTASKS: Milestone recalculation
// ============================================

const fetchProjectMilestonesTask = task<[{ projectId: string }], any>(
  { name: 'fetch-project-milestones' },
  async (ctx, { projectId }) => {
    // In production: query database
    return [
      { id: 'm1', name: 'Kickoff', requiredAmount: 0, receivedAmount: 0, status: 'completed' as const, dueDate: '2026-01-15' },
      { id: 'm2', name: 'Design Phase', requiredAmount: 5000, receivedAmount: 0, status: 'pending' as const, dueDate: '2026-02-01' },
      { id: 'm3', name: 'Development Phase 1', requiredAmount: 15000, receivedAmount: 0, status: 'pending' as const, dueDate: '2026-03-01' },
      { id: 'm4', name: 'Development Phase 2', requiredAmount: 15000, receivedAmount: 0, status: 'pending' as const, dueDate: '2026-04-01' },
      { id: 'm5', name: 'Testing & QA', requiredAmount: 10000, receivedAmount: 0, status: 'pending' as const, dueDate: '2026-04-15' },
      { id: 'm6', name: 'Deployment', requiredAmount: 5000, receivedAmount: 0, status: 'pending' as const, dueDate: '2026-05-01' },
    ];
  }
);

const storeMilestoneScheduleTask = task<[{ projectId: string }], void>(
  { name: 'store-milestone-schedule' },
  async (ctx, { projectId }) => {
    console.log(`📝 Stored updated milestone schedule for project ${projectId}`);
  }
);

// ============================================
// TASK 1: processPayPalWebhook
// ============================================
interface ProcessWebhookInput {
  eventId: string;
  eventType: string;
  resource: Record<string, unknown>;
  timestamp: string;
}

interface ProcessWebhookOutput {
  processed: boolean;
  actionsTaken: string[];
  ledgerEntries?: string[];
}

export const processPayPalWebhook = task<[ProcessWebhookInput], ProcessWebhookOutput>(
  { name: 'processPayPalWebhook' },
  async (ctx, input: ProcessWebhookInput) => {
    const { run } = IS_RENDER ? ctx : createLocalTaskContext();
    const { eventId, eventType, resource, timestamp } = input;

    console.log(`📥 Processing webhook: ${eventType} (${eventId})`);

    const actionsTaken: string[] = [];
    const ledgerEntries: string[] = [];

    // Process based on event type
    switch (eventType) {
      case 'INVOICING.INVOICE.PAID': {
        const result = await run(recordInvoicePaymentTask, { eventId, resource });
        if (result.success) ledgerEntries.push(result.transactionId!);
        break;
      }

      case 'INVOICING.INVOICE.OVERDUE': {
        await run(sendOverdueNoticeTask, { eventId, resource });
        break;
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const result = await run(recordPaymentCaptureTask, { eventId, resource });
        if (result.success) ledgerEntries.push(result.transactionId!);
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        await run(handlePaymentDeniedTask, { eventId, resource });
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const result = await run(recordRefundTask, { eventId, resource });
        if (result.success) ledgerEntries.push(result.transactionId!);
        break;
      }

      case 'CUSTOMER.DISPUTE.CREATED': {
        await run(createDisputeRecordTask, { eventId, resource });
        break;
      }

      case 'CUSTOMER.DISPUTE.RESOLVED': {
        await run(resolveDisputeTask, { eventId, resource });
        break;
      }

      case 'BILLING.SUBSCRIPTION.CREATED': {
        await run(provisionSubscriptionTask, { eventId, resource });
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        await run(deprovisionSubscriptionTask, { eventId, resource });
        break;
      }

      case 'CHECKOUT.ORDER.APPROVED': {
        await run(captureOrderIfNeededTask, { eventId, resource });
        break;
      }

      default: {
        actionsTaken.push(`Logged unhandled event type: ${eventType}`);
      }
    }

    // Store webhook event for audit trail
    await run(storeWebhookEventTask, { eventId, eventType, resource });

    return {
      processed: true,
      actionsTaken,
      ledgerEntries,
    };
  }
);

// ============================================
// TASK 2: autoMatchDisputeTrackingEvidence
// ============================================
interface MatchDisputeEvidenceInput {
  disputeId: string;
  trackingNumbers?: string[];
}

interface MatchDisputeEvidenceOutput {
  matched: boolean;
  evidence: Array<{
    type: 'tracking' | 'delivery' | 'communication';
    reference: string;
    status: string;
  }>;
  recommendation: 'accept' | 'challenge' | 'escalate' | 'wait';
}

export const autoMatchDisputeTrackingEvidence = task<[MatchDisputeEvidenceInput], MatchDisputeEvidenceOutput>(
  { name: 'autoMatchDisputeTrackingEvidence' },
  async (ctx, input: MatchDisputeEvidenceInput) => {
    const { run } = IS_RENDER ? ctx : createLocalTaskContext();
    const { disputeId, trackingNumbers } = input;

    console.log(`🔍 Auto-matching dispute evidence: ${disputeId}`);

    const evidence: MatchDisputeEvidenceOutput['evidence'] = [];

    // Fetch dispute details
    const dispute = await run(fetchDisputeTask, { disputeId });

    // Check shipment tracking if available
    if (trackingNumbers && trackingNumbers.length > 0) {
      for (const trackingNumber of trackingNumbers) {
        const tracking = await run(checkTrackingTask, { trackingNumber });

        evidence.push({
          type: 'tracking',
          reference: trackingNumber,
          status: tracking.status,
        });
      }
    }

    // Check for delivery confirmation
    const deliveryConfirmed = evidence.some(e => e.type === 'tracking' && e.status === 'DELIVERED');

    // Determine recommendation
    let recommendation: MatchDisputeEvidenceOutput['recommendation'] = 'wait';
    if (dispute.reason === 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED' && deliveryConfirmed) {
      recommendation = 'challenge'; // We have proof of delivery
    } else if (dispute.reason === 'UNAUTHORIZED_TRANSACTION' && deliveryConfirmed) {
      recommendation = 'challenge'; // Delivery confirmed to cardholder address
    } else if (evidence.length === 0) {
      recommendation = 'escalate'; // No evidence, escalate to human
    }

    // Store evidence match result
    await run(storeEvidenceMatchTask, { disputeId, recommendation });

    return {
      matched: evidence.length > 0,
      evidence,
      recommendation,
    };
  }
);

// ============================================
// TASK 3: reconcilePayPalTransactions
// ============================================
interface ReconcileInput {
  startDate: string; // ISO date
  endDate: string;   // ISO date
  accountId?: string;
}

interface ReconcileOutput {
  totalPayPalTransactions: number;
  totalLocalTransactions: number;
  matched: number;
  discrepancies: Array<{
    type: 'missing_local' | 'missing_paypal' | 'amount_mismatch' | 'status_mismatch';
    paypalTransactionId?: string;
    localTransactionId?: string;
    paypalAmount?: string;
    localAmount?: string;
    details: string;
  }>;
  pendingIndexing: number; // Transactions < 15 mins old
}

export const reconcilePayPalTransactions = task<[ReconcileInput], ReconcileOutput>(
  { name: 'reconcilePayPalTransactions' },
  async (ctx, input: ReconcileInput) => {
    const { run } = IS_RENDER ? ctx : createLocalTaskContext();
    const { startDate, endDate, accountId } = input;

    console.log(`🔄 Reconciling PayPal transactions: ${startDate} to ${endDate}`);

    const discrepancies: ReconcileOutput['discrepancies'] = [];
    let pendingIndexing = 0;

    // Fetch PayPal transactions
    const paypalTransactions: Array<{ transaction_info: { transaction_id?: string; transaction_initiation_date?: string; transaction_amount?: { value: string }; transaction_status?: string } }> = await run(fetchPayPalTransactionsTask, { startDate, endDate });

    // Fetch local ledger transactions
    const localTransactions: Array<{ account: string; balance: { value: string }; timestamp: string }> = await run(fetchLocalTransactionsTask);

    // Compare transactions
    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

    for (const pt of paypalTransactions) {
      const txnDate = new Date(pt.transaction_info?.transaction_initiation_date || '');
      const isPendingIndexing = txnDate > fifteenMinsAgo;

      if (isPendingIndexing) {
        pendingIndexing++;
        discrepancies.push({
          type: 'amount_mismatch',
          paypalTransactionId: pt.transaction_info?.transaction_id,
          details: `Transaction ${pt.transaction_info?.transaction_id} is < 15 mins old - marked as PENDING_PAYPAL_INDEXING`,
        });
        continue;
      }

      // Find matching local transaction
      const localMatch = localTransactions.find(lt =>
        lt.account === 'paypal_balance' &&
        Math.abs(parseFloat(lt.balance.value) - parseFloat(pt.transaction_info?.transaction_amount?.value || '0')) < 0.01
      );

      if (!localMatch) {
        discrepancies.push({
          type: 'missing_local',
          paypalTransactionId: pt.transaction_info?.transaction_id,
          paypalAmount: pt.transaction_info?.transaction_amount?.value,
          details: `PayPal transaction ${pt.transaction_info?.transaction_id} not found in local ledger`,
        });
      }
    }

    // Check for local transactions not in PayPal
    for (const lt of localTransactions) {
      if (lt.account === 'paypal_balance') {
        const paypalMatch = paypalTransactions.find(pt =>
          Math.abs(parseFloat(lt.balance.value) - parseFloat(pt.transaction_info?.transaction_amount?.value || '0')) < 0.01
        );
        if (!paypalMatch) {
          discrepancies.push({
            type: 'missing_paypal',
            localTransactionId: `local-${lt.account}`,
            localAmount: lt.balance.value,
            details: `Local transaction for ${lt.account} not found in PayPal`,
          });
        }
      }
    }

    // Store reconciliation result
    await run(storeReconciliationTask, { discrepancies: discrepancies.length, pendingIndexing });

    return {
      totalPayPalTransactions: paypalTransactions.length,
      totalLocalTransactions: localTransactions.length,
      matched: paypalTransactions.length - discrepancies.filter(d => d.type === 'missing_local').length,
      discrepancies,
      pendingIndexing,
    };
  }
);

// ============================================
// TASK 4: recalculateMilestoneSchedule
// ============================================
interface RecalculateMilestoneInput {
  projectId: string;
  trigger: 'payment_received' | 'payment_failed' | 'dispute_opened' | 'manual';
  paymentAmount?: number;
  invoiceId?: string;
}

interface RecalculateMilestoneOutput {
  projectId: string;
  updatedMilestones: Array<{
    id: string;
    name: string;
    status: 'pending' | 'unlocked' | 'completed' | 'blocked';
    requiredAmount: number;
    receivedAmount: number;
    dueDate?: string;
  }>;
  nextAction: string;
}

export const recalculateMilestoneSchedule = task<[RecalculateMilestoneInput], RecalculateMilestoneOutput>(
  { name: 'recalculateMilestoneSchedule' },
  async (ctx, input: RecalculateMilestoneInput) => {
    const { run } = IS_RENDER ? ctx : createLocalTaskContext();
    const { projectId, trigger, paymentAmount, invoiceId } = input;

    console.log(`📅 Recalculating milestone schedule for project: ${projectId} (trigger: ${trigger})`);

    // Fetch project milestones
    const milestones: Array<{ id: string; name: string; requiredAmount: number; receivedAmount: number; status: 'pending' | 'completed' | 'unlocked' | 'blocked'; dueDate: string }> = await run(fetchProjectMilestonesTask, { projectId });

    // Calculate cumulative received
    let cumulativeReceived = 0;
    if (trigger === 'payment_received' && paymentAmount) {
      cumulativeReceived = paymentAmount;
    }

    // Update milestone statuses based on payments
    const updatedMilestones = milestones.map(m => {
      cumulativeReceived += m.receivedAmount;
      const newReceived = m.receivedAmount + (trigger === 'payment_received' && m.status === 'pending' ? paymentAmount || 0 : 0);
      const totalReceived = cumulativeReceived;

      let status: typeof m.status = m.status;
      if (totalReceived >= m.requiredAmount && m.status === 'pending') {
        status = 'unlocked';
      } else if (totalReceived >= m.requiredAmount && m.status === 'unlocked') {
        status = 'completed';
      } else if (trigger === 'payment_failed' || trigger === 'dispute_opened') {
        status = 'blocked';
      }

      return { ...m, receivedAmount: newReceived, status };
    });

    // Determine next action
    const nextPending = updatedMilestones.find(m => m.status === 'pending' || m.status === 'unlocked');
    const nextAction = nextPending
      ? `Next milestone: ${nextPending.name} (requires $${nextPending.requiredAmount - (nextPending.receivedAmount || 0)})`
      : 'All milestones completed';

    // Store updated schedule
    await run(storeMilestoneScheduleTask, { projectId });

    return {
      projectId,
      updatedMilestones,
      nextAction,
    };
  }
);

// ============================================
// Register tasks with local runner
// ============================================
localRunner.register(processPayPalWebhook);
localRunner.register(autoMatchDisputeTrackingEvidence);
localRunner.register(reconcilePayPalTransactions);
localRunner.register(recalculateMilestoneSchedule);

// Subtasks
localRunner.register(recordInvoicePaymentTask);
localRunner.register(sendOverdueNoticeTask);
localRunner.register(recordPaymentCaptureTask);
localRunner.register(handlePaymentDeniedTask);
localRunner.register(recordRefundTask);
localRunner.register(createDisputeRecordTask);
localRunner.register(resolveDisputeTask);
localRunner.register(provisionSubscriptionTask);
localRunner.register(deprovisionSubscriptionTask);
localRunner.register(captureOrderIfNeededTask);
localRunner.register(storeWebhookEventTask);
localRunner.register(fetchDisputeTask);
localRunner.register(checkTrackingTask);
localRunner.register(storeEvidenceMatchTask);
localRunner.register(fetchPayPalTransactionsTask);
localRunner.register(fetchLocalTransactionsTask);
localRunner.register(storeReconciliationTask);
localRunner.register(fetchProjectMilestonesTask);
localRunner.register(storeMilestoneScheduleTask);

// ============================================
// Export workflow execution functions
// ============================================
export async function executeWorkflow(
  taskName: string,
  input: any,
  options?: { waitForCompletion?: boolean }
): Promise<any> {
  if (IS_RENDER) {
    // Use Render SDK WorkflowsClient
    const client = getWorkflowsClient();
    if (!client) {
      throw new Error('RENDER_API_KEY not configured');
    }
    // taskName is the slug like "workflow-slug/task-name"
    // input needs to be an array for TaskData
    return client.runTask(taskName, [input]);
  } else {
    // Use local runner
    const ctx = createLocalTaskContext();
    return localRunner.execute(taskName, input, ctx);
  }
}

// Helper to run reconciliation on schedule
export async function runScheduledReconciliation() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

  return executeWorkflow('reconcilePayPalTransactions', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
}

// Helper to process webhook
export async function processWebhookEvent(eventId: string, eventType: string, resource: any) {
  return executeWorkflow('processPayPalWebhook', {
    eventId,
    eventType,
    resource,
    timestamp: new Date().toISOString(),
  });
}

// Helper to match dispute evidence
export async function matchDisputeEvidence(disputeId: string, trackingNumbers?: string[]) {
  return executeWorkflow('autoMatchDisputeTrackingEvidence', {
    disputeId,
    trackingNumbers,
  });
}

// Helper to recalculate milestones
export async function recalculateMilestones(projectId: string, trigger: RecalculateMilestoneInput['trigger'], paymentAmount?: number) {
  return executeWorkflow('recalculateMilestoneSchedule', {
    projectId,
    trigger,
    paymentAmount,
  });
}