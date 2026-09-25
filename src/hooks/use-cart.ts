'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  addLine,
  migrateCartState,
  removeLine,
  setLineQty,
  type CartItem,
} from '@/lib/shop/cart-items';

export type { CartItem };

interface CartStore {
  items: CartItem[];
  couponCode: string | null;
  isOpen: boolean;

  // Actions
  addItem: (productId: string, qty?: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  clearCart: () => void;
  setCouponCode: (code: string | null) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalCount: () => number;
}

/**
 * Zustand Cart Store:
 * TUYỆT ĐỐI KHÔNG lưu giá tiền ở Client/LocalStorage.
 * Chỉ lưu { productId, variantId?, qty } và couponCode.
 */
export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      isOpen: false,

      addItem: (productId, qty = 1, variantId) =>
        set((state) => ({
          items: addLine(state.items, { productId, variantId, qty }),
          isOpen: true,
        })),

      removeItem: (productId, variantId) =>
        set((state) => ({ items: removeLine(state.items, productId, variantId) })),

      updateQty: (productId, qty, variantId) =>
        set((state) => ({ items: setLineQty(state.items, productId, variantId, qty) })),

      clearCart: () => set({ items: [], couponCode: null }),

      setCouponCode: (code) => set({ couponCode: code ? code.trim().toUpperCase() : null }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotalCount: () => get().items.reduce((acc, item) => acc + item.qty, 0),
    }),
    {
      name: 'blog_cart_storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => migrateCartState(persisted),
      // Chỉ lưu items và couponCode vào localStorage, không persist isOpen
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
      }),
    },
  ),
);
