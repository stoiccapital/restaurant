import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CartProvider } from '@/lib/cart';
import { SiteHeader } from '@/components/SiteHeader';
import { CartDrawer } from '@/components/CartDrawer';
import { ToastProvider } from '@/components/Toast';
import { HomePage } from '@/pages/HomePage';
import { RestaurantPage } from '@/pages/RestaurantPage';
import { OwnerPage } from '@/pages/OwnerPage';

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <ToastProvider>
      <CartProvider>
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
          <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
            Plates — direct from local restaurants. 0% commission. No upsell. No fees for owners.
          </div>
        </footer>
      </CartProvider>
    </ToastProvider>
  );
}
