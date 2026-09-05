import React from 'react';

type PriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type StatusType = 'NEW';

interface BadgeProps {
  type: 'priority' | 'status';
  value: PriorityType | StatusType | string;
  className?: string;
}

const PRIORITY_STYLES: Record<PriorityType, React.CSSProperties> = {
  LOW: { backgroundColor: '#E3F2FD', color: '#0D47A1' },
  MEDIUM: { backgroundColor: '#FFF9C4', color: '#F57F17' },
  HIGH: { backgroundColor: '#FFE0B2', color: '#E65100' },
  CRITICAL: { backgroundColor: '#FFCDD2', color: '#B71C1C' },
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  NEW: { backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7' },
};

const DEFAULT_STYLE: React.CSSProperties = { backgroundColor: '#E8EDE8', color: '#1A2E1A' };

export const Badge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  const getStyle = (): React.CSSProperties => {
    if (type === 'status') {
      return STATUS_STYLES[value] ?? DEFAULT_STYLE;
    }
    return PRIORITY_STYLES[value as PriorityType] ?? DEFAULT_STYLE;
  };

  return (
    <span
      className={`badge rounded-pill fw-semibold px-2 py-1 ${className}`}
      style={getStyle()}
    >
      {value}
    </span>
  );
};
