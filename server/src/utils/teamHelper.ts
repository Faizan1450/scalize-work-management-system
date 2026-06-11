import { IUserDocument } from '../models/User';

/**
 * Orphan rule: an employee whose leadIds contain NO active user
 * automatically appears in the owner's team list.
 *
 * getTeamForLead returns the team for a given requester:
 *  - Owner: all active employees UNION orphaned employees (by definition
 *    already active, just missing an active lead)
 *  - Lead: only active employees whose leadIds include the requester
 */
export function getTeamForLead(
  requesterId: string,
  isOwner: boolean,
  allActiveUsers: IUserDocument[]
): IUserDocument[] {
  const activeUserIds = new Set(allActiveUsers.map((u) => u._id.toString()));

  if (isOwner) {
    // Employees = users who have 'employee' role
    const employees = allActiveUsers.filter((u) => u.roles.includes('employee'));

    // Orphaned employees: active employees with NO active lead in leadIds
    const orphans = employees.filter((emp) => {
      const activeLeads = emp.leadIds.filter((lid) => activeUserIds.has(lid.toString()));
      return activeLeads.length === 0;
    });

    // For owner, return all employees (they see everyone), orphan tagging
    // is already implicit — the orphans show up because all employees are returned.
    return employees;
  }

  // Lead: employees whose leadIds include this requester
  return allActiveUsers.filter(
    (u) =>
      u.roles.includes('employee') &&
      u.leadIds.some((lid) => lid.toString() === requesterId)
  );
}

/**
 * Detect circular lead mapping using DFS.
 * Returns true if adding `newLeadIds` to `targetUserId`'s leadIds
 * would create a cycle in the lead graph.
 *
 * Cycle = following the chain of leadIds from any newLeadId eventually
 * reaches targetUserId.
 */
export function wouldCreateCycle(
  targetUserId: string,
  newLeadIds: string[],
  allUsers: IUserDocument[]
): boolean {
  const leadMap = new Map<string, string[]>();
  for (const u of allUsers) {
    leadMap.set(
      u._id.toString(),
      u.leadIds.map((l) => l.toString())
    );
  }

  // Temporarily apply the new leadIds for the target
  leadMap.set(targetUserId, newLeadIds);

  // DFS from each newLeadId — if we reach targetUserId, it's a cycle
  for (const startId of newLeadIds) {
    const visited = new Set<string>();
    const stack = [startId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === targetUserId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const leads = leadMap.get(current) ?? [];
      stack.push(...leads);
    }
  }

  return false;
}
