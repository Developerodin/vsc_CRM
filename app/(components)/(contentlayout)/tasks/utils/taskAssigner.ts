/** Minimal assigner fields present on task API responses. */
export interface TaskAssignerFields {
  assignedBy?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
      }
    | null;
  assignedByTeamMember?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
      }
    | null;
}

/**
 * Resolve the display name for whoever assigned a task.
 * Team-member assigners use `assignedByTeamMember`; admin users use `assignedBy`.
 */
export const getAssignedByName = (task: TaskAssignerFields): string => {
  if (task.assignedByTeamMember) {
    if (typeof task.assignedByTeamMember === 'string') {
      return task.assignedByTeamMember;
    }
    return (
      task.assignedByTeamMember.name ||
      task.assignedByTeamMember.email ||
      'Unknown'
    );
  }

  if (!task.assignedBy) {
    return 'Unknown';
  }

  if (typeof task.assignedBy === 'string') {
    return task.assignedBy;
  }

  return task.assignedBy.name || task.assignedBy.email || 'Unknown';
};

/**
 * Returns true when the task has assigner metadata from either source.
 */
export const hasTaskAssigner = (task: TaskAssignerFields): boolean => {
  return Boolean(task.assignedByTeamMember || task.assignedBy);
};
