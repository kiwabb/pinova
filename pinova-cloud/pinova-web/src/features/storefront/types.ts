import type { FormEvent } from "react";
import type {
  CategoryCode,
  StoreCategory,
  StoreProduct,
} from "@/data/storefront";

export interface StorefrontProps {
  categories: StoreCategory[];
  products: StoreProduct[];
  categoryPageCode?: CategoryCode;
}

export interface StorefrontSearchProps {
  input: string;
  normalizedInput: string;
  showSuggestions: boolean;
  suggestions: StoreProduct[];
  onApplySuggestion: (product: StoreProduct) => void;
  onBlur: () => void;
  onClear: () => void;
  onCloseSuggestions: () => void;
  onChange: (value: string) => void;
  onFocus: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
