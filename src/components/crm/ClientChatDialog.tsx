import { useState, useRef, useCallback, useEffect } from 'react';
import { ClientChatPanel } from './ClientChatPanel';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ClientChatDialog({ open, onOpenChange, clientId, clientName }: ClientChatDialogProps) {
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: window.innerHeight - 560 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Reset position when opening
  useEffect(() => {
    if (open) {
      setPosition({ x: window.innerWidth - 440, y: window.innerHeight - 560 });
      setIsMinimized(false);
    }
  }, [open, clientId]);

  if (!open) return null;

  return (
    <div
      ref={windowRef}
      onMouseDown={handleMouseDown}
      className={cn(
        'fixed z-50 bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-[height]',
        isDragging && 'select-none',
        isMinimized ? 'w-[300px] h-[48px]' : 'w-[400px] h-[500px]'
      )}
      style={{ left: position.x, top: position.y }}
    >
      {/* Title bar with controls */}
      <div className="absolute top-0 right-0 flex items-center gap-1 p-2 z-10">
        <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 rounded hover:bg-muted transition-colors">
          {isMinimized ? <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-destructive/20 transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {!isMinimized && (
        <div className="flex-1 min-h-0">
          <ClientChatPanel clientId={clientId} clientName={clientName} />
        </div>
      )}

      {isMinimized && (
        <div className="flex items-center gap-2 px-4 h-full cursor-move" data-drag-handle>
          <span className="text-sm font-medium truncate">Chat — {clientName}</span>
        </div>
      )}
    </div>
  );
}
