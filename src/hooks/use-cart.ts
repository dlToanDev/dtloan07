'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  qty: number;
}

interface CartStore {
  items: CartItem[];
  couponCode: string | null;
  isOpen: boolean;

  // Actions
  addItem: (productId: string, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
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
 * Chỉ lưu duy nhất { productId, qty } và couponCode.
 */
export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      isOpen: false,

      addItem: (productId: string, qty: number = 1) => {
        const validQty = Math.max(1, Math.floor(qty));
        set((state) => {
          const existingIndex = state.items.findIndex((item) => item.productId === productId);
          if (existingIndex > -1) {
            const newItems = [...state.items];
            const current = newItems[existingIndex];
            if (current) {
              newItems[existingIndex] = {
                ...current,
                qty: current.qty + validQty,
              };
            }
            return { items: newItems, isOpen: true };
          }
          return {
            items: [...state.items, { productId, qty: validQty }],
            isOpen: true,
          };
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQty: (productId: string, qty: number) => {
        const validQty = Math.floor(qty);
        if (validQty <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, qty: validQty } : item,
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], couponCode: null });
      },

      setCouponCode: (code: string | null) => {
        set({ couponCode: code ? code.trim().toUpperCase() : null });
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotalCount: () => {
        return get().items.reduce((acc, item) => acc + item.qty, 0);
      },
    }),
    {
      name: 'blog_cart_storage',
      storage: createJSONStorage(() => localStorage),
      // Chỉ lưu items và couponCode vào localStorage, không persist isOpen
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
      }),
    },
  ),
);
