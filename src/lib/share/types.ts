export type ShopShareBasePayload = {
  shopSlug: string;
  vendorName: string;
  shareCode: string;
  shareUrl: string;
};

export type PublicShopShareResponse = ShopShareBasePayload;

export type OwnerShopShareResponse = ShopShareBasePayload & {
  shopStatus: string;
  isActive: boolean;
};

