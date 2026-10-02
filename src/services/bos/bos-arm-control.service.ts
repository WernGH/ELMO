/**
 * COAI B.O.S v2 — Two-Phase Arming Control Service (BosArmControlService)
 *
 * Implements the B.O.S Two-Phase Safety Doctrine:
 * 1. Safe / Simulation Mode (DISARMED):
 *    All tool executions, automated drafts, and exploratory workflows run safely
 *    in sandbox/dry-run mode without external consequences.
 * 2. Armed Mode (ARMED):
 *    High-risk, commercial, or external dispatch actions (live mass emails,
 *    production publishing, financial triggers) require an explicit, time-bounded
 *    arm token issued by an authorized human operator.
 */

export type BosHighRiskAction =
  | "EMAIL_BLAST"
  | "PAID_AD_DEPLOY"
  | "DNS_PUBLISH"
  | "FINANCIAL_PAYOUT"
  | "DESTRUCTIVE_DELETE"
  | "CRM_MASS_UPDATE";

export interface ArmToken {
  token: string;
  organizationId: string;
  actionType: BosHighRiskAction | string;
  armedBy: string;
  armedAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export class BosUnarmedActionError extends Error {
  public readonly organizationId: string;
  public readonly actionType: string;

  constructor(organizationId: string, actionType: string) {
    super(
      `[B.O.S ARM-CONTROL REFUSAL] Action "${actionType}" for organization "${organizationId}" is currently DISARMED. High-risk execution refused. Human operator must explicitly ARM this capability before live dispatch.`
    );
    this.name = "BosUnarmedActionError";
    this.organizationId = organizationId;
    this.actionType = actionType;
  }
}

export class BosArmControlService {
  private static instance: BosArmControlService;
  private armedStates: Map<string, ArmToken> = new Map();

  private constructor() {}

  public static getInstance(): BosArmControlService {
    if (!BosArmControlService.instance) {
      BosArmControlService.instance = new BosArmControlService();
    }
    return BosArmControlService.instance;
  }

  public static resetInstance(): void {
    BosArmControlService.instance = undefined as any;
  }

  public reset(): void {
    this.armedStates.clear();
  }

  private getKey(organizationId: string, actionType: string): string {
    return `${organizationId}:${actionType.toUpperCase()}`;
  }

  /**
   * Arms a specific high-risk action for an organization with an explicit TTL.
   */
  public armAction(
    organizationId: string,
    actionType: BosHighRiskAction | string,
    armedBy: string,
    ttlSeconds: number = 300,
    metadata?: Record<string, unknown>
  ): ArmToken {
    if (!organizationId || !actionType) {
      throw new Error("organizationId and actionType are required to arm an action.");
    }

    const now = Date.now();
    const token: ArmToken = {
      token: `arm_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`,
      organizationId,
      actionType: actionType.toUpperCase(),
      armedBy,
      armedAt: now,
      expiresAt: now + ttlSeconds * 1000,
      metadata,
    };

    this.armedStates.set(this.getKey(organizationId, actionType), token);
    return token;
  }

  /**
   * Disarms an action, immediately returning it to safe simulation/dry-run mode.
   */
  public disarmAction(organizationId: string, actionType: BosHighRiskAction | string): boolean {
    return this.armedStates.delete(this.getKey(organizationId, actionType));
  }

  /**
   * Checks if an action is currently armed and unexpired.
   */
  public isArmed(organizationId: string, actionType: BosHighRiskAction | string): boolean {
    const key = this.getKey(organizationId, actionType);
    const existing = this.armedStates.get(key);

    if (!existing) return false;

    if (Date.now() > existing.expiresAt) {
      this.armedStates.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Asserts that an action is armed; throws BosUnarmedActionError if disarmed or expired.
   */
  public assertArmed(organizationId: string, actionType: BosHighRiskAction | string): void {
    if (!this.isArmed(organizationId, actionType)) {
      throw new BosUnarmedActionError(organizationId, actionType);
    }
  }

  /**
   * Lists all currently active armings for an organization.
   */
  public listActiveArmings(organizationId: string): ArmToken[] {
    const now = Date.now();
    const active: ArmToken[] = [];

    for (const [key, token] of this.armedStates.entries()) {
      if (token.organizationId === organizationId) {
        if (now <= token.expiresAt) {
          active.push(token);
        } else {
          this.armedStates.delete(key);
        }
      }
    }

    return active;
  }
}
