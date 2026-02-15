import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PresetItem {
  name: string;
  description?: string;
}

interface PresetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  presets: PresetItem[];
  onLoad: (selectedIndices: number[]) => void;
}

export function PresetPickerDialog({ open, onOpenChange, title, presets, onLoad }: PresetPickerDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === presets.length ? new Set() : new Set(presets.map((_, i) => i)));
  };

  const handleLoad = () => {
    onLoad(Array.from(selected));
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) setSelected(new Set()); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2 mb-2">
          <Checkbox
            checked={selected.size === presets.length}
            onCheckedChange={toggleAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">Select All</label>
          <span className="text-xs text-muted-foreground ml-auto">{selected.size} of {presets.length} selected</span>
        </div>
        <ScrollArea className="max-h-[300px] pr-2">
          <div className="space-y-2">
            {presets.map((preset, i) => (
              <label
                key={i}
                className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={selected.has(i)}
                  onCheckedChange={() => toggle(i)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{preset.name}</p>
                  {preset.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preset.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleLoad} disabled={selected.size === 0}>
            Load {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
