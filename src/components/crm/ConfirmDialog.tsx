import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  requireConfirmation?: boolean;
  confirmationWord?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  requireConfirmation = false,
  confirmationWord = 'DELETE',
  onConfirm,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');

  const isConfirmEnabled = !requireConfirmation || inputValue.toUpperCase() === confirmationWord.toUpperCase();

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setInputValue('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue('');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {variant === 'destructive' && (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireConfirmation && (
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-2">
              Type <span className="font-semibold text-foreground">{confirmationWord}</span> to confirm:
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationWord}
              className="font-mono"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
