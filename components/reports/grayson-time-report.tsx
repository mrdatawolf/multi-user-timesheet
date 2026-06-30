"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/spinner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface GraysonEmployeeRow {
  employeeId: number;
  employeeName: string;
  week1Reg: number;
  week1Ot: number;
  week1Other: number;
  week2Reg: number;
  week2Ot: number;
  week2Other: number;
  totalReg: number;
  totalOt: number;
  total1FE: number;
  totalHours: number;
  notes: string;
}

export interface GraysonTimeReportData {
  periodStart: string;
  periods: 1 | 2;
  week1Start: string;
  week1End: string;
  week2Start: string | null;
  week2End: string | null;
  employees: GraysonEmployeeRow[];
  grandTotals: { reg: number; ot: number; other: number; total: number };
}

interface GraysonTimeReportProps {
  data: GraysonTimeReportData | null;
  loading: boolean;
  onOtherHoursChange: (employeeId: number, weekStartDate: string, hours: number) => Promise<void>;
  onNotesChange: (employeeId: number, periodStart: string, notes: string) => Promise<void>;
  canEditAdjustments: boolean;
}

function fmt(n: number): string {
  return n > 0 ? n.toFixed(2) : '—';
}

export function GraysonTimeReport({ data, loading, onOtherHoursChange, onNotesChange, canEditAdjustments }: GraysonTimeReportProps) {
  const [cellState, setCellState] = useState<Record<string, string>>({});
  const [notesState, setNotesState] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const committedRef = useRef<Record<string, string>>({});
  const notesCommittedRef = useRef<Record<number, string>>({});

  useEffect(() => {
    if (!data) return;
    const initial: Record<string, string> = {};
    const initialNotes: Record<number, string> = {};
    for (const emp of data.employees) {
      initial[`${emp.employeeId}:${data.week1Start}`] = emp.week1Other > 0 ? String(emp.week1Other) : '';
      if (data.week2Start) {
        initial[`${emp.employeeId}:${data.week2Start}`] = emp.week2Other > 0 ? String(emp.week2Other) : '';
      }
      initialNotes[emp.employeeId] = emp.notes || '';
    }
    setCellState(initial);
    committedRef.current = { ...initial };
    setNotesState(initialNotes);
    notesCommittedRef.current = { ...initialNotes };
  }, [data]);

  const handleChange = (key: string, value: string) => {
    setCellState(prev => ({ ...prev, [key]: value }));
  };

  const handleBlur = useCallback(async (employeeId: number, weekStartDate: string, inputValue: string) => {
    const key = `${employeeId}:${weekStartDate}`;
    const committed = committedRef.current[key] ?? '';
    if (inputValue === committed) return;

    const hours = inputValue === '' ? 0 : parseFloat(inputValue);
    if (isNaN(hours) || hours < 0) {
      setCellState(prev => ({ ...prev, [key]: committed }));
      return;
    }

    committedRef.current[key] = inputValue;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await onOtherHoursChange(employeeId, weekStartDate, hours);
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }, [onOtherHoursChange]);

  const handleNotesBlur = useCallback(async (employeeId: number, periodStart: string, inputValue: string) => {
    const committed = notesCommittedRef.current[employeeId] ?? '';
    if (inputValue === committed) return;

    notesCommittedRef.current[employeeId] = inputValue;
    const key = `notes:${employeeId}`;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await onNotesChange(employeeId, periodStart, inputValue);
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }, [onNotesChange]);

  if (loading) {
    return (
      <div className="border rounded-lg flex items-center justify-center h-24">
        <Spinner />
      </div>
    );
  }

  if (!data || data.employees.length === 0) {
    return (
      <div className="border rounded-lg flex items-center justify-center h-24 text-muted-foreground">
        No results found.
      </div>
    );
  }

  const twoPeriods = data.periods === 2 && !!data.week2Start;

  const otherCell = (employeeId: number, weekStartDate: string) => {
    const key = `${employeeId}:${weekStartDate}`;
    const isSaving = saving[key] ?? false;
    if (!canEditAdjustments) {
      const val = cellState[key];
      return <span>{val ? Number(val).toFixed(2) : '—'}</span>;
    }
    return (
      <Input
        type="number"
        min="0"
        step="0.5"
        value={cellState[key] ?? ''}
        onChange={e => handleChange(key, e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={e => handleBlur(employeeId, weekStartDate, e.target.value)}
        disabled={isSaving}
        placeholder="—"
        className={cn(
          'h-7 w-16 text-center text-sm px-1 mx-auto print:hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          isSaving && 'opacity-50'
        )}
      />
    );
  };

  const changesCell = (employeeId: number) => {
    const isSaving = saving[`notes:${employeeId}`] ?? false;
    if (!canEditAdjustments) {
      return <span>{notesState[employeeId] || '—'}</span>;
    }
    return (
      <Input
        type="text"
        value={notesState[employeeId] ?? ''}
        onChange={e => setNotesState(prev => ({ ...prev, [employeeId]: e.target.value }))}
        onBlur={e => handleNotesBlur(employeeId, data.periodStart, e.target.value)}
        disabled={isSaving}
        placeholder="—"
        className={cn('h-7 w-full text-sm px-2 print:hidden', isSaving && 'opacity-50')}
      />
    );
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="table-fixed">
        <colgroup>
          <col />
          <col /><col /><col />
          {twoPeriods && <><col /><col /><col /></>}
          {twoPeriods && <><col /><col /><col /><col /></>}
          <col className="w-1/4" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="align-bottom">Employee</TableHead>
            <TableHead colSpan={3} className="text-center border-l">
              {twoPeriods ? `Week 1 (${data.week1Start} – ${data.week1End})` : `Period (${data.week1Start} – ${data.week1End})`}
            </TableHead>
            {twoPeriods && (
              <TableHead colSpan={3} className="text-center border-l">
                Week 2 ({data.week2Start} – {data.week2End})
              </TableHead>
            )}
            {twoPeriods && (
              <TableHead colSpan={4} className="text-center border-l">Payroll Total</TableHead>
            )}
            <TableHead rowSpan={2} className="align-bottom border-l">Changes</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-right border-l">REG</TableHead>
            <TableHead className="text-right">OT</TableHead>
            <TableHead className="text-center">Other</TableHead>
            {twoPeriods && (
              <>
                <TableHead className="text-right border-l">REG</TableHead>
                <TableHead className="text-right">OT</TableHead>
                <TableHead className="text-center">Other</TableHead>
              </>
            )}
            {twoPeriods && (
              <>
                <TableHead className="text-right border-l">REG</TableHead>
                <TableHead className="text-right">OT HOURS</TableHead>
                <TableHead className="text-right">1FE</TableHead>
                <TableHead className="text-right font-semibold">TOTAL</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.employees.map(emp => (
            <TableRow key={emp.employeeId}>
              <TableCell>{emp.employeeName}</TableCell>
              <TableCell className="text-right border-l">{fmt(emp.week1Reg)}</TableCell>
              <TableCell className={cn('text-right', emp.week1Ot > 0 && 'text-amber-600 font-medium')}>
                {fmt(emp.week1Ot)}
              </TableCell>
              <TableCell className="text-center">{otherCell(emp.employeeId, data.week1Start)}</TableCell>
              {twoPeriods && (
                <>
                  <TableCell className="text-right border-l">{fmt(emp.week2Reg)}</TableCell>
                  <TableCell className={cn('text-right', emp.week2Ot > 0 && 'text-amber-600 font-medium')}>
                    {fmt(emp.week2Ot)}
                  </TableCell>
                  <TableCell className="text-center">{otherCell(emp.employeeId, data.week2Start!)}</TableCell>
                </>
              )}
              {twoPeriods && (
                <>
                  <TableCell className="text-right border-l">{fmt(emp.totalReg)}</TableCell>
                  <TableCell className={cn('text-right', emp.totalOt > 0 && 'text-amber-600 font-medium')}>
                    {fmt(emp.totalOt)}
                  </TableCell>
                  <TableCell className="text-right">{fmt(emp.total1FE)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(emp.totalHours)}</TableCell>
                </>
              )}
              <TableCell className="border-l">{changesCell(emp.employeeId)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 bg-muted">
            <TableCell className="font-bold">Grand Total</TableCell>
            {twoPeriods ? (
              <>
                <TableCell colSpan={6} className="border-l" />
                <TableCell className="text-right font-bold border-l">{fmt(data.grandTotals.reg)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.grandTotals.ot)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.grandTotals.other)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.grandTotals.total)}</TableCell>
              </>
            ) : (
              <>
                <TableCell className="text-right font-bold border-l">{fmt(data.grandTotals.reg)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.grandTotals.ot)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(data.grandTotals.other)}</TableCell>
              </>
            )}
            <TableCell className="border-l" />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
