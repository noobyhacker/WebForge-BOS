import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';

const ROLES = ['admin', 'sales_manager', 'sales', 'finance', 'viewer', 'user'];

export function RolePermissionsView() {
  const { permissions, rolePermissions, grantPermission, revokePermission, loading } = usePermissions();

  const hasMapping = (role: string, permId: string) =>
    rolePermissions.some(rp => rp.role === role && rp.permissionId === permId);

  const handleToggle = async (role: string, permId: string, checked: boolean) => {
    if (checked) {
      await grantPermission(role, permId);
    } else {
      await revokePermission(role, permId);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading permissions...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Role Permissions
        </h1>
        <p className="text-muted-foreground">Configure which roles have access to each permission.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider min-w-[200px]">Permission</th>
                  {ROLES.map(role => (
                    <th key={role} className="text-center py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">{role.replace('_', ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map(perm => (
                  <tr key={perm.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div>
                        <span className="font-medium text-foreground">{perm.key.replace(/_/g, ' ')}</span>
                        {perm.description && <p className="text-[10px] text-muted-foreground">{perm.description}</p>}
                      </div>
                    </td>
                    {ROLES.map(role => (
                      <td key={role} className="text-center py-2.5 px-3">
                        <Checkbox
                          checked={hasMapping(role, perm.id)}
                          onCheckedChange={(checked) => handleToggle(role, perm.id, !!checked)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
