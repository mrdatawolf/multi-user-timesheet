"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Palette, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorConfig {
  id: number;
  config_type: 'status';
  config_key: string;
  color_name: string;
}

interface AvailableColor {
  name: string;
  label: string;
}

// Color swatch styles for the palette
const colorSwatchStyles: Record<string, { bg: string; text: string }> = {
  blue: { bg: '#dbeafe', text: '#1e40af' },
  amber: { bg: '#fef3c7', text: '#92400e' },
  red: { bg: '#fee2e2', text: '#991b1b' },
  teal: { bg: '#ccfbf1', text: '#115e59' },
  purple: { bg: '#f3e8ff', text: '#6b21a8' },
  green: { bg: '#dcfce7', text: '#166534' },
  gray: { bg: '#f3f4f6', text: '#374151' },
};

function ColorSwatch({ colorName }: { colorName: string }) {
  const style = colorSwatchStyles[colorName] || colorSwatchStyles.gray;
  return (
    <div
      className="inline-flex items-center gap-2 px-2 py-1 rounded border"
      style={{ backgroundColor: style.bg, borderColor: style.text + '40' }}
    >
      <div
        className="w-3 h-3 rounded-full border"
        style={{ backgroundColor: style.text, borderColor: style.text }}
      />
      <span className="text-sm capitalize" style={{ color: style.text }}>
        {colorName}
      </span>
    </div>
  );
}

const STATUS_OPTIONS = [
  { key: 'warning', label: 'Warning', description: 'Approaching the overtime threshold', defaultColor: 'amber' },
  { key: 'critical', label: 'Overtime', description: 'Hours worked exceed the overtime threshold', defaultColor: 'red' },
];

export function ColorConfigManagement() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const [colorConfigs, setColorConfigs] = useState<ColorConfig[]>([]);
  const [availableColors, setAvailableColors] = useState<AvailableColor[]>([]);

  const fetchColorConfigs = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/color-config', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setColorConfigs(data.colorConfigs || []);
        setAvailableColors(data.availableColors || []);
      } else {
        console.error('Failed to fetch color configs:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch color configs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchColorConfigs();
  }, [fetchColorConfigs]);

  const getCurrentColor = (configKey: string, defaultColor: string): string => {
    const config = colorConfigs.find(c => c.config_type === 'status' && c.config_key === configKey);
    return config?.color_name || defaultColor;
  };

  const isCustomized = (configKey: string): boolean => {
    return colorConfigs.some(c => c.config_type === 'status' && c.config_key === configKey);
  };

  const handleColorChange = async (configKey: string, colorName: string) => {
    if (!token) return;

    setIsSaving(configKey);

    try {
      const res = await fetch('/api/color-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ configType: 'status', configKey, colorName }),
      });

      if (res.ok) {
        toast({
          title: 'Color updated',
          description: `Color for ${configKey} has been updated to ${colorName}.`,
        });
        fetchColorConfigs();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to update color.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while updating the color.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(null);
    }
  };

  const handleReset = async (configKey: string) => {
    if (!token) return;

    setIsSaving(configKey);

    try {
      const res = await fetch(`/api/color-config?configType=status&configKey=${configKey}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({
          title: 'Color reset',
          description: `Color for ${configKey} has been reset to default.`,
        });
        fetchColorConfigs();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to reset color.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while resetting the color.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Color Configuration
        </CardTitle>
        <CardDescription>
          Customize colors for overtime status indicators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[180px]">Color</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {STATUS_OPTIONS.map((status) => {
                  const currentColor = getCurrentColor(status.key, status.defaultColor);
                  const customized = isCustomized(status.key);
                  const savingKey = status.key;

                  return (
                    <TableRow key={status.key}>
                      <TableCell className="font-medium">{status.label}</TableCell>
                      <TableCell className="text-muted-foreground">{status.description}</TableCell>
                      <TableCell>
                        <Select
                          value={currentColor}
                          onValueChange={(value) => handleColorChange(status.key, value)}
                          disabled={isSaving === savingKey}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue>
                              <ColorSwatch colorName={currentColor} />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map((color) => (
                              <SelectItem key={color.name} value={color.name}>
                                <ColorSwatch colorName={color.name} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {customized && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReset(status.key)}
                            disabled={isSaving === savingKey}
                            title="Reset to default"
                          >
                            {isSaving === savingKey ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
