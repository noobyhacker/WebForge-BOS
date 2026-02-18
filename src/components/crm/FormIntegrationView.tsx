import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Copy, Code2, Globe, Webhook, CheckCircle2 } from 'lucide-react';

export function FormIntegrationView() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [functionName, setFunctionName] = useState('form-intake');
  const [entityType, setEntityType] = useState<'contact' | 'client'>('contact');
  const [includePhone, setIncludePhone] = useState(true);
  const [includeCompany, setIncludeCompany] = useState(true);
  const [includeMessage, setIncludeMessage] = useState(true);
  const [customSource, setCustomSource] = useState('website');
  const [copied, setCopied] = useState<string | null>(null);

  const endpointUrl = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`
    : `https://<your-project>.supabase.co/functions/v1/${functionName}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const widgetCode = `<!-- BOS Form Widget -->
<div id="crm-form-widget"></div>
<script>
(function() {
  var endpoint = "${endpointUrl}";
  var source = "${customSource}";
  var entityType = "${entityType}";

  var container = document.getElementById('crm-form-widget');
  container.innerHTML = \`
    <form id="crm-intake-form" style="max-width:480px;font-family:system-ui,sans-serif;">
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;">Name *</label>
        <input name="name" required style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;" />
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;">Email *</label>
        <input name="email" type="email" required style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;" />
      </div>${includePhone ? `
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;">Phone</label>
        <input name="phone" type="tel" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;" />
      </div>` : ''}${includeCompany ? `
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;">Company</label>
        <input name="company" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;" />
      </div>` : ''}${includeMessage ? `
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;">Message</label>
        <textarea name="message" rows="3" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;resize:vertical;"></textarea>
      </div>` : ''}
      <button type="submit" style="width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;">
        Submit
      </button>
      <div id="crm-form-status" style="margin-top:8px;font-size:13px;text-align:center;"></div>
    </form>
  \`;

  document.getElementById('crm-intake-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var formData = new FormData(e.target);
    var data = { source: source, entity_type: entityType };
    formData.forEach(function(value, key) { data[key] = value; });

    var status = document.getElementById('crm-form-status');
    status.textContent = 'Submitting...';
    status.style.color = '#6b7280';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (res.ok) {
        status.textContent = 'Thank you! We\\'ll be in touch.';
        status.style.color = '#16a34a';
        e.target.reset();
      } else {
        status.textContent = res.data.error || 'Something went wrong.';
        status.style.color = '#dc2626';
      }
    })
    .catch(function() {
      status.textContent = 'Network error. Please try again.';
      status.style.color = '#dc2626';
    });
  });
})();
</script>`;

  const edgeFunctionCode = `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { name, email, phone, company, message, source, entity_type } = await req.json()

    // Validate required fields
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Name and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const target = entity_type || 'contact'

    if (target === 'client') {
      const { error } = await supabase.from('clients').insert({
        name: name.slice(0, 100),
        email: email.slice(0, 255),
        phone: (phone || '').slice(0, 30),
        company: (company || '').slice(0, 100),
        notes: (message || '').slice(0, 2000),
        status: 'lead',
        source: (source || 'website').slice(0, 50),
      })
      if (error) throw error
    } else {
      // Default: insert as contact
      const nameParts = name.trim().split(/\\s+/)
      const firstName = nameParts[0].slice(0, 50)
      const lastName = nameParts.slice(1).join(' ').slice(0, 50) || ''

      const { error } = await supabase.from('contacts').insert({
        first_name: firstName,
        last_name: lastName,
        email: email.slice(0, 255),
        phone: (phone || '').slice(0, 30),
        source: (source || 'website').slice(0, 50),
        status: 'prospect',
        title: (company || '').slice(0, 100),
      })
      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to process submission' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`;

  const curlExample = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "company": "Acme Inc",
    "message": "Interested in your services",
    "source": "typeform",
    "entity_type": "${entityType}"
  }'`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Form Integration</h1>
        <p className="text-muted-foreground mt-1">
          Capture leads from external forms, websites, and third-party tools directly into your CRM.
        </p>
      </div>

      {/* Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" /> Configuration
          </CardTitle>
          <CardDescription>Set your Supabase project URL to generate integration snippets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supabase Project URL</Label>
              <Input
                placeholder="https://abc123.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Function Name</Label>
              <Input
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Create as</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as 'contact' | 'client')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact (prospect)</SelectItem>
                  <SelectItem value="client">Client (lead)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Tag</Label>
              <Input
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="website"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={includePhone} onCheckedChange={setIncludePhone} />
              <Label>Phone field</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={includeCompany} onCheckedChange={setIncludeCompany} />
              <Label>Company field</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={includeMessage} onCheckedChange={setIncludeMessage} />
              <Label>Message field</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="widget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="widget" className="gap-2"><Code2 className="h-4 w-4" /> Embeddable Widget</TabsTrigger>
          <TabsTrigger value="api" className="gap-2"><Webhook className="h-4 w-4" /> API Endpoint</TabsTrigger>
          <TabsTrigger value="edge" className="gap-2"><Code2 className="h-4 w-4" /> Edge Function</TabsTrigger>
        </TabsList>

        {/* Widget Tab */}
        <TabsContent value="widget">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Embeddable Widget</CardTitle>
              <CardDescription>Copy this HTML snippet and paste it into any webpage to capture form submissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96 text-foreground">
                  <code>{widgetCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 gap-1"
                  onClick={() => copyToClipboard(widgetCode, 'Widget code')}
                >
                  {copied === 'Widget code' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === 'Widget code' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Tip</Badge>
                <span className="text-sm text-muted-foreground">
                  You can style the form with CSS to match your website's design.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Endpoint</CardTitle>
              <CardDescription>
                Send POST requests from Typeform webhooks, Zapier, or any external tool.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <div className="flex gap-2">
                  <Input value={endpointUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(endpointUrl, 'URL')}>
                    {copied === 'URL' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Label className="mb-2 block">cURL Example</Label>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto text-foreground">
                  <code>{curlExample}</code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-8 right-2 gap-1"
                  onClick={() => copyToClipboard(curlExample, 'cURL')}
                >
                  {copied === 'cURL' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === 'cURL' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Request Body Schema</Label>
                <div className="bg-muted p-4 rounded-lg text-sm font-mono text-foreground">
                  <div>{'{'}</div>
                  <div className="pl-4">"name": <span className="text-destructive">string (required)</span>,</div>
                  <div className="pl-4">"email": <span className="text-destructive">string (required)</span>,</div>
                  <div className="pl-4">"phone": <span className="text-muted-foreground">string (optional)</span>,</div>
                  <div className="pl-4">"company": <span className="text-muted-foreground">string (optional)</span>,</div>
                  <div className="pl-4">"message": <span className="text-muted-foreground">string (optional)</span>,</div>
                  <div className="pl-4">"source": <span className="text-muted-foreground">string (optional, default: "website")</span>,</div>
                  <div className="pl-4">"entity_type": <span className="text-muted-foreground">"contact" | "client" (optional, default: "contact")</span></div>
                  <div>{'}'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edge Function Tab */}
        <TabsContent value="edge">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edge Function Code</CardTitle>
              <CardDescription>
                Deploy this as a Supabase Edge Function in your project. Save it to{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">supabase/functions/{functionName}/index.ts</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-[500px] text-foreground">
                  <code>{edgeFunctionCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 gap-1"
                  onClick={() => copyToClipboard(edgeFunctionCode, 'Edge function')}
                >
                  {copied === 'Edge function' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === 'Edge function' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm text-foreground">Deployment Steps</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Install the Supabase CLI if you haven't: <code className="text-xs bg-muted px-1 rounded">npm i -g supabase</code></li>
                  <li>Create the function: <code className="text-xs bg-muted px-1 rounded">supabase functions new {functionName}</code></li>
                  <li>Replace <code className="text-xs bg-muted px-1 rounded">index.ts</code> with the code above</li>
                  <li>Deploy: <code className="text-xs bg-muted px-1 rounded">supabase functions deploy {functionName} --no-verify-jwt</code></li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}