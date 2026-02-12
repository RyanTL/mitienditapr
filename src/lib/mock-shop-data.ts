export type Product = {
  id: string;
  name: string;
  priceUsd: number;
  imageUrl: string;
  alt: string;
  description: string;
};

export type ShopDetail = {
  slug: string;
  vendorName: string;
  rating: string;
  reviewCount: number;
  description: string;
  products: Product[];
};

export type MarketplaceShopCard = {
  id: string;
  name: string;
  rating: string;
  reviewCount: number;
  products: Pick<Product, "id" | "imageUrl" | "alt">[];
};

export const mockShopDetails: ShopDetail[] = [
  {
    slug: "calzado-urbano",
    vendorName: "Calzado Urbano",
    rating: "4.8",
    reviewCount: 43,
    description:
      "Esto es una breve descripcion con limite de letras para describir que vendes y a que te dedicas.",
    products: [
      {
        id: "1",
        name: "Zapato Azul",
        priceUsd: 40,
        imageUrl:
          "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?auto=format&fit=crop&w=640&q=80",
        alt: "Zapato azul",
        description: "Esto son unos tenis de vestir azules para dama.",
      },
      {
        id: "2",
        name: "Tenis Nike",
        priceUsd: 55,
        imageUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=80",
        alt: "Tenis rojo",
        description: "Tenis comodos para uso diario y caminatas largas.",
      },
      {
        id: "3",
        name: "Reloj inteligente",
        priceUsd: 75,
        imageUrl:
          "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=640&q=80",
        alt: "Reloj blanco",
        description: "Reloj de estilo minimalista con acabado limpio.",
      },
      {
        id: "4",
        name: "Botella",
        priceUsd: 15,
        imageUrl:
          "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=640&q=80",
        alt: "Botella verde",
        description: "Botella reusable para agua fria o temperatura ambiente.",
      },
      {
        id: "5",
        name: "Mochila urbana",
        priceUsd: 29,
        imageUrl:
          "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?auto=format&fit=crop&w=640&q=80",
        alt: "Mochila urbana",
        description: "Mochila liviana con espacio para laptop y accesorios.",
      },
      {
        id: "6",
        name: "Lentes de sol",
        priceUsd: 24,
        imageUrl:
          "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=640&q=80",
        alt: "Lentes de sol",
        description: "Lentes de sol con marco clasico y proteccion UV.",
      },
      {
        id: "7",
        name: "Gorra clasica",
        priceUsd: 18,
        imageUrl:
          "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=640&q=80",
        alt: "Gorra clasica",
        description: "Gorra ajustable para uso casual.",
      },
      {
        id: "8",
        name: "Billetera cuero",
        priceUsd: 32,
        imageUrl:
          "https://images.unsplash.com/photo-1614332287897-cdc485fa562d?auto=format&fit=crop&w=640&q=80",
        alt: "Billetera de cuero",
        description: "Billetera compacta de cuero sintetico.",
      },
    ],
  },
  {
    slug: "estilo-boutique",
    vendorName: "Estilo Boutique",
    rating: "4.9",
    reviewCount: 58,
    description:
      "Seleccion especial de articulos para tu estilo diario con envios rapidos y buena calidad.",
    products: [
      {
        id: "1",
        name: "Tenis naranja",
        priceUsd: 48,
        imageUrl:
          "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=640&q=80",
        alt: "Tenis naranja",
        description: "Tenis deportivos con look vibrante.",
      },
      {
        id: "2",
        name: "Zapato artesanal",
        priceUsd: 64,
        imageUrl:
          "https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=640&q=80",
        alt: "Zapato artesanal",
        description: "Zapato hecho a mano con materiales premium.",
      },
      {
        id: "3",
        name: "Reloj clasico",
        priceUsd: 83,
        imageUrl:
          "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=640&q=80",
        alt: "Reloj clasico",
        description: "Reloj elegante para uso formal y casual.",
      },
      {
        id: "4",
        name: "Bolso diario",
        priceUsd: 34,
        imageUrl:
          "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=640&q=80",
        alt: "Bolso negro",
        description: "Bolso comodo para salidas de todos los dias.",
      },
      {
        id: "5",
        name: "Camisa blanca",
        priceUsd: 27,
        imageUrl:
          "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=640&q=80",
        alt: "Camisa blanca",
        description: "Camisa blanca versatil para cualquier ocasion.",
      },
      {
        id: "6",
        name: "Pantalon casual",
        priceUsd: 39,
        imageUrl:
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=640&q=80",
        alt: "Pantalon casual",
        description: "Pantalon con corte moderno y tela suave.",
      },
      {
        id: "7",
        name: "Perfume",
        priceUsd: 44,
        imageUrl:
          "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=640&q=80",
        alt: "Perfume elegante",
        description: "Fragancia fresca y duradera para uso diario.",
      },
      {
        id: "8",
        name: "Reloj dorado",
        priceUsd: 98,
        imageUrl:
          "https://images.unsplash.com/photo-1619134778706-7015533a6150?auto=format&fit=crop&w=640&q=80",
        alt: "Reloj dorado",
        description: "Reloj dorado con presencia premium.",
      },
    ],
  },
  {
    slug: "hecho-a-mano-pr",
    vendorName: "Hecho a Mano PR",
    rating: "4.7",
    reviewCount: 31,
    description:
      "Piezas seleccionadas para tu dia a dia, hechas con estilo y atencion a cada detalle.",
    products: [
      {
        id: "1",
        name: "Tenis rojo",
        priceUsd: 52,
        imageUrl:
          "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=640&q=80",
        alt: "Tenis rojo",
        description: "Tenis ligero para caminatas y uso casual.",
      },
      {
        id: "2",
        name: "Zapato casual",
        priceUsd: 38,
        imageUrl:
          "https://images.unsplash.com/photo-1573855619003-97b4799dcd8b?auto=format&fit=crop&w=640&q=80",
        alt: "Zapato casual",
        description: "Zapato diario con acabado artesanal.",
      },
      {
        id: "3",
        name: "Reloj gris",
        priceUsd: 72,
        imageUrl:
          "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=640&q=80",
        alt: "Reloj gris",
        description: "Reloj color gris para estilo sobrio.",
      },
      {
        id: "4",
        name: "Botella termica",
        priceUsd: 19,
        imageUrl:
          "https://images.unsplash.com/photo-1523365280197-f1783dbf7c70?auto=format&fit=crop&w=640&q=80",
        alt: "Botella termica",
        description: "Botella termica de acero inoxidable.",
      },
      {
        id: "5",
        name: "Taza artesanal",
        priceUsd: 22,
        imageUrl:
          "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=640&q=80",
        alt: "Taza artesanal",
        description: "Taza decorativa para cafe o te.",
      },
      {
        id: "6",
        name: "Vela aromatic",
        priceUsd: 14,
        imageUrl:
          "https://images.unsplash.com/photo-1603006905393-c1e0d8e9f2f7?auto=format&fit=crop&w=640&q=80",
        alt: "Vela aromatica",
        description: "Vela aromatic para ambientar espacios.",
      },
      {
        id: "7",
        name: "Bolso tejido",
        priceUsd: 36,
        imageUrl:
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=640&q=80",
        alt: "Bolso tejido",
        description: "Bolso tejido a mano con estilo unico.",
      },
      {
        id: "8",
        name: "Pulsera",
        priceUsd: 12,
        imageUrl:
          "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=640&q=80",
        alt: "Pulsera artesanal",
        description: "Pulsera sencilla para combinar con tu look.",
      },
    ],
  },
];

export const marketplaceShopCards: MarketplaceShopCard[] = mockShopDetails.map(
  (shop) => ({
    id: shop.slug,
    name: shop.vendorName,
    rating: shop.rating,
    reviewCount: shop.reviewCount,
    products: shop.products.slice(0, 3).map(({ id, imageUrl, alt }) => ({
      id,
      imageUrl,
      alt,
    })),
  }),
);

export function getShopBySlug(shopSlug: string) {
  return mockShopDetails.find((shop) => shop.slug === shopSlug);
}
