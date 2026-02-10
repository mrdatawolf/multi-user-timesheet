"use client";

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ViewType } from '@/lib/attendance-types';
import { getPeriodLabel } from '@/lib/date-helpers';

interface PeriodNavigatorProps {
  view: ViewType;
  year: number;
  currentDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onYearChange: (year: number) => void;
}

export function PeriodNavigator({
  view,
  year,
  currentDate,
  onNavigate,
  onToday,
  onYearChange,
}: PeriodNavigatorProps) {
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Prev/Next arrows */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onNavigate('prev')}
        title={`Previous ${view}`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Period label */}
      <span className="text-sm font-medium min-w-[140px] text-center">
        {getPeriodLabel(view, currentDate)}
      </span>

      <Button
        variant="outline"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onNavigate('next')}
        title={`Next ${view}`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Year picker (shown in month/week views for quick year jumping) */}
      {view !== 'year' && (
        <Select
          value={year.toString()}
          onValueChange={(value) => onYearChange(parseInt(value))}
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Today button */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs px-2"
        onClick={onToday}
      >
        Today
      </Button>
    </div>
  );
}
