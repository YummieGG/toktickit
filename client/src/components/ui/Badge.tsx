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
        backgroundColor: '#EAF6EF',
        color: '#1B5E20',
        border: '1px solid #A5D6A7'
      };
    }

    switch (value) {
      case 'LOW':
        return { backgroundColor: '#F0F2F1', color: '#2A5C43' };
      case 'MEDIUM':
        return { backgroundColor: '#CFE8DA', color: '#0A4D2E' };
      case 'HIGH':
        return { backgroundColor: '#006B3C', color: '#FFFFFF' };
      case 'CRITICAL':
        return { backgroundColor: '#FFCDD2', color: '#B71C1C' };
      case 'NEW':
        return { backgroundColor: '#EAF6EF', color: '#1B5E20', border: '1px solid #A5D6A7' };
      default:
        return { backgroundColor: '#F0F2F1', color: '#2A5C43' };
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
