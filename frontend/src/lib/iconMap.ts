import {
  Backpack, ShoppingBag, HardHat, Layers, Wind, Footprints, Sparkles, Shirt,
  Wallet, Star, Droplet, Glasses, Award, Watch, Package, Tag, Gift, Heart, Gem, Umbrella,
  type LucideIcon,
} from "lucide-react";

export const iconOptions: Record<string, LucideIcon> = {
  Backpack, ShoppingBag, HardHat, Layers, Wind, Footprints, Sparkles, Shirt,
  Wallet, Star, Droplet, Glasses, Award, Watch, Package, Tag, Gift, Heart, Gem, Umbrella,
};

export type IconName = keyof typeof iconOptions;
export const iconNames = Object.keys(iconOptions) as IconName[];