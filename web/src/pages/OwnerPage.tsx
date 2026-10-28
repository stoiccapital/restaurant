import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { api, session } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OwnerDashboard } from './OwnerDashboard';

export function OwnerPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [owner, setOwner] = useState<{ id: string; email: string; name: string } | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!session.token) {
      setChecked(true);
      return;
    }
    api.me()
      .then((r) => setOwner(r.owner))
      .catch(() => session.clear())
      .finally(() => setChecked(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = mode === 'signin'
        ? await api.signInOwner(email, password)
        : await api.signUpOwner(email, name, password);
      session.set(r.token);
      setOwner(r.owner);
      setPassword('');
    } catch (err) {
      const code = (err as Error).message;
      setError(t(`errors.${code}`) !== `errors.${code}` ? t(`errors.${code}`) : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    try {
      await api.signOutOwner();
    } catch {
      // ignore
    }
    session.clear();
    setOwner(null);
    setEmail('');
    setPassword('');
    setName('');
  }

  if (!checked) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">{t('common.loading')}</div>;
  }

  if (owner) {
    return <OwnerDashboard owner={owner} onSignOut={signOut} />;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>{t('owner.title')}</CardTitle>
          </div>
          <CardDescription>{t('owner.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-1 rounded-md bg-muted p-1 text-sm">
            <button
              type="button"
              className={`flex-1 rounded px-3 py-1.5 ${mode === 'signin' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => { setMode('signin'); setError(null); }}
            >
              {t('owner.sign_in')}
            </button>
            <button
              type="button"
              className={`flex-1 rounded px-3 py-1.5 ${mode === 'signup' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              {t('owner.create_account')}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="name">{t('owner.your_name')}</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t('owner.email')}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">{t('owner.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-muted-foreground">{t('owner.password_hint')}</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t('common.working') : mode === 'signin' ? t('owner.sign_in') : t('owner.create_account')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
