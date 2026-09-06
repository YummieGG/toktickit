export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'NEW';

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
  createdAt: string;
  updatedAt: string;
}
