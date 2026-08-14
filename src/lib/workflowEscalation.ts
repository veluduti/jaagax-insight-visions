/**
 * Mirror of the database property review escalation ladder
 * (public.workflow_next_level / workflow_level_role / property_enter_queue).
 *
 * District is the operational ownership level: every submission enters the
 * district queue first and only escalates upward when nobody acts.
 *
 * district -> state -> country -> super_admin
 */

export type QueueLevel = "district" | "state" | "country";
export type EscalationTarget = QueueLevel | "super_admin";
export type AdminRole = "district_admin" | "state_admin" | "country_admin";

export const SUBMIT_LEVEL: QueueLevel = "district";

export const ESCALATION_CHAIN: QueueLevel[] = ["district", "state", "country"];

export function nextLevel(level: QueueLevel): QueueLevel | null {
  switch (level) {
    case "district":
      return "state";
    case "state":
      return "country";
    default:
      return null;
  }
}

export function levelRole(level: QueueLevel): AdminRole {
  switch (level) {
    case "district":
      return "district_admin";
    case "state":
      return "state_admin";
    default:
      return "country_admin";
  }
}

export function lifecycleStatusForLevel(level: QueueLevel): string {
  return `${level}_queue`;
}

/**
 * Simulates the queue walk performed by property_enter_queue + property_escalate
 * when no admin places a hold (timer expiry) or no eligible admin exists.
 *
 * @param eligibleAdmins how many admins exist per level
 * @returns the ordered list of levels the property visited and where it ended up
 */
export function simulateEscalation(
  eligibleAdmins: Partial<Record<QueueLevel, number>>,
  opts: { actsAt?: QueueLevel | null } = {},
): { visited: QueueLevel[]; skipped: QueueLevel[]; finalTarget: EscalationTarget } {
  const visited: QueueLevel[] = [];
  const skipped: QueueLevel[] = [];
  let level: QueueLevel | null = SUBMIT_LEVEL;

  while (level) {
    const count = eligibleAdmins[level] ?? 0;
    if (count > 0) {
      visited.push(level);
      if (opts.actsAt === level) {
        return { visited, skipped, finalTarget: level };
      }
    } else {
      skipped.push(level);
    }
    const next: QueueLevel | null = nextLevel(level);
    if (!next) {
      return { visited, skipped, finalTarget: "super_admin" };
    }
    level = next;
  }

  return { visited, skipped, finalTarget: "super_admin" };
}
