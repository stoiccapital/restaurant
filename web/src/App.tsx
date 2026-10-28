import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CartProvider } from '@/lib/cart';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { CartDrawer } from '@/components/CartDrawer';
import { ToastProvider } from '@/components/Toast';
import { HomePage } from '@/pages/HomePage';
import { RestaurantPage } from '@/pages/RestaurantPage';
import { OwnerPage } from '@/pages/OwnerPage';

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

function AppShell() {
  const [cartOpen, setCartOpen] = useState(false);
  const { t } = useI18n();
  return (
    <>
      <SiteHeader onOpenCart={() => setCartOpen(true)} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/r/:slug" element={<RestaurantPage onCartOpen={() => setCartOpen(true)} />} />
          <Route path="/owner" element={<OwnerPage />} />
        </Routes>
      </main>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <footer className="mt-20 border-t py-6">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">{t('footer')}</div>
      </footer>
    </>
  );
}
