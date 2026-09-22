export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED';

export interface NamedReference {
  id: number;
  name: string;
}

export interface TicketRequester {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface TicketOwner {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface TicketAttachment {
  id: number;
  originalName: string;
  storedName?: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removalReason: string | null;
  removedAt: string | null;
  createdAt: string;
}

export interface TicketInternalNote {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
  createdAt: string;
}

export interface TicketSummary {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  category: NamedReference;
  requestedPriority: TicketPriority;
  itPriority: TicketPriority;
  currentStatus: TicketStatus;
  owner: TicketOwner | null;
  requester: TicketRequester;
  updatedAt: string;
  problemAppearsResolvedAt: string | null;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
  createdAt: string;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: TicketPriority;
  itPriority: TicketPriority;
  currentStatus: TicketStatus;
  ticketDate: string;
  category: NamedReference;
  relatedSystem: NamedReference | null;
  requester: TicketRequester;
  owner: TicketOwner | null;
  attachments: TicketAttachment[];
  comments: TicketComment[];
  internalNotes?: TicketInternalNote[];
  problemAppearsResolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
