"use client";

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { HoursWorkedReportData } from './hours-worked-report';

interface ReportPrintButtonProps {
  data: HoursWorkedReportData | null;
}

export function ReportPrintButton({ data }: ReportPrintButtonProps) {
  return (
    <Button
      onClick={() => window.print()}
      disabled={!data || data.groups.length === 0}
      variant="outline"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print / Save as PDF
    </Button>
  );
}
