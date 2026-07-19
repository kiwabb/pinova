import {
  Gift,
  Heart,
  Home,
  LayoutGrid,
  PenLine,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  "starter-kits": Gift,
  "bead-refills": Truck,
  "pattern-kits": LayoutGrid,
  tools: PenLine,
  "finished-goods": Heart,
  "store-experience": Home,
};

export const categoryIconTints: Record<string, string> = {
  "starter-kits": "#fde8ef",
  "bead-refills": "#e7f5ef",
  "pattern-kits": "#faf3d9",
  tools: "#e8f0fb",
  "finished-goods": "#f1eaf8",
  "store-experience": "#fdece6",
};
