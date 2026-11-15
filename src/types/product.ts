export type Gender = 'men' | 'women' | 'unisex';
export type Season = 'winter' | 'demi' | 'summer' | 'all';

export interface SizeChartItem {
  size: string;
  cm: string;
  available?: boolean;
}

export interface ProductVariation {
  id: string;
  sku: string;
  color: string;
  colorSlug: string;
  price: number;
  oldPrice?: number;
  costPrice?: number;
  sizes: string[];
  sizeChart?: SizeChartItem[];
  images: string[];
  inStock: boolean;
  slug: string;
}

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
  minPrice?: number;
  maxPrice?: number;
  costPrice: number;
  sku: string;
  material: string;
  country: string;
  sizes: string[];
  sizeChart?: SizeChartItem[];
  inStock: boolean;
  images: string[];
  description: string;
  seo: {
    title: string;
    description: string;
  };
  isHit?: boolean;
  variations?: ProductVariation[];
  activeVariation?: ProductVariation;
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
  bestseller?: string;
}

export interface CatalogResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}
