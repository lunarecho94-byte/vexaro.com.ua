import { create } from 'zustand';
import { Product } from '@/types/product';

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, size: string) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  getTotalCount: () => number;
  getTotalAmount: () => number;
}

const STORAGE_KEY = 'urban_cart_v1';

const getInitialItems = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveItems = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: getInitialItems(),
  isOpen: false,
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  addItem: (product: Product, size: string) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.product.id === product.id && i.size === size
      );
      let newItems: CartItem[];
      if (existingIndex > -1) {
        newItems = [...state.items];
        newItems[existingIndex].quantity += 1;
      } else {
        newItems = [...state.items, { product, size, quantity: 1 }];
      }
      saveItems(newItems);
      return { items: newItems, isOpen: true };
    });
  },

  removeItem: (productId: string, size: string) => {
    set((state) => {
      const newItems = state.items.filter(
        (i) => !(i.product.id === productId && i.size === size)
      );
      saveItems(newItems);
      return { items: newItems };
    });
  },

  updateQuantity: (productId: string, size: string, quantity: number) => {
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter(
          (i) => !(i.product.id === productId && i.size === size)
        );
        saveItems(newItems);
        return { items: newItems };
      }
      const newItems = state.items.map((i) =>
        i.product.id === productId && i.size === size
          ? { ...i, quantity }
          : i
      );
      saveItems(newItems);
      return { items: newItems };
    });
  },

  clearCart: () => {
    saveItems([]);
    set({ items: [] });
  },

  getTotalCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getTotalAmount: () => {
    const total = get().items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    return Math.round(total * 100) / 100;
  },
}));
