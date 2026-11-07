// PayPal Agent Orchestrator
// Integrates @paypal/agent-toolkit with PolicyLedgerVerifier for autonomous vs approval enforcement

import { PayPalAgentToolkit, PayPalWorkflows } from '@paypal/agent-toolkit/ai-sdk';
import {
  PolicyLedgerVerifier,
  PolicyContext,
  PolicyDecision,
  ApprovalRequest,
  getPolicyVerifier,
  DEFAULT_POLICIES,
} from '../packages/shared/src/policy';
import { Money } from '../packages/shared/src/schema';
import { paypalAuth } from './paypal-auth';

// Types from @paypal/agent-toolkit/ai-sdk (not exported, redefined locally)
interface Context {
  merchant_id?: string;
  sandbox?: boolean;
  access_token?: string;
  request_id?: string;
  tenant_context?: any;
  debug?: boolean;
  [key: string]: any;
}

interface Configuration {
  actions: {
    [product: string]: {
      [action: string]: boolean;
    };
  };
  context?: Context;
}

interface PayPalClient {
  getAccessToken(): Promise<string>;
  getBaseUrl(): string;
  getHeaders(): Promise<Record<string, string>>;
}

/**
 * Agent Orchestrator Configuration
 */
export interface OrchestratorConfig {
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
  merchantId?: string;
  // Custom policy rules (merged with DEFAULT_POLICIES)
  customPolicies?: typeof DEFAULT_POLICIES;
  // Whether to enable debug logging
  debug?: boolean;
}

/**
 * Action result with policy decision
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  decision: PolicyDecision;
  approvalRequest?: ApprovalRequest;
  error?: string;
}

/**
 * Tool execution context for policy checking
 */
export interface ToolExecutionContext {
  actionType: string;
  amount: Money;
  userId?: string;
  userRole?: string;
  metadata?: Record<string, unknown>;
}

/**
 * PayPal Agent Orchestrator
 *
 * Combines @paypal/agent-toolkit function calling with PolicyLedgerVerifier
 * to enforce autonomous vs approval caps on all agent actions.
 */
export class PayPalAgentOrchestrator {
  private toolkit: PayPalAgentToolkit;
  private workflows: PayPalWorkflows;
  private verifier: PolicyLedgerVerifier;
  private client: PayPalClient;
  private config: OrchestratorConfig;
  private pendingApprovals: Map<string, { context: ToolExecutionContext; resolve: (result: ActionResult) => void; reject: (error: Error) => void }> = new Map();

  constructor(config: OrchestratorConfig) {
    this.config = config;

    // Build agent-toolkit configuration
    const agentConfig: Configuration = {
      actions: {
        invoicing: {
          create: true,
          send: true,
          cancel: true,
          generate_qr_code: true,
        },
        checkout: {
          create: true,
          capture: true,
          get: true,
        },
        billing: {
          create_plan: true,
          create_subscription: true,
          cancel_subscription: true,
        },
        catalogs: {
          create_product: true,
          list_products: true,
        },
        reporting: {
          transactions: true,
          balances: true,
        },
        disputes: {
          list: true,
          get: true,
          accept_claim: true,
        },
        payouts: {
          create: true,
        },
      },
      context: {
        merchant_id: config.merchantId,
        sandbox: config.sandbox ?? true,
        debug: config.debug ?? false,
      },
    };

    // Initialize agent-toolkit components
    this.toolkit = new PayPalAgentToolkit({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      configuration: agentConfig,
    });

    this.workflows = new PayPalWorkflows({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      configuration: agentConfig,
      log: config.debug ? console.log : undefined,
    });

    // Get the underlying PayPalClient for direct API access
    this.client = this.toolkit.client;

    // Initialize PolicyLedgerVerifier with custom or default policies
    const policies = config.customPolicies ?? DEFAULT_POLICIES;
    this.verifier = getPolicyVerifier(policies);

    if (config.debug) {
      console.log('[PayPalAgentOrchestrator] Initialized with policies:', policies.map(p => p.id));
    }
  }

  /**
   * Get available tools for AI SDK / LangChain / OpenAI agents
   */
  getTools() {
    return this.toolkit.getTools();
  }

  /**
   * Get the underlying PayPalClient for direct API calls
   */
  getClient(): PayPalClient {
    return this.client;
  }

