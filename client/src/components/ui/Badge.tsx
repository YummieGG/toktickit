import React from 'react';

type PriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type StatusType = 'NEW';

interface BadgeProps {
  type: 'priority' | 'status';
  value: PriorityType | StatusType | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  const getStyle = () => {
    if (type === 'status' && value === 'NEW') {
      return {
        backgroundColor: '#E8F5E9',
        color: '#1B5E20',
        border: '1px solid #A5D6A7'
      };
    }

    switch (value) {
      case 'LOW':
        return { backgroundColor: '#E3F2FD', color: '#0D47A1' };
      case 'MEDIUM':
        return { backgroundColor: '#FFF9C4', color: '#F57F17' };
      case 'HIGH':
        return { backgroundColor: '#FFE0B2', color: '#E65100' };
      case 'CRITICAL':
        return { backgroundColor: '#FFCDD2', color: '#B71C1C' };
      default:
        return { backgroundColor: '#E8F5E9', color: '#1B5E20' };
    }
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
