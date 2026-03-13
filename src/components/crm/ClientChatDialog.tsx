import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientChatPanel } from './ClientChatPanel';

interface ClientChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ClientChatDialog({ open, onOpenChange, clientId, clientName }: ClientChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[500px] flex flex-col p-0 gap-0">
        <div className="flex-1 min-h-0">
          <ClientChatPanel clientId={clientId} clientName={clientName} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
