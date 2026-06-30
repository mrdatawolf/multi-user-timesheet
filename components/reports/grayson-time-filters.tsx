"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/spinner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  group_id?: number;
}

interface Group {
  id: number;
  name: string;
}

interface GraysonTimeFiltersProps {
  employees: Employee[];
  groups?: Group[];
  selectedGroupId?: string;
  onGroupChange?: (value: string) => void;
  selectedEmployeeId: string;
  onEmployeeChange: (value: string) => void;
  periodStart: Date | undefined;
  onPeriodStartChange: (date: Date | undefined) => void;
  periods: 1 | 2;
  onPeriodsChange: (periods: 1 | 2) => void;
  onGenerate: () => void;
  loading: boolean;
  actionButtons?: React.ReactNode;
}

export function GraysonTimeFilters({
  employees,
  groups = [],
  selectedGroupId = 'all',
  onGroupChange,
  selectedEmployeeId,
  onEmployeeChange,
  periodStart,
  onPeriodStartChange,
  periods,
  onPeriodsChange,
  onGenerate,
  loading,
  actionButtons,
}: GraysonTimeFiltersProps) {
  const filteredEmployees = employees
    .filter(e => selectedGroupId === 'all' || e.group_id?.toString() === selectedGroupId);

  const shiftPeriod = (days: number) => {
    if (!periodStart) return;
    const d = new Date(periodStart);
    d.setDate(d.getDate() + days);
    onPeriodStartChange(d);
  };

  const periodLengthDays = periods === 2 ? 14 : 7;

  return (
    <div className="print:hidden flex flex-wrap items-end gap-4 p-3 border rounded-lg bg-muted">
      {groups.length > 1 && onGroupChange && (
        <div className="flex flex-col flex-1 min-w-[160px] gap-1.5">
          <label className="text-sm font-medium">Group</label>
          <Select value={selectedGroupId} onValueChange={onGroupChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-[200px] gap-1.5">
        <label className="text-sm font-medium">Employee</label>
        <Select value={selectedEmployeeId} onValueChange={onEmployeeChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {filteredEmployees.map(emp => (
              <SelectItem key={emp.id} value={emp.id.toString()}>
                {emp.last_name}, {emp.first_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{periods === 2 ? 'Period Start (Week 1)' : 'Period Start'}</label>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={() => shiftPeriod(-periodLengthDays)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DatePicker date={periodStart} setDate={onPeriodStartChange} className="w-[160px]" />
          <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={() => shiftPeriod(periodLengthDays)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium"># Pay Periods</label>
        <div className="flex items-center h-9 gap-2">
          <Switch checked={periods === 2} onCheckedChange={checked => onPeriodsChange(checked ? 2 : 1)} />
          <Label className="text-sm text-muted-foreground font-normal">
            {periods === 2 ? 'Week 1 + Week 2' : 'Single week'}
          </Label>
        </div>
      </div>

      <Button onClick={onGenerate} disabled={loading || !periodStart}>
        {loading ? <Spinner /> : 'Generate Report'}
      </Button>

      {actionButtons}
    </div>
  );
}
