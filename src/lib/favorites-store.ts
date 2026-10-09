import { create } from 'zustand';
import { Product } from '@/types/product';

interface FavoritesStore {
  items: Product[];
  isOpen: boolean;
  openFavorites: () => void;
  closeFavorites: () => void;
  toggleFavorites: () => void;
  toggleItem: (product: Product) => boolean; // returns true if added, false if removed
  removeItem: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  getCount: () => number;
}

const STORAGE_KEY = 'vexaro_favorites_v1';

const getInitialItems = (): Product[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveItems = (items: Product[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
};

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  items: getInitialItems(),
  isOpen: false,
  openFavorites: () => set({ isOpen: true }),
  closeFavorites: () => set({ isOpen: false }),
  toggleFavorites: () => set((state) => ({ isOpen: !state.isOpen })),

  toggleItem: (product: Product) => {
    let wasAdded = false;
    set((state) => {
      const exists = state.items.some((p) => p.id === product.id);
      let newItems: Product[];
      if (exists) {
        newItems = state.items.filter((p) => p.id !== product.id);
        wasAdded = false;
      } else {
        newItems = [product, ...state.items];
        wasAdded = true;
      }
      saveItems(newItems);
      return { items: newItems };
    });
    return wasAdded;
  },

  removeItem: (productId: string) => {
    set((state) => {
      const newItems = state.items.filter((p) => p.id !== productId);
      saveItems(newItems);
      return { items: newItems };
    });
  },

  isFavorite: (productId: string) => {
    return get().items.some((p) => p.id === productId);
  },

  clearFavorites: () => {
    saveItems([]);
    set({ items: [] });
  },

  getCount: () => {
    return get().items.length;
  },
}));
