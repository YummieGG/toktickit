import { Prisma } from '../../generated/prisma';

export const ticketSummarySelect = {
  id: true,
  ticketNumber: true,
  ticketDate: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  currentStatus: true,
  owner: { select: { id: true, name: true, email: true, role: true } },
  requester: { select: { id: true, name: true, email: true, role: true } },
  updatedAt: true,
  problemAppearsResolvedAt: true,
  category: { select: { id: true, name: true } },
} satisfies Prisma.TicketSelect;

const ticketDetailFields = {
  ...ticketSummarySelect,
  description: true,
  relatedSystem: { select: { id: true, name: true } },
  attachments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      originalName: true,
      storedName: true,
      mimeType: true,
      sizeBytes: true,
      isRemoved: true,
      removalReason: true,
      removedAt: true,
      createdAt: true,
      ticketId: true,
    },
  },
  comments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      ticketId: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  },
  createdAt: true,
} satisfies Prisma.TicketSelect;

export const requesterTicketDetailSelect = ticketDetailFields;

export const staffTicketDetailSelect = {
  ...ticketDetailFields,
  internalNotes: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      ticketId: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  },
} satisfies Prisma.TicketSelect;
