"use client";

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, Trash2, PlusCircle } from 'lucide-react';
import type { AttendanceEntry } from './attendance-grid';

interface TimeCode {
  code: string;
  description: string;
}

interface MultiEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  entries: AttendanceEntry[];
  timeCodes: TimeCode[];
  onSave: (date: string, entries: AttendanceEntry[]) => void;
}

interface EditableEntry {
  id?: number;
  tempId: string;
  time_code: string;
  hours: number;
  minutes: number;
  notes: string;
}

export function MultiEntryDialog({
  open,
  onOpenChange,
  date,
  entries,
  timeCodes,
  onSave,
}: MultiEntryDialogProps) {
  const [editableEntries, setEditableEntries] = useState<EditableEntry[]>([]);

  useEffect(() => {
    if (open) {
      // Convert entries to editable format
      if (entries.length === 0) {
        // Start with one empty entry
        setEditableEntries([{
          tempId: `new-${Date.now()}`,
          time_code: '__NONE__',
          hours: 0,
          minutes: 0,
          notes: '',
        }]);
      } else {
        setEditableEntries(entries.map((entry, index) => ({
          id: entry.id,
          tempId: entry.id ? `id-${entry.id}` : `new-${Date.now()}-${index}`,
          time_code: entry.time_code,
          hours: Math.floor(entry.hours),
          minutes: Math.round((entry.hours % 1) * 60),
          notes: entry.notes || '',
        })));
      }
    }
  }, [open, entries]);

  const handleAddEntry = () => {
    setEditableEntries([...editableEntries, {
      tempId: `new-${Date.now()}`,
      time_code: '__NONE__',
      hours: 0,
      minutes: 0,
      notes: '',
    }]);
  };

  const handleRemoveEntry = (tempId: string) => {
    setEditableEntries(editableEntries.filter(e => e.tempId !== tempId));
  };

  const updateEntry = (tempId: string, field: keyof EditableEntry, value: any) => {
    setEditableEntries(editableEntries.map(e =>
      e.tempId === tempId ? { ...e, [field]: value } : e
    ));
  };

  const incrementHours = (tempId: string) => {
    setEditableEntries(editableEntries.map(e =>
      e.tempId === tempId ? { ...e, hours: e.hours + 1 } : e
    ));
  };

  const decrementHours = (tempId: string) => {
    setEditableEntries(editableEntries.map(e =>
      e.tempId === tempId ? { ...e, hours: Math.max(0, e.hours - 1) } : e
    ));
  };

  const incrementMinutes = (tempId: string) => {
    setEditableEntries(editableEntries.map(e => {
      if (e.tempId !== tempId) return e;
      let newMinutes = e.minutes;
      if (newMinutes === 0) newMinutes = 15;
      else if (newMinutes === 15) newMinutes = 30;
      else if (newMinutes === 30) newMinutes = 45;
      else newMinutes = 0;
      return { ...e, minutes: newMinutes };
    }));
  };

  const decrementMinutes = (tempId: string) => {
    setEditableEntries(editableEntries.map(e => {
      if (e.tempId !== tempId) return e;
      let newMinutes = e.minutes;
      if (newMinutes === 0) newMinutes = 45;
      else if (newMinutes === 15) newMinutes = 0;
      else if (newMinutes === 30) newMinutes = 15;
      else newMinutes = 30;
      return { ...e, minutes: newMinutes };
    }));
  };

  const getTotalHours = () => {
    return editableEntries
      .filter(e => e.time_code !== '__NONE__')
      .reduce((sum, e) => sum + e.hours + e.minutes / 60, 0);
  };

  const handleSave = () => {
    const totalHours = getTotalHours();

    if (totalHours > 24) {
      alert('Total hours cannot exceed 24 hours per day.');
      return;
    }

    // Convert back to AttendanceEntry format, filtering out empty entries
    const savedEntries: AttendanceEntry[] = editableEntries
      .filter(e => e.time_code !== '__NONE__')
      .map(e => ({
        id: e.id,
        entry_date: date,
        time_code: e.time_code,
        hours: e.hours + e.minutes / 60,
        notes: e.notes.trim() || undefined,
      }));

    onSave(date, savedEntries);
    onOpenChange(false);
  };

  const totalHours = getTotalHours();
  const isOverLimit = totalHours > 24;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entries for {date}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {editableEntries.map((entry, index) => (
            <div key={entry.tempId} className="p-4 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Entry {index + 1}</h3>
                {editableEntries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEntry(entry.tempId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`time-code-${entry.tempId}`} className="text-xs">
                  Time Code
                </Label>
                <Select
                  value={entry.time_code}
                  onValueChange={(value) => updateEntry(entry.tempId, 'time_code', value)}
                >
                  <SelectTrigger id={`time-code-${entry.tempId}`} className="h-9">
                    <SelectValue placeholder="Select a time code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">-</SelectItem>
                    {timeCodes.map(tc => (
                      <SelectItem key={tc.code} value={tc.code}>
                        {tc.code} - {tc.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Time</Label>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs font-bold">hrs</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => decrementHours(entry.tempId)}
                    className="h-8 w-8"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="text"
                    value={entry.hours}
                    readOnly
                    className="text-center h-8 w-10 px-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => incrementHours(entry.tempId)}
                    className="h-8 w-8"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                  <span className="text-xs font-bold ml-2">min</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => decrementMinutes(entry.tempId)}
                    className="h-8 w-8"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="text"
                    value={entry.minutes}
                    readOnly
                    className="text-center h-8 w-10 px-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => incrementMinutes(entry.tempId)}
                    className="h-8 w-8"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`notes-${entry.tempId}`} className="text-xs">
                  Notes
                </Label>
                <Textarea
                  id={`notes-${entry.tempId}`}
                  value={entry.notes}
                  onChange={(e) => updateEntry(entry.tempId, 'notes', e.target.value)}
                  className="min-h-[60px]"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddEntry}
            className="w-full gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Another Entry
          </Button>
        </div>

        <div className="border-t pt-4">
          <div className={`flex items-center justify-between text-sm ${isOverLimit ? 'text-red-600 font-bold' : 'font-semibold'}`}>
            <span>Total Hours:</span>
            <span>{totalHours.toFixed(2)} {isOverLimit && '(exceeds 24 hour limit!)'}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isOverLimit}>
            Save All Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
