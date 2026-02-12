import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Trash2, ExternalLink, FileIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useDocuments } from '@/hooks/useDocuments';

const ENTITY_TYPES = ['client', 'contact', 'account', 'deal', 'quote', 'invoice'];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsView() {
  const { documents, uploadDocument, deleteDocument } = useDocuments();

  const [entityType, setEntityType] = useState('client');
  const [entityId, setEntityId] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entityId.trim()) return;
    uploadDocument(file, entityType, entityId);
    if (fileRef.current) fileRef.current.value = '';
    setEntityId('');
  };

  const filtered = filterType === 'all' ? documents : documents.filter(d => d.entityType === filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Paperclip className="h-6 w-6 text-primary" />Documents</h1>
          <p className="text-muted-foreground mt-1">Upload and manage files linked to CRM records</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <h3 className="font-semibold text-foreground mb-3">Upload Document</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Entity ID</Label><Input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Paste record ID" /></div>
            <div className="col-span-2"><Label>File</Label><div className="flex gap-2"><Input ref={fileRef} type="file" onChange={handleFileSelect} disabled={!entityId.trim()} /></div></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Filter:</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} documents</span>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Paperclip className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium text-foreground">No documents</h3><p className="text-muted-foreground mt-1">Upload files to link them to CRM records</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <Card key={doc.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-foreground">{doc.name}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-xs">{doc.entityType}</Badge>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild><a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteDocument(doc.id, doc.fileUrl)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
