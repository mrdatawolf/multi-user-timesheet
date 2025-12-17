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

interface TimeCode {
  code: string;
  description:string;
}

interface EntryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  timeCode: string;
  hours: number;
  notes: string;
  timeCodes: TimeCode[];
  onSave: (date: string, timeCode: string, hours: number, notes: string) => void;
}

export function EntryEditDialog({
  open,
  onOpenChange,
  date,
  timeCode,
  hours,
  notes,
  timeCodes,
  onSave,
}: EntryEditDialogProps) {
  const [localTimeCode, setLocalTimeCode] = useState(timeCode);
  const [localHours, setLocalHours] = useState(hours);
  const [localNotes, setLocalNotes] = useState(notes);

  useEffect(() => {
    setLocalTimeCode(timeCode);
    setLocalHours(hours);
    setLocalNotes(notes);
  }, [timeCode, hours, notes]);

  const handleSave = () => {
    onSave(date, localTimeCode, localHours, localNotes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Entry for {date}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time-code" className="text-right">
              Time Code
            </Label>
            <Select value={localTimeCode} onValueChange={setLocalTimeCode}>
              <SelectTrigger className="col-span-3">
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hours" className="text-right">
              Hours
            </Label>
            <Input
              id="hours"
              type="number"
              value={localHours}
              onChange={e => setLocalHours(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