  /**
   * Get the PolicyLedgerVerifier for direct policy evaluation
   */
  getVerifier(): PolicyLedgerVerifier {
    return this.verifier;
  }

  /**
   * Evaluate a tool execution against policy before execution
   */
  evaluatePolicy(context: ToolExecutionContext): PolicyDecision {
    const policyContext: PolicyContext = {
      actionType: context.actionType,
      amount: context.amount,
      currency: context.amount.currency_code,
      userId: context.userId,
      userRole: context.userRole,
      metadata: context.metadata,
    };

    return this.verifier.evaluate(policyContext);
  }

  /**
   * Execute a tool with policy enforcement
   *
   * @param toolName - Name of the tool to execute (from agent-toolkit)
   * @param toolArgs - Arguments for the tool
   * @param policyContext - Policy context for enforcement
   * @returns ActionResult with decision and data
   */
  async executeTool<T = unknown>(
    toolName: string,
    toolArgs: Record<string, unknown>,
    policyContext: ToolExecutionContext
  ): Promise<ActionResult<T>> {
    // Evaluate policy first
    const decision = this.evaluatePolicy(policyContext);

    if (!decision.allowed) {
      return {
        success: false,
        decision,
        error: decision.reason,
      };
    }

    // If approval required, create approval request and wait
    if (decision.requiresApproval) {
      const approval = this.verifier.requestApproval(
        {
          actionType: policyContext.actionType,
          amount: policyContext.amount,
          currency: policyContext.amount.currency_code,
          userId: policyContext.userId,
          userRole: policyContext.userRole,
          metadata: policyContext.metadata,
        },
        decision
      );

      // Return pending approval - caller must handle approval flow
      return {
        success: false,
        decision,
        approvalRequest: approval,
        error: `Approval required. Request ID: ${approval.id}. Required roles: ${decision.approverRoles?.join(', ')}`,
      };
    }

    // Execute the tool via agent-toolkit
    try {
      const tools = this.toolkit.getTools();
      const tool = tools[toolName];

      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Execute the tool (execute is optional in Tool type)
      if (!tool.execute) {
        throw new Error(`Tool ${toolName} has no execute function`);
      }
      const result = await tool.execute(toolArgs, { toolCallId: decision.idempotencyKey, messages: [], abortSignal: undefined });

      // Record successful action in ledger
      const executeFn = async () => ({
        transactionId: decision.idempotencyKey,
        success: true,
        details: result,
      });

      const execResult = await this.verifier.executeAction(
        {
          actionType: policyContext.actionType,
          amount: policyContext.amount,
          currency: policyContext.amount.currency_code,
          userId: policyContext.userId,
          userRole: policyContext.userRole,
          metadata: policyContext.metadata,
        },
        decision,
        executeFn
      );

      return {
        success: execResult.success,
        data: result as T,
        decision,
        error: execResult.error,
      };
    } catch (error) {
      return {
        success: false,
        decision,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  /**
   * Execute a workflow with policy enforcement
   * Uses PayPalWorkflows for multi-step operations
   */
  async executeWorkflow(
    workflowName: 'generateOrder' | 'getDisputeDetails',
    userPrompt: string,
    systemPrompt: string,
    policyContext: ToolExecutionContext
  ): Promise<ActionResult<string>> {
    // Evaluate policy for the workflow
    const decision = this.evaluatePolicy(policyContext);

    if (!decision.allowed) {
      return {
        success: false,
        decision,
        error: decision.reason,
      };
    }

    if (decision.requiresApproval) {
      const approval = this.verifier.requestApproval(
        {
          actionType: policyContext.actionType,
          amount: policyContext.amount,
          currency: policyContext.amount.currency_code,
          userId: policyContext.userId,
          userRole: policyContext.userRole,
          metadata: policyContext.metadata,
        },
        decision
      );

      return {
        success: false,
        decision,
        approvalRequest: approval,
        error: `Approval required for workflow. Request ID: ${approval.id}`,
      };
    }

    try {
      let result: string;
      if (workflowName === 'generateOrder') {
        result = await this.workflows.generateOrder(
          {} as any, // LLM will be passed by caller
          userPrompt,
          systemPrompt
        );
      } else {
        result = await this.workflows.getDisputeDetails(
          {} as any,
          userPrompt
        );
      }

      // Record in ledger
      await this.verifier.executeAction(
        {
          actionType: policyContext.actionType,
          amount: policyContext.amount,
          currency: policyContext.amount.currency_code,
          userId: policyContext.userId,
          userRole: policyContext.userRole,
          metadata: policyContext.metadata,
        },
        decision,
        async () => ({ transactionId: decision.idempotencyKey, success: true })
      );

      return {
        success: true,
        data: result,
        decision,
      };
    } catch (error) {
      return {
        success: false,
        decision,
        error: error instanceof Error ? error.message : 'Workflow execution failed',
      };
    }
  }

  /**
   * Process an approval decision (approve/reject)
   */
  processApproval(approvalId: string, approverId: string, approved: boolean, reason?: string): ApprovalRequest {
    return this.verifier.processApproval(approvalId, approverId, approved, reason);
  }

  /**
   * Get all pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return this.verifier.getPendingApprovals();
  }

  /**
   * Get approval request by ID
   */
  getApprovalRequest(id: string): ApprovalRequest | undefined {
    return this.verifier.getApprovalRequest(id);
  }

  /**
   * Wait for approval (for async approval flows)
   * Returns a promise that resolves when approval is granted or rejected
   */
  waitForApproval(approvalId: string, timeoutMs: number = 300000): Promise<ApprovalRequest> {
    return new Promise((resolve, reject) => {
      const request = this.verifier.getApprovalRequest(approvalId);
      if (!request) {
        reject(new Error(`Approval request not found: ${approvalId}`));
        return;
      }

      if (request.status === 'approved') {
        resolve(request);
        return;
      }

      if (request.status === 'rejected') {
        reject(new Error(`Approval rejected: ${request.rejectionReason}`));
        return;
      }

      // Store resolver for when approval is processed
      this.pendingApprovals.set(approvalId, {
        context: {} as ToolExecutionContext,
        resolve: (result) => resolve(this.verifier.getApprovalRequest(approvalId)!),
        reject,
      });

      // Timeout
      setTimeout(() => {
        if (this.pendingApprovals.has(approvalId)) {
          this.pendingApprovals.delete(approvalId);
          reject(new Error(`Approval timeout: ${approvalId}`));
        }
      }, timeoutMs);
    });
  }

  /**
   * Verify ledger integrity
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    return this.verifier.verifyIntegrity();
  }

  /**
   * Get decision log
   */
  getDecisionLog(): PolicyDecision[] {
    return this.verifier.getDecisionLog();
  }

  /**
   * Reset orchestrator state (for testing)
   */
  reset(): void {
    this.verifier.reset();
    this.pendingApprovals.clear();
  }

  /**
   * Create an orchestrator from environment variables
   */
  static fromEnv(): PayPalAgentOrchestrator {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set');
    }

    return new PayPalAgentOrchestrator({
      clientId,
      clientSecret,
      sandbox: process.env.PAYPAL_SANDBOX !== 'false',
      merchantId: process.env.PAYPAL_MERCHANT_ID,
      debug: process.env.PAYPAL_DEBUG === 'true',
    });
  }
}

/**
 * Convenience function to create orchestrator and execute with policy in one call
 */
export async function evaluateAndExecuteWithOrchestrator(
  orchestrator: PayPalAgentOrchestrator,
  toolName: string,
  toolArgs: Record<string, unknown>,
  policyContext: ToolExecutionContext
): Promise<ActionResult> {
  return orchestrator.executeTool(toolName, toolArgs, policyContext);
}

/**
 * Singleton instance
 */
let orchestratorInstance: PayPalAgentOrchestrator | null = null;

export function getOrchestrator(config?: OrchestratorConfig): PayPalAgentOrchestrator {
  if (!orchestratorInstance) {
    if (!config) {
      config = {
        clientId: process.env.PAYPAL_CLIENT_ID!,
        clientSecret: process.env.PAYPAL_SECRET!,
        sandbox: process.env.PAYPAL_SANDBOX !== 'false',
        merchantId: process.env.PAYPAL_MERCHANT_ID,
        debug: process.env.PAYPAL_DEBUG === 'true',
      };
    }
    orchestratorInstance = new PayPalAgentOrchestrator(config);
  }
  return orchestratorInstance;
}

export function resetOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.reset();
    orchestratorInstance = null;
  }
}