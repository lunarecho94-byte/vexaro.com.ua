export type Gender = 'men' | 'women' | 'unisex';
export type Season = 'winter' | 'demi' | 'summer' | 'all';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  gender: Gender;
  genderName: string;
  season: Season;
  seasonName: string;
  price: number;
  oldPrice?: number;
  costPrice: number;
  sku: string;
  material: string;
  country: string;
  sizes: string[];
  inStock: boolean;
  images: string[];
  description: string;
  seo: {
    title: string;
    description: string;
  };
}

export interface FilterItem {
  name: string;
  slug: string;
  count: number;
}

export interface CatalogMeta {
  total: number;
  brands: FilterItem[];
  categories: FilterItem[];
  genders: FilterItem[];
  seasons: FilterItem[];
  sizes: string[];
  minPrice: number;
  maxPrice: number;
}

export interface CatalogQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  gender?: string;
  season?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
  search?: string;
}

export interface CatalogResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}
