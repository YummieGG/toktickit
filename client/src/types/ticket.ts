export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_REQUESTER'
  | 'PENDING_VENDOR'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export interface NamedReference {
  id: number;
  name: string;
}

export interface TicketRequester {
  id: number;
  name: string;
  email: string;
}

export interface TicketAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removalReason: string | null;
  removedAt: string | null;
  createdAt: string;
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
  currentStatus: TicketStatus;
  ticketDate: string;
  category: NamedReference;
  relatedSystem: NamedReference | null;
  requester: TicketRequester;
  attachments: TicketAttachment[];
  comments: TicketComment[];
  problemAppearsResolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
