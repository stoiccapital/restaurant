import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
};

type ToastCtx = {
  show: (toast: Omit<ToastItem, 'id'>) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback<ToastCtx['show']>((toast) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <ToastItemView key={t.id} toast={t} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItemView({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`pointer-events-auto flex min-w-72 max-w-sm items-start gap-3 rounded-lg border bg-background p-4 shadow-lg transition-all duration-200 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <div className="flex-1">
        <div className="text-sm font-medium">{toast.title}</div>
        {toast.description && <div className="num mt-0.5 text-xs text-muted-foreground">{toast.description}</div>}
      </div>
    </div>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
