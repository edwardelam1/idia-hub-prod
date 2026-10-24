import { useState } from 'react';
import { LayoutDashboard, BarChart3 } from 'lucide-react';
import CrazyFriendSecurityDashboard from '@/components/security/CrazyFriendSecurityDashboard';
import SecurityStatistics from '@/components/security/SecurityStatistics';
import { cn } from '@/lib/utils';

const SecurityPage = () => {
  const [view, setView] = useState<'overview' | 'stats'>('overview');
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border bg-card p-0.5 px-1">
        {([['overview', 'Overview', LayoutDashboard], ['stats', 'Statistics', BarChart3]] as const).map(([v, t, I]) => (
          <button key={v} onClick={() => setView(v)}
            className={cn('flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium',
              view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <I className="h-4 w-4" />{t}
          </button>
        ))}
      </div>
      {view === 'overview' ? <CrazyFriendSecurityDashboard /> : <div className="px-1 pb-24"><SecurityStatistics /></div>}
    </div>
  );
};

export default SecurityPage;
