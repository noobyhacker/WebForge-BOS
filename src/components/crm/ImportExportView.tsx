import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, parseCSV } from '@/lib/csv';
import type { Contact } from '@/types/crm';
import type { Account } from '@/types/crm';
import type { Deal } from '@/types/crm';

type ExportEntity = 'contacts' | 'accounts' | 'deals';

const CONTACT_COLUMNS = [
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'title', header: 'Title' },
  { key: 'source', header: 'Source' },
  { key: 'status', header: 'Status' },
];

const ACCOUNT_COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'industry', header: 'Industry' },
  { key: 'website', header: 'Website' },
  { key: 'phone', header: 'Phone' },
  { key: 'address', header: 'Address' },
];

const DEAL_COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'stage', header: 'Stage' },
  { key: 'value', header: 'Value' },
  { key: 'probability', header: 'Probability' },
  { key: 'expectedCloseDate', header: 'Expected Close Date' },
];

interface Props {
  contacts: Contact[];
  accounts: Account[];
  deals: Deal[];
  onImportContacts: (rows: Omit<Contact, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>[]) => void;
  onImportAccounts: (rows: Omit<Account, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>[]) => void;
  onImportDeals: (rows: Omit<Deal, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>[]) => void;
}

export function ImportExportView({ contacts, accounts, deals, onImportContacts, onImportAccounts, onImportDeals }: Props) {
  const [exportType, setExportType] = useState<ExportEntity>('contacts');
  const [importType, setImportType] = useState<ExportEntity>('contacts');
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = () => {
    const map: Record<ExportEntity, { data: any[]; columns: any[] }> = {
      contacts: { data: contacts, columns: CONTACT_COLUMNS },
      accounts: { data: accounts, columns: ACCOUNT_COLUMNS },
      deals: { data: deals, columns: DEAL_COLUMNS },
    };
    const { data, columns } = map[exportType];
    if (data.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    exportToCSV(data, `${exportType}_export_${new Date().toISOString().split('T')[0]}`, columns);
    toast({ title: `Exported ${data.length} ${exportType}` });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setImportResult({ count: 0, errors: ['No data rows found in CSV'] });
        return;
      }

      const errors: string[] = [];

      try {
        if (importType === 'contacts') {
          const mapped = rows.map((r, i) => {
            if (!r['First Name']) errors.push(`Row ${i + 2}: Missing First Name`);
            return {
              firstName: r['First Name'] || '',
              lastName: r['Last Name'] || '',
              email: r['Email'] || '',
              phone: r['Phone'] || '',
              title: r['Title'] || '',
              source: r['Source'] || '',
              status: (r['Status'] || 'prospect') as any,
              accountId: undefined,
              accountName: undefined,
            };
          });
          if (errors.length === 0) onImportContacts(mapped);
        } else if (importType === 'accounts') {
          const mapped = rows.map((r, i) => {
            if (!r['Name']) errors.push(`Row ${i + 2}: Missing Name`);
            return {
              name: r['Name'] || '',
              industry: r['Industry'] || '',
              website: r['Website'] || '',
              phone: r['Phone'] || '',
              address: r['Address'] || '',
            };
          });
          if (errors.length === 0) onImportAccounts(mapped);
        } else if (importType === 'deals') {
          const mapped = rows.map((r, i) => {
            if (!r['Name']) errors.push(`Row ${i + 2}: Missing Name`);
            return {
              name: r['Name'] || '',
              stage: (r['Stage'] || 'prospecting') as any,
              value: Number(r['Value']) || 0,
              probability: Number(r['Probability']) || 0,
              expectedCloseDate: r['Expected Close Date'] || '',
              accountId: undefined,
              accountName: undefined,
              contactId: undefined,
              contactName: undefined,
            };
          });
          if (errors.length === 0) onImportDeals(mapped);
        }

        setImportResult({ count: errors.length === 0 ? rows.length : 0, errors });
      } catch (err: any) {
        setImportResult({ count: 0, errors: [err.message] });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          Import / Export
        </h1>
        <p className="text-muted-foreground mt-1">Import and export CRM data as CSV files</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardContent className="py-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Download className="h-5 w-5" /> Export Data
            </h2>
            <div>
              <Label>Entity Type</Label>
              <Select value={exportType} onValueChange={v => setExportType(v as ExportEntity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts ({contacts.length})</SelectItem>
                  <SelectItem value="accounts">Accounts ({accounts.length})</SelectItem>
                  <SelectItem value="deals">Deals ({deals.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />Export as CSV
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardContent className="py-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Upload className="h-5 w-5" /> Import Data
            </h2>
            <div>
              <Label>Entity Type</Label>
              <Select value={importType} onValueChange={v => { setImportType(v as ExportEntity); setImportResult(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="accounts">Accounts</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CSV File</Label>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer" />
            </div>
            <div className="text-xs text-muted-foreground">
              Required headers: {importType === 'contacts' ? 'First Name, Last Name, Email, Phone, Title, Source, Status' : importType === 'accounts' ? 'Name, Industry, Website, Phone, Address' : 'Name, Stage, Value, Probability, Expected Close Date'}
            </div>

            {importResult && (
              <div className={`p-3 rounded-lg ${importResult.errors.length > 0 ? 'bg-destructive/10' : 'bg-green-100 dark:bg-green-900/20'}`}>
                {importResult.errors.length > 0 ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Import failed</p>
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-sm text-destructive">{err}</p>
                      ))}
                      {importResult.errors.length > 5 && <p className="text-sm text-destructive">...and {importResult.errors.length - 5} more errors</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">Imported {importResult.count} records</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
