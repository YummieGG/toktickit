export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ActionUserSummary {
  id: number;
  name: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
}

export interface ActionAssigneeSummary {
  id: number;
  name: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive: boolean;
}

export interface ActionProjection {
  id: number;
  ticketId: number;
  description: string;
  result: string | null;
  status: ActionStatus;
  performedBy: ActionUserSummary;
  assignee: ActionAssigneeSummary | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ActionListResponse {
  data: ActionProjection[];
  ticketVersion: number;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ActionMutationResponse {
  data: {
    action: ActionProjection;
    ticketVersion: number;
  };
}
