"use client";

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, Clock, CalendarRange } from 'lucide-react';
import { getLocalToday } from '@/lib/date-helpers';

interface BulkEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: number;
  onSave: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export function BulkEntryDialog({
  open,
  onOpenChange,
  employeeId,
  onSave,
  authFetch,
}: BulkEntryDialogProps) {
  const today = getLocalToday();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [workLocation, setWorkLocation] = useState('__NONE__');
  const [hours, setHours] = useState(8);
  const [minutes, setMinutes] = useState(0);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Calculate the number of days in range
  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (end < start) return 0;

    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (!skipWeekends || (day !== 0 && day !== 6)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }, [startDate, endDate, skipWeekends]);

  const hoursPerDay = hours + minutes / 60;
  const totalHours = hoursPerDay * dayCount;
  const dateRangeInvalid = !!(startDate && endDate && endDate < startDate);
  const isValid = dayCount > 0 && hoursPerDay > 0 && hoursPerDay <= 24;

  const resetForm = () => {
    const t = getLocalToday();
    setStartDate(t);
    setEndDate(t);
    setWorkLocation('__NONE__');
    setHours(8);
    setMinutes(0);
    setSkipWeekends(true);
    setOverwriteExisting(false);
    setNotes('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Always reset so the next time this dialog opens (whether closed via
    // Cancel, a successful save, Escape, or clicking outside) it starts fresh.
    resetForm();
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await authFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update_range',
          employee_id: employeeId,
          start_date: startDate,
          end_date: endDate,
          work_location: workLocation === '__NONE__' ? null : workLocation,
          hours: hoursPerDay,
          notes: notes.trim() || null,
          skip_weekends: skipWeekends,
          overwrite_existing: overwriteExisting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to save');
      }

      onSave();
      handleOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save bulk entries');
    } finally {
      setSaving(false);
    }
  };

  const incrementHours = () => setHours(h => h + 1);
  const decrementHours = () => setHours(h => Math.max(0, h - 1));

  const incrementMinutes = () => {
    setMinutes(m => {
      if (m === 0) return 15;
      if (m === 15) return 30;
      if (m === 30) return 45;
      return 0;
    });
  };

  const decrementMinutes = () => {
    setMinutes(m => {
      if (m === 0) return 45;
      if (m === 15) return 0;
      if (m === 30) return 15;
      return 30;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Bulk Add Attendance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bulk-start-date" className="text-xs">Start Date</Label>
              <Input
                id="bulk-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={`h-9 ${dateRangeInvalid ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-end-date" className="text-xs">End Date</Label>
              <Input
                id="bulk-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={`h-9 ${dateRangeInvalid ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label htmlFor="bulk-work-location" className="text-xs">Location</Label>
            <Select value={workLocation} onValueChange={setWorkLocation}>
              <SelectTrigger id="bulk-work-location" className="h-9">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">-</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hours Per Day */}
          <div className="space-y-1">
            <Label className="text-xs">Hours Per Day</Label>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold">hrs</span>
              <Button type="button" variant="outline" size="icon" onClick={decrementHours} className="h-8 w-8">
                <Minus className="h-3 w-3" />
              </Button>
              <Input type="text" value={hours} readOnly className="text-center h-8 w-10 px-1" />
              <Button type="button" variant="outline" size="icon" onClick={incrementHours} className="h-8 w-8">
                <Plus className="h-3 w-3" />
              </Button>

              <span className="text-xs font-bold ml-2">min</span>
              <Button type="button" variant="outline" size="icon" onClick={decrementMinutes} className="h-8 w-8">
                <Minus className="h-3 w-3" />
              </Button>
              <Input type="text" value={minutes} readOnly className="text-center h-8 w-10 px-1" />
              <Button type="button" variant="outline" size="icon" onClick={incrementMinutes} className="h-8 w-8">
                <Plus className="h-3 w-3" />
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setHours(8); setMinutes(0); }}
                className="h-8 ml-2 gap-1 text-xs"
                title="Set to 8 hours (full day)"
              >
                <Clock className="h-3 w-3" />
                All Day
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-weekends"
                checked={skipWeekends}
                onCheckedChange={(checked) => setSkipWeekends(checked === true)}
              />
              <Label htmlFor="skip-weekends" className="text-sm cursor-pointer">
                Skip weekends (Sat/Sun)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="overwrite-existing"
                checked={overwriteExisting}
                onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
              />
              <Label htmlFor="overwrite-existing" className="text-sm cursor-pointer">
                Overwrite existing entries
              </Label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="bulk-notes" className="text-xs">Notes</Label>
            <Textarea
              id="bulk-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[60px]"
              placeholder="Optional notes (applied to all entries)"
            />
          </div>

          {/* Preview */}
          {isValid && (
            <div className="p-3 border rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="font-semibold">Preview</div>
              <div>
                Will create <span className="font-bold">{dayCount}</span> entries
                at {hoursPerDay}h/day
              </div>
              <div className="text-muted-foreground">
                Total: {totalHours.toFixed(1)} hours
              </div>
              {!overwriteExisting && (
                <div className="text-muted-foreground text-xs">
                  Days with existing entries will be skipped
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Saving...' : `Save ${dayCount} Entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
