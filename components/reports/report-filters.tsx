"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';
import { HelpArea } from '@/components/help-area';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
}

interface TimeCode {
  id: number;
  code: string;
  description: string;
}

interface ReportFiltersProps {
  employees: Employee[];
  timeCodes: TimeCode[];
  selectedEmployeeId: string;
  onEmployeeChange: (value: string) => void;
  selectedTimeCode: string;
  onTimeCodeChange: (value: string) => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  onGenerate: () => void;
  loading: boolean;
  actionButtons?: React.ReactNode;
  hideTimeCode?: boolean;
}

export function ReportFilters({
  employees,
  timeCodes,
  selectedEmployeeId,
  onEmployeeChange,
  selectedTimeCode,
  onTimeCodeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onGenerate,
  loading,
  actionButtons,
  hideTimeCode,
}: ReportFiltersProps) {
  return (
    <HelpArea helpId="report-filters" bubblePosition="bottom">
      <div className="flex flex-wrap items-end gap-2 p-2 border rounded-lg bg-muted">
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs">Employee</label>
          <Select value={selectedEmployeeId} onValueChange={onEmployeeChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.last_name}, {emp.first_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hideTimeCode && (
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs">Time Code</label>
            <Select value={selectedTimeCode} onValueChange={onTimeCodeChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time Codes</SelectItem>
                {timeCodes.map(tc => (
                  <SelectItem key={tc.code} value={tc.code}>
                    {tc.code} - {tc.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs">Start Date</label>
          <DatePicker date={startDate} setDate={onStartDateChange} />
        </div>

        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs">End Date</label>
          <DatePicker date={endDate} setDate={onEndDateChange} />
        </div>

        <HelpArea helpId="generate-report" bubblePosition="top" showHighlight={false}>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Spinner /> : 'Generate Report'}
          </Button>
        </HelpArea>

        {actionButtons}
      </div>
    </HelpArea>
  );
}
