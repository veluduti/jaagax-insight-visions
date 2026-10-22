type HandoffResult = { level?: string; escalated_to?: string; error?: string };

/** Explain the actual server destination, including skipped regional levels. */
export function workflowHandoffMessage(result: HandoffResult): string {
  if (result.error) throw new Error(result.error);
  const target = result.level ?? result.escalated_to;
  switch (target) {
    case "country": return "Moved to Country admin review queue";
    case "state": return "Moved to State admin review queue";
    case "district": return "Moved to District admin review queue";
    case "agent": return "Assigned to an agent — no regional review levels remain";
    case "super_admin": return "Moved to Global Admin — no eligible regional admin or agent was available";
    default: return "Property released";
  }
}