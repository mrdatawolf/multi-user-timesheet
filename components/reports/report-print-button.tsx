"use client";

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ReportPrintButtonProps {
  disabled: boolean;
}

export function ReportPrintButton({ disabled }: ReportPrintButtonProps) {
  return (
    <Button
      onClick={() => window.print()}
      disabled={disabled}
      variant="outline"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print / Save as PDF
    </Button>
  );
}
