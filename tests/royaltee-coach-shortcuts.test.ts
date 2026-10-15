import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const shortcut = read('src/components/RoyalteeStaffShortcut.tsx');
const publicSite = read('src/app/league/royaltee/page.tsx');
const staff = read('src/components/StaffRolePortal.tsx');
const menu = read('src/components/NavigationDrawer.tsx');

describe('Royaltee coach tools discovery', () => {
  it('offers both coach destinations where approved leadership will find them', () => {
    expect(shortcut).toContain('href="/league/royaltee/dashboard"');
    expect(shortcut).toContain('href="/league/royaltee/manage"');
    expect(publicSite).toContain('<RoyalteeStaffShortcut variant="royaltee" />');
    expect(staff).toContain('<RoyalteeStaffShortcut variant="staff" />');
    expect(menu).toContain('<RoyalteeStaffShortcut variant="drawer" onNavigate={onClose} />');
  });

  it('only renders for the signed-in account after Royaltee-specific approval', () => {
    expect(shortcut).toContain('user ? <RoyalteeStaffShortcutForAccount key={user.id}');
    expect(shortcut).toContain("rpc('can_manage_royaltee')");
    expect(shortcut).toContain('if (!allowed) return null;');
    expect(shortcut).not.toMatch(/profile\.role\s*===?\s*['"]staff['"]/);
    expect(shortcut).not.toContain("role_code === 'cheerleading_coach'");
  });
});
