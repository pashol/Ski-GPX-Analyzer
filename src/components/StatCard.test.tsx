import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  describe('Rendering', () => {
    it('should render stat card with all props', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
          subValue="Start: 1,200 m"
        />
      );
      
      const card = document.querySelector('.stat-card');
      expect(card).toBeInTheDocument();
    });

    it('should render icon', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
        />
      );
      
      const icon = document.querySelector('.stat-icon');
      expect(icon).toHaveTextContent('🏔️');
    });

    it('should render label', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
        />
      );
      
      expect(screen.getByText('Max Altitude')).toBeInTheDocument();
    });

    it('should render value', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
        />
      );
      
      expect(screen.getByText('2,500 m')).toBeInTheDocument();
    });

    it('should render subValue when provided', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
          subValue="Start: 1,200 m"
        />
      );
      
      expect(screen.getByText('Start: 1,200 m')).toBeInTheDocument();
    });

    it('should not render subValue element when not provided', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
        />
      );
      
      const statSub = document.querySelector('.stat-sub');
      expect(statSub).not.toBeInTheDocument();
    });
  });

  describe('Highlight Variant', () => {
    it('should not have highlight class by default', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
        />
      );
      
      const card = document.querySelector('.stat-card');
      expect(card).not.toHaveClass('highlight');
    });

    it('should have highlight class when highlight is true', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
          highlight
        />
      );
      
      const card = document.querySelector('.stat-card');
      expect(card).toHaveClass('highlight');
    });
  });

  describe('Structure', () => {
    it('should have correct CSS classes', () => {
      render(
        <StatCard
          icon="🏔️"
          label="Max Altitude"
          value="2,500 m"
          subValue="Start: 1,200 m"
        />
      );
      
      expect(document.querySelector('.stat-card')).toBeInTheDocument();
      expect(document.querySelector('.stat-icon')).toBeInTheDocument();
      expect(document.querySelector('.stat-content')).toBeInTheDocument();
      expect(document.querySelector('.stat-label')).toBeInTheDocument();
      expect(document.querySelector('.stat-value')).toBeInTheDocument();
      expect(document.querySelector('.stat-sub')).toBeInTheDocument();
    });

    it('should render various icons correctly', () => {
      const { rerender } = render(
        <StatCard icon="⚡" label="Speed" value="45 km/h" />
      );
      expect(document.querySelector('.stat-icon')).toHaveTextContent('⚡');
      
      rerender(<StatCard icon="📏" label="Distance" value="12.5 km" />);
      expect(document.querySelector('.stat-icon')).toHaveTextContent('📏');
      
      rerender(<StatCard icon="⏱️" label="Duration" value="2:30:00" />);
      expect(document.querySelector('.stat-icon')).toHaveTextContent('⏱️');
    });

    it('should handle long labels and values', () => {
      render(
        <StatCard
          icon="📊"
          label="Average Speed Including Stops"
          value="25.567 km/h"
        />
      );
      
      expect(screen.getByText('Average Speed Including Stops')).toBeInTheDocument();
      expect(screen.getByText('25.567 km/h')).toBeInTheDocument();
    });
  });
});
