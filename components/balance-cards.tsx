"use client";

interface AttendanceEntry {
  entry_date: string;
  time_code: string;
  hours: number;
}

interface TimeAllocation {
  time_code: string;
  description: string;
  default_allocation: number | null;
  allocated_hours: number | null;
  is_override: boolean;
}

interface BalanceCardsProps {
  entries: AttendanceEntry[];
  allocations: TimeAllocation[];
}

export function BalanceCards({ entries, allocations }: BalanceCardsProps) {
  const calculateUsage = (code: string): number => {
    const total = entries
      .filter(e => e.time_code === code)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
    return total;
  };

  const getAllocatedHours = (code: string): number => {
    const allocation = allocations.find(a => a.time_code === code);
    const hours = allocation?.allocated_hours ?? 0;
    return hours;
  };

  const floatingHolidayUsed = calculateUsage('FH');
  const floatingHolidayLimit = getAllocatedHours('FH');
  const floatingHolidayRemaining = Math.max(0, floatingHolidayLimit - floatingHolidayUsed);

  const personalSickUsed = calculateUsage('PS');
  const personalSickLimit = getAllocatedHours('PS');
  const personalSickRemaining = Math.max(0, personalSickLimit - personalSickUsed);

  const vacationUsed = calculateUsage('V');
  const holidayUsed = calculateUsage('H');

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card">
        <div className="text-xs font-medium text-muted-foreground mb-0.5">
          Floating Holiday
        </div>
        <div className="text-lg font-bold">
          {floatingHolidayRemaining}h
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {floatingHolidayUsed}h used / {floatingHolidayLimit}h total
        </div>
        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${(floatingHolidayUsed / floatingHolidayLimit) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card">
        <div className="text-xs font-medium text-muted-foreground mb-0.5">
          Personal Sick Day
        </div>
        <div className="text-lg font-bold">
          {personalSickRemaining}h
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {personalSickUsed}h used / {personalSickLimit}h total
        </div>
        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${(personalSickUsed / personalSickLimit) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card">
        <div className="text-xs font-medium text-muted-foreground mb-0.5">
          Vacation Days Used
        </div>
        <div className="text-lg font-bold">
          {vacationUsed}h
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Total vacation hours this year
        </div>
      </div>

      <div className="flex-1 min-w-[150px] border rounded-lg p-2 bg-card">
        <div className="text-xs font-medium text-muted-foreground mb-0.5">
          Holidays Used
        </div>
        <div className="text-lg font-bold">
          {holidayUsed}h
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Total holiday hours this year
        </div>
      </div>
    </div>
  );
}
