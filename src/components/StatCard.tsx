
import React from 'react';
import './StatCard.css';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}

export function StatCard({ icon, label, value, subValue, highlight }: StatCardProps) {
  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {subValue && <span className="stat-sub">{subValue}</span>}
      </div>
    </div>
  );
}
