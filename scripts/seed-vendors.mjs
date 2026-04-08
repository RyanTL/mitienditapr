/**
 * Seed script: creates 8 Puerto Rico vendor accounts with shops, products, variants,
 * active subscriptions, and completed onboarding records.
 *
 * Run: node --env-file=.env.local scripts/seed-vendors.mjs
 *
 * Idempotent: safe to run multiple times (upserts by slug / email).
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------
function loadEnvFile(path) {
  const vars = {};
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
  } catch {
    // file may not exist; fall through to process.env
  }
  return vars;
}

const fileEnv = loadEnvFile(".env.local");
const get = (k) => process.env[k] ?? fileEnv[k];

const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SECRET_KEY") ?? get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function img(photoId, w = 640) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${w}&q=80`;
}

async function run(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    console.error(`  ✗ ${label}: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const VENDORS = [
  // ── 1 ── Calzado Moderno PR ────────────────────────────────────────────────
  {
    email: "calzado.moderno@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "Carlos Morales",
    shop: {
      slug: "calzado-moderno-pr",
      vendorName: "Calzado Moderno PR",
      description:
        "Los mejores tenis, sandalias y zapatos para tu estilo diario. Marcas locales e importadas con envío rápido a toda la isla.",
      logoUrl: img("1542291026-7eec264c27ff", 400),
      rating: 4.8,
      reviewCount: 67,
      shippingFlatFee: 5.0,
      offersPickup: true,
    },
    products: [
      {
        name: "Tenis Running Pro",
        description:
          "Tenis ligeros y cómodos ideales para correr o caminar. Diseño deportivo con suela de alta tracción.",
        priceUsd: 62.0,
        imageUrl: img("1542291026-7eec264c27ff"),
        variants: [
          { title: "Talla 8", sku: "TRP-8", price: 62.0, stock: 5 },
          { title: "Talla 9", sku: "TRP-9", price: 62.0, stock: 8 },
          { title: "Talla 10", sku: "TRP-10", price: 62.0, stock: 6 },
          { title: "Talla 11", sku: "TRP-11", price: 62.0, stock: 4 },
        ],
      },
      {
        name: "Zapato de Cuero Formal",
        description:
          "Zapato de cuero genuino para ocasiones formales y de negocios. Acabado impecable con suela de goma.",
        priceUsd: 89.0,
        imageUrl: img("1449505278894-297fdb3edbc1"),
        variants: [
          { title: "Talla 8", sku: "ZCF-8", price: 89.0, stock: 3 },
          { title: "Talla 9", sku: "ZCF-9", price: 89.0, stock: 5 },
          { title: "Talla 10", sku: "ZCF-10", price: 89.0, stock: 4 },
        ],
      },
      {
        name: "Sandalias de Playa",
        description:
          "Sandalias cómodas y resistentes perfectas para la playa o el día a día en el trópico.",
        priceUsd: 28.0,
        imageUrl: img("1560769629-975ec94e6a86"),
        variants: [
          { title: "Talla 6", sku: "SP-6", price: 28.0, stock: 10 },
          { title: "Talla 7", sku: "SP-7", price: 28.0, stock: 12 },
          { title: "Talla 8", sku: "SP-8", price: 28.0, stock: 8 },
        ],
      },
      {
        name: "Botas de Cuero",
        description:
          "Botas de cuero genuino con tacón bajo. Estilo casual-elegante para cualquier ocasión.",
        priceUsd: 115.0,
        imageUrl: img("1608256246200-53e635b5b65f"),
        variants: [
          { title: "Talla 7 - Negro", sku: "BC-7-N", price: 115.0, stock: 4 },
          { title: "Talla 8 - Negro", sku: "BC-8-N", price: 115.0, stock: 5 },
          { title: "Talla 7 - Marrón", sku: "BC-7-M", price: 115.0, stock: 3 },
          { title: "Talla 8 - Marrón", sku: "BC-8-M", price: 115.0, stock: 4 },
        ],
      },
      {
        name: "Tenis Urbanos",
        description:
          "Estilo urbano con máxima comodidad. Perfectos para el día a día en la ciudad.",
        priceUsd: 54.0,
        imageUrl: img("1460353581641-37baddab0fa2"),
        variants: [
          { title: "Talla 8 - Blanco", sku: "TU-8-B", price: 54.0, stock: 6 },
          { title: "Talla 9 - Blanco", sku: "TU-9-B", price: 54.0, stock: 8 },
          { title: "Talla 8 - Negro", sku: "TU-8-N", price: 54.0, stock: 5 },
        ],
      },
      {
        name: "Chancletas Premium",
        description:
          "Chancletas de alta calidad con soporte de arco. Cómodas para usar todo el día.",
        priceUsd: 22.0,
        imageUrl: img("1603487742131-4160ec999306"),
        variants: [
          { title: "Talla S", sku: "CP-S", price: 22.0, stock: 15 },
          { title: "Talla M", sku: "CP-M", price: 22.0, stock: 20 },
          { title: "Talla L", sku: "CP-L", price: 22.0, stock: 10 },
        ],
      },
      {
        name: "Zapatillas de Casa",
        description:
          "Suaves y abrigaditas para estar en casa con comodidad máxima.",
        priceUsd: 18.0,
        imageUrl: img("1600269452121-4f2416e55c28"),
        variants: [
          { title: "Talla S", sku: "ZC-S", price: 18.0, stock: 20 },
          { title: "Talla M", sku: "ZC-M", price: 18.0, stock: 25 },
          { title: "Talla L", sku: "ZC-L", price: 18.0, stock: 15 },
        ],
      },
    ],
  },

  // ── 2 ── La Boutique Boricua ───────────────────────────────────────────────
  {
    email: "boutique.boricua@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "María Rivera",
    shop: {
      slug: "boutique-boricua",
      vendorName: "La Boutique Boricua",
      description:
        "Moda femenina con el sabor de Puerto Rico. Ropa y accesorios únicos para la mujer moderna que celebra su cultura.",
      logoUrl: img("1572804013427-4d7ca7268217", 400),
      rating: 4.9,
      reviewCount: 82,
      shippingFlatFee: 4.0,
      offersPickup: true,
    },
    products: [
      {
        name: "Vestido Tropical",
        description:
          "Vestido floral de tela liviana, perfecto para el calor tropical. Disponible en varios estampados.",
        priceUsd: 45.0,
        imageUrl: img("1572804013427-4d7ca7268217"),
        variants: [
          { title: "Talla XS - Flores Rojas", sku: "VT-XS-R", price: 45.0, stock: 5 },
          { title: "Talla S - Flores Rojas", sku: "VT-S-R", price: 45.0, stock: 8 },
          { title: "Talla M - Flores Rojas", sku: "VT-M-R", price: 45.0, stock: 7 },
          { title: "Talla L - Flores Azules", sku: "VT-L-A", price: 45.0, stock: 4 },
        ],
      },
      {
        name: "Blusa Boricua Bordada",
        description:
          "Blusa bordada con motivos típicos de Puerto Rico. Hecha por artesanas locales con tela de algodón.",
        priceUsd: 32.0,
        imageUrl: img("1602810318383-e386cc2a3ccf"),
        variants: [
          { title: "Talla XS - Blanco", sku: "BB-XS", price: 32.0, stock: 6 },
          { title: "Talla S - Blanco", sku: "BB-S", price: 32.0, stock: 10 },
          { title: "Talla M - Blanco", sku: "BB-M", price: 32.0, stock: 8 },
          { title: "Talla L - Blanco", sku: "BB-L", price: 32.0, stock: 5 },
        ],
      },
      {
        name: "Jeans de Corte Alto",
        description:
          "Jeans de talle alto con fit perfecto. Tela premium stretch para máxima comodidad.",
        priceUsd: 58.0,
        imageUrl: img("1541099649105-f69ad21f3246"),
        variants: [
          { title: "Talla 26", sku: "JCA-26", price: 58.0, stock: 5 },
          { title: "Talla 28", sku: "JCA-28", price: 58.0, stock: 8 },
          { title: "Talla 30", sku: "JCA-30", price: 58.0, stock: 6 },
          { title: "Talla 32", sku: "JCA-32", price: 58.0, stock: 4 },
        ],
      },
      {
        name: "Bolso Artesanal de Paja",
        description:
          "Bolso tejido a mano en paja natural. Perfecto para la playa o el día a día. Cierre con hebilla dorada.",
        priceUsd: 38.0,
        imageUrl: img("1594223274512-ad4803739b7c"),
        variants: [
          { title: "Natural", sku: "BAP-NAT", price: 38.0, stock: 12 },
          { title: "Blanco", sku: "BAP-BL", price: 38.0, stock: 8 },
        ],
      },
      {
        name: "Falda Midi Floral",
        description:
          "Falda midi de vuelo con estampado floral. Tela chiffon ligera, ideal para el clima tropical.",
        priceUsd: 35.0,
        imageUrl: img("1614093302611-8efc4c8f48bc"),
        variants: [
          { title: "Talla S", sku: "FMF-S", price: 35.0, stock: 7 },
          { title: "Talla M", sku: "FMF-M", price: 35.0, stock: 9 },
          { title: "Talla L", sku: "FMF-L", price: 35.0, stock: 5 },
        ],
      },
      {
        name: "Collar de Conchas",
        description:
          "Collar hecho con conchas naturales del mar de Puerto Rico. Pieza única y artesanal.",
        priceUsd: 24.0,
        imageUrl: img("1599643478518-a784e5dc4c8f"),
        variants: [
          { title: "Tamaño único", sku: "CC-UNI", price: 24.0, stock: 15 },
        ],
      },
      {
        name: "Perfume Tropical",
        description:
          "Fragancia floral tropical inspirada en los jardines de Puerto Rico. Larga duración.",
        priceUsd: 44.0,
        imageUrl: img("1590736969955-71cc94901144"),
        variants: [
          { title: "30ml", sku: "PT-30", price: 44.0, stock: 10 },
          { title: "50ml", sku: "PT-50", price: 62.0, stock: 8 },
        ],
      },
    ],
  },

  // ── 3 ── Artesanías del Caribe ────────────────────────────────────────────
  {
    email: "artesanias.caribe@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "Roberto Medina",
    shop: {
      slug: "artesanias-del-caribe",
      vendorName: "Artesanías del Caribe",
      description:
        "Piezas artesanales únicas hechas en Puerto Rico. Cada artículo refleja la cultura y tradición boricua con materiales naturales.",
      logoUrl: img("1487700160041-babef9c3cb55", 400),
      rating: 4.7,
      reviewCount: 44,
      shippingFlatFee: 6.0,
      offersPickup: true,
    },
    products: [
      {
        name: "Máscara de Carnaval",
        description:
          "Máscara tradicional de carnaval de Ponce, pintada a mano con colores vivos. Pieza de colección artesanal.",
        priceUsd: 65.0,
        imageUrl: img("1513475382585-d06e58bcb0e0"),
        variants: [
          { title: "Colores Tradicionales", sku: "MC-TRAD", price: 65.0, stock: 8 },
          { title: "Colores Modernos", sku: "MC-MOD", price: 65.0, stock: 6 },
        ],
      },
      {
        name: "Coquí de Madera",
        description:
          "Figura de coquí tallada a mano en madera. El símbolo de Puerto Rico para tu hogar.",
        priceUsd: 28.0,
        imageUrl: img("1487700160041-babef9c3cb55"),
        variants: [
          { title: "Pequeño", sku: "CM-P", price: 28.0, stock: 15 },
          { title: "Mediano", sku: "CM-M", price: 38.0, stock: 10 },
          { title: "Grande", sku: "CM-G", price: 55.0, stock: 6 },
        ],
      },
      {
        name: "Maracas Artesanales",
        description:
          "Maracas hechas a mano con güiro natural. Instrumento musical tradicional boricua, decoradas con motivos de la isla.",
        priceUsd: 35.0,
        imageUrl: img("1510915361894-db8b60106cb1"),
        variants: [
          { title: "Par básico", sku: "MAR-B", price: 35.0, stock: 12 },
          { title: "Par decorado", sku: "MAR-D", price: 48.0, stock: 8 },
        ],
      },
      {
        name: "Cerámica Taína",
        description:
          "Pieza de cerámica con diseños inspirados en la cultura taína. Hecha con arcilla local y pintada a mano.",
        priceUsd: 42.0,
        imageUrl: img("1565193566173-7a0ee3dbe261"),
        variants: [
          { title: "Vasija pequeña", sku: "CT-P", price: 42.0, stock: 7 },
          { title: "Vasija grande", sku: "CT-G", price: 68.0, stock: 4 },
        ],
      },
      {
        name: "Cuadro de Acuarela",
        description:
          "Pintura en acuarela de paisajes costeros de Puerto Rico. Firmada por el artista local.",
        priceUsd: 95.0,
        imageUrl: img("1579783902614-a3fb3927b6a5"),
        variants: [
          { title: "8x10 pulgadas", sku: "CA-810", price: 95.0, stock: 5 },
          { title: "11x14 pulgadas", sku: "CA-1114", price: 145.0, stock: 3 },
        ],
      },
      {
        name: "Santos de Palo",
        description:
          "Santo tallado en madera siguiendo la tradición puertorriqueña. Acabado artesanal, cada pieza es única.",
        priceUsd: 120.0,
        imageUrl: img("1578662996442-48f60103fc96"),
        variants: [
          { title: "6 pulgadas", sku: "SP-6P", price: 120.0, stock: 4 },
          { title: "10 pulgadas", sku: "SP-10P", price: 185.0, stock: 2 },
        ],
      },
    ],
  },

  // ── 4 ── Cocina de la Isla ────────────────────────────────────────────────
  {
    email: "cocina.isla@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "Ana Ortiz",
    shop: {
      slug: "cocina-de-la-isla",
      vendorName: "Cocina de la Isla",
      description:
        "Sazones, salsas y productos alimentarios 100% boricuas. Recetas caseras que te traen el sabor de Puerto Rico a tu mesa.",
      logoUrl: img("1572441713132-c542fc4fe282", 400),
      rating: 4.9,
      reviewCount: 91,
      shippingFlatFee: 7.0,
      offersPickup: true,
    },
    products: [
      {
        name: "Sofrito Casero",
        description:
          "Sofrito tradicional puertorriqueño hecho con ají caballero, culantro, ajo y cebolla frescos. Sin conservantes.",
        priceUsd: 8.5,
        imageUrl: img("1572441713132-c542fc4fe282"),
        variants: [
          { title: "Envase 8oz", sku: "SOF-8", price: 8.5, stock: 30 },
          { title: "Envase 16oz", sku: "SOF-16", price: 14.0, stock: 20 },
        ],
      },
      {
        name: "Adobo Artesanal",
        description:
          "Mezcla de especias con orégano brujo, ajo y pimentón. La sazón perfecta para tus carnes y arroces.",
        priceUsd: 6.0,
        imageUrl: img("1546548970-71785318a17b"),
        variants: [
          { title: "Envase 4oz", sku: "ADO-4", price: 6.0, stock: 40 },
          { title: "Envase 8oz", sku: "ADO-8", price: 10.0, stock: 25 },
        ],
      },
      {
        name: "Salsa BBQ Criolla",
        description:
          "Salsa BBQ con toque criollo: tamarindo, guayaba y chile habanero. Perfecta para asados boricuas.",
        priceUsd: 9.0,
        imageUrl: img("1565299585323-38d6b0865b47"),
        variants: [
          { title: "Botella 12oz", sku: "BBQ-12", price: 9.0, stock: 25 },
          { title: "Botella 24oz", sku: "BBQ-24", price: 16.0, stock: 15 },
        ],
      },
      {
        name: "Pique Casero",
        description:
          "Salsa picante artesanal con ajíes caballeros frescos en vinagre. Picor moderado con mucho sabor.",
        priceUsd: 7.5,
        imageUrl: img("1601050690597-df0568f70950"),
        variants: [
          { title: "8oz - Suave", sku: "PIC-S", price: 7.5, stock: 20 },
          { title: "8oz - Picante", sku: "PIC-P", price: 7.5, stock: 18 },
          { title: "8oz - Extra Picante", sku: "PIC-X", price: 7.5, stock: 12 },
        ],
      },
      {
        name: "Jalea de Guayaba",
        description:
          "Jalea de guayaba hecha en casa con guayabas cosechadas localmente. Sin colorantes ni conservantes artificiales.",
        priceUsd: 8.0,
        imageUrl: img("1534940519139-f860fb3c6e38"),
        variants: [
          { title: "Envase 8oz", sku: "JG-8", price: 8.0, stock: 30 },
          { title: "Envase 16oz", sku: "JG-16", price: 14.0, stock: 20 },
        ],
      },
      {
        name: "Recao Seco Molido",
        description:
          "Recao (culantro) cosechado localmente y molido para sazón. Ingrediente esencial de la cocina puertorriqueña.",
        priceUsd: 4.5,
        imageUrl: img("1466637574441-749b8f19452f"),
        variants: [
          { title: "Bolsa 2oz", sku: "REC-2", price: 4.5, stock: 50 },
          { title: "Bolsa 4oz", sku: "REC-4", price: 7.5, stock: 30 },
        ],
      },
      {
        name: "Mermelada de Parcha",
        description:
          "Mermelada de maracuyá (parcha) de Puerto Rico, con toque de jengibre. Ideal con pan o yogur.",
        priceUsd: 7.0,
        imageUrl: img("1551918120-9739cb430c6d"),
        variants: [
          { title: "Envase 8oz", sku: "MP-8", price: 7.0, stock: 25 },
        ],
      },
      {
        name: "Tembleque Empacado",
        description:
          "Mezcla lista para preparar el postre tradicional boricua de coco. Solo añade agua de coco y refrigera.",
        priceUsd: 5.5,
        imageUrl: img("1555939594-58d7cb561ad1"),
        variants: [
          { title: "Bolsa 1 porción", sku: "TEM-1", price: 5.5, stock: 35 },
          { title: "Bolsa 4 porciones", sku: "TEM-4", price: 18.0, stock: 20 },
        ],
      },
    ],
  },

  // ── 5 ── Joyería Taína ────────────────────────────────────────────────────
  {
    email: "joyeria.taina@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "Xiomara Torres",
    shop: {
      slug: "joyeria-taina",
      vendorName: "Joyería Taína",
      description:
        "Joyas artesanales inspiradas en la cultura taína y el mar de Puerto Rico. Elaboradas con plata, oro y piedras semipreciosas del Caribe.",
      logoUrl: img("1599643478518-a784e5dc4c8f", 400),
      rating: 4.8,
      reviewCount: 56,
      shippingFlatFee: 4.0,
      offersPickup: false,
    },
    products: [
      {
        name: "Collar Coquí de Plata",
        description:
          "Collar de plata .925 con coquí artesanal como dije. Cadena de 18 pulgadas incluida. El símbolo de PR en plata.",
        priceUsd: 55.0,
        imageUrl: img("1599643478518-a784e5dc4c8f"),
        variants: [
          { title: 'Cadena 16"', sku: "CCP-16", price: 55.0, stock: 8 },
          { title: 'Cadena 18"', sku: "CCP-18", price: 60.0, stock: 10 },
          { title: 'Cadena 20"', sku: "CCP-20", price: 65.0, stock: 7 },
        ],
      },
      {
        name: "Aretes de Coral",
        description:
          "Aretes de coral caribeño natural en tonos rojos y rosas. Montado en plata .925 con cierre de palanca.",
        priceUsd: 42.0,
        imageUrl: img("1630019852942-f89202989a59"),
        variants: [
          { title: "Coral Rojo", sku: "AC-R", price: 42.0, stock: 12 },
          { title: "Coral Rosa", sku: "AC-P", price: 42.0, stock: 10 },
        ],
      },
      {
        name: "Pulsera de Turquesa",
        description:
          "Pulsera de turquesa caribeña con engaste en plata. Piedra natural, cada pieza es única en su patrón.",
        priceUsd: 38.0,
        imageUrl: img("1611591437281-460bfbe1220a"),
        variants: [
          { title: 'Talla S (6")', sku: "PT-S", price: 38.0, stock: 8 },
          { title: 'Talla M (7")', sku: "PT-M", price: 38.0, stock: 12 },
          { title: 'Talla L (8")', sku: "PT-L", price: 38.0, stock: 6 },
        ],
      },
      {
        name: "Anillo de Concha",
        description:
          "Anillo tallado en concha de caracol natural del Caribe. Diseño geométrico inspirado en patrones taínos.",
        priceUsd: 32.0,
        imageUrl: img("1543294001-f7cd5d7fb516"),
        variants: [
          { title: "Talla 5", sku: "ANC-5", price: 32.0, stock: 4 },
          { title: "Talla 6", sku: "ANC-6", price: 32.0, stock: 6 },
          { title: "Talla 7", sku: "ANC-7", price: 32.0, stock: 5 },
          { title: "Talla 8", sku: "ANC-8", price: 32.0, stock: 4 },
        ],
      },
      {
        name: "Pendientes de Oro",
        description:
          "Aretes de argolla en oro 14k con detalle de sol taíno. Peso ligero, perfectos para uso diario.",
        priceUsd: 125.0,
        imageUrl: img("1515562141207-7a88fb7ce338"),
        variants: [
          { title: "14mm", sku: "POA-14", price: 125.0, stock: 6 },
          { title: "20mm", sku: "POA-20", price: 155.0, stock: 5 },
        ],
      },
      {
        name: "Set de Pulseras Playeras",
        description:
          "Set de 5 pulseras de hilo encerado con cuentas de conchas y madera de playa. Estilo boho caribeño.",
        priceUsd: 18.0,
        imageUrl: img("1573408301185-9519f94609d6"),
        variants: [
          { title: "Colores Naturales", sku: "SPP-N", price: 18.0, stock: 20 },
          { title: "Colores Vibrantes", sku: "SPP-V", price: 18.0, stock: 18 },
        ],
      },
      {
        name: "Collar de Ámbar",
        description:
          "Collar de ámbar dominicano auténtico en tonos dorados y rojos. Cadena de plata .925, 18 pulgadas.",
        priceUsd: 72.0,
        imageUrl: img("1614332287897-cdc485fa562d"),
        variants: [
          { title: "Ámbar Dorado", sku: "CAM-D", price: 72.0, stock: 6 },
          { title: "Ámbar Rojo", sku: "CAM-R", price: 78.0, stock: 5 },
        ],
      },
    ],
  },

  // ── 6 ── Verde Caribe Plantas ─────────────────────────────────────────────
  {
    email: "verde.caribe@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "Pedro Nazario",
    shop: {
      slug: "verde-caribe",
      vendorName: "Verde Caribe",
      description:
        "Plantas tropicales, suculentas y flores nativas de Puerto Rico. Todo lo que necesitas para crear tu jardín tropical soñado.",
      logoUrl: img("1501004318641-b39e6451bec6", 400),
      rating: 4.6,
      reviewCount: 38,
      shippingFlatFee: 8.0,
      offersPickup: true,
    },
    products: [
      {
        name: "Orquídea Tropical",
        description:
          "Orquídea dendrobium. Flor blanca con centro morado. Maceta de barro pintada incluida.",
        priceUsd: 22.0,
        imageUrl: img("1569870499705-504209102861"),
        variants: [
          { title: 'Maceta 4" - Blanca', sku: "ORQ-4-B", price: 22.0, stock: 15 },
          { title: 'Maceta 6" - Blanca', sku: "ORQ-6-B", price: 35.0, stock: 10 },
          { title: 'Maceta 4" - Morada', sku: "ORQ-4-M", price: 22.0, stock: 12 },
        ],
      },
      {
        name: "Set de Suculentas",
        description:
          "Colección de 3 suculentas en macetas de barro pintadas a mano. Fáciles de cuidar, perfectas para interiores.",
        priceUsd: 18.0,
        imageUrl: img("1501004318641-b39e6451bec6"),
        variants: [
          { title: "Set de 3", sku: "SUC-3", price: 18.0, stock: 20 },
          { title: "Set de 6", sku: "SUC-6", price: 32.0, stock: 12 },
        ],
      },
      {
        name: "Helecho Boston",
        description:
          "Helecho Boston de frondas largas y abundantes. Planta tropical perfecta para porches y terrazas.",
        priceUsd: 16.0,
        imageUrl: img("1502083898352-e706ac233f63"),
        variants: [
          { title: 'Maceta 8"', sku: "HEL-8", price: 16.0, stock: 18 },
          { title: 'Maceta 10" - Colgante', sku: "HEL-10C", price: 28.0, stock: 10 },
        ],
      },
      {
        name: "Palma Areca",
        description:
          "Palma areca pequeña ideal para interiores. Purifica el aire y da un toque tropical a cualquier espacio.",
        priceUsd: 25.0,
        imageUrl: img("1459156212016-c812468e2115"),
        variants: [
          { title: 'Maceta 6"', sku: "PAL-6", price: 25.0, stock: 10 },
          { title: 'Maceta 10"', sku: "PAL-10", price: 45.0, stock: 6 },
        ],
      },
      {
        name: "Enredadera Tropical",
        description:
          "Enredadera de flores amarillas brillantes. Crece rápido y florece todo el año en Puerto Rico.",
        priceUsd: 12.0,
        imageUrl: img("1490750967868-88df5691cc5b"),
        variants: [
          { title: 'Plántula 4"', sku: "ENR-4", price: 12.0, stock: 25 },
          { title: 'Planta 8"', sku: "ENR-8", price: 22.0, stock: 15 },
        ],
      },
      {
        name: "Tierra Abonada Premium",
        description:
          "Mezcla de tierra para plantas tropicales. Enriquecida con compost local y perlita para drenaje óptimo.",
        priceUsd: 9.0,
        imageUrl: img("1416879595882-3373a0480b5b"),
        variants: [
          { title: "Bolsa 5 litros", sku: "TAP-5", price: 9.0, stock: 30 },
          { title: "Bolsa 10 litros", sku: "TAP-10", price: 16.0, stock: 20 },
        ],
      },
      {
        name: "Cactus Decorativo",
        description:
          "Cactus de bajo mantenimiento en maceta artesanal pintada. Perfecto como regalo o para decorar cualquier espacio.",
        priceUsd: 14.0,
        imageUrl: img("1509423350716-97f9360b4e09"),
        variants: [
          { title: 'Maceta 3" - Blanca', sku: "CAC-3B", price: 14.0, stock: 20 },
          { title: 'Maceta 3" - Terracota', sku: "CAC-3T", price: 14.0, stock: 18 },
          { title: 'Maceta 5" - Terracota', sku: "CAC-5T", price: 22.0, stock: 12 },
        ],
      },
    ],
  },

  // ── 7 ── Belleza Tropical ─────────────────────────────────────────────────
  {
    email: "belleza.tropical@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "Daniela Sepúlveda",
    shop: {
      slug: "belleza-tropical",
      vendorName: "Belleza Tropical",
      description:
        "Productos de belleza naturales elaborados con ingredientes tropicales de Puerto Rico. Sin químicos dañinos, 100% cruelty-free.",
      logoUrl: img("1596462502278-27bfdc403348", 400),
      rating: 4.9,
      reviewCount: 74,
      shippingFlatFee: 5.0,
      offersPickup: false,
    },
    products: [
      {
        name: "Aceite de Coco Virgen",
        description:
          "Aceite de coco virgen extra prensado en frío, cosechado en las costas de Puerto Rico. Multi-uso: piel, cabello y cocina.",
        priceUsd: 14.0,
        imageUrl: img("1565843714144-d5a3292f5a6f"),
        variants: [
          { title: "4oz", sku: "ACV-4", price: 14.0, stock: 25 },
          { title: "8oz", sku: "ACV-8", price: 24.0, stock: 15 },
          { title: "16oz", sku: "ACV-16", price: 42.0, stock: 10 },
        ],
      },
      {
        name: "Jabón de Aloe Vera",
        description:
          "Jabón artesanal de aloe vera con vitamina E. Suaviza y humecta la piel. Sin SLS, sin parabenos.",
        priceUsd: 9.0,
        imageUrl: img("1556228578-8c89e6adf883"),
        variants: [
          { title: "Barra 4oz", sku: "JAV-1", price: 9.0, stock: 30 },
          { title: "Pack 3 barras", sku: "JAV-3", price: 24.0, stock: 15 },
        ],
      },
      {
        name: "Crema de Cuerpo de Mango",
        description:
          "Crema hidratante con mantequilla de mango tropical y aceite de jojoba. Absorción rápida, fragancia natural.",
        priceUsd: 18.0,
        imageUrl: img("1596462502278-27bfdc403348"),
        variants: [
          { title: "4oz", sku: "CCM-4", price: 18.0, stock: 20 },
          { title: "8oz", sku: "CCM-8", price: 32.0, stock: 12 },
        ],
      },
      {
        name: "Mascarilla de Papaya",
        description:
          "Mascarilla facial exfoliante con enzimas de papaya. Aclara y suaviza la piel con uso regular.",
        priceUsd: 22.0,
        imageUrl: img("1598440947619-2c35fc9aa908"),
        variants: [
          { title: "Envase 2oz", sku: "MPA-2", price: 22.0, stock: 15 },
        ],
      },
      {
        name: "Shampoo Natural",
        description:
          "Champú artesanal con extracto de flamboyán y aceite de argán. Para todo tipo de cabello. Sin sulfatos.",
        priceUsd: 16.0,
        imageUrl: img("1556228453-efd6c1ff04f6"),
        variants: [
          { title: "Botella 8oz", sku: "SHF-8", price: 16.0, stock: 20 },
          { title: "Botella 16oz", sku: "SHF-16", price: 28.0, stock: 12 },
        ],
      },
      {
        name: "Sérum de Vitamina C",
        description:
          "Sérum facial con vitamina C estabilizada y ácido hialurónico. Ilumina y protege contra el sol tropical.",
        priceUsd: 32.0,
        imageUrl: img("1571781926291-c477ebfd024b"),
        variants: [
          { title: "Frasco 1oz", sku: "SVC-1", price: 32.0, stock: 12 },
        ],
      },
      {
        name: "Perfume de Gardenia",
        description:
          "Perfume artesanal con esencia de gardenia caribeña. Fragancia floral fresca, larga duración. Alcohol orgánico.",
        priceUsd: 38.0,
        imageUrl: img("1590736969955-71cc94901144"),
        variants: [
          { title: "30ml Roll-on", sku: "PG-30R", price: 38.0, stock: 15 },
          { title: "50ml Spray", sku: "PG-50S", price: 52.0, stock: 10 },
        ],
      },
    ],
  },

  // ── 8 ── Casa Boricua ─────────────────────────────────────────────────────
  {
    email: "casa.boricua@demo.mitiendita.pr",
    password: "Demo1234!",
    fullName: "Luis Vélez",
    shop: {
      slug: "casa-boricua",
      vendorName: "Casa Boricua",
      description:
        "Decoración para el hogar con identidad puertorriqueña. Desde cojines artesanales hasta velas aromáticas, todo hecho con amor en la isla.",
      logoUrl: img("1555041469-a586c61ea9bc", 400),
      rating: 4.7,
      reviewCount: 49,
      shippingFlatFee: 6.0,
      offersPickup: true,
    },
    products: [
      {
        name: "Cojín Tropical",
        description:
          "Cojín decorativo con estampado de playa tropical boricua. Tela resistente a la humedad, relleno hipoalergénico.",
        priceUsd: 28.0,
        imageUrl: img("1555041469-a586c61ea9bc"),
        variants: [
          { title: '18x18" - Palmas', sku: "CDP-PAL", price: 28.0, stock: 12 },
          { title: '18x18" - Coquí', sku: "CDP-COQ", price: 28.0, stock: 10 },
          { title: '20x20" - Palmas', sku: "CDP-20PAL", price: 35.0, stock: 8 },
        ],
      },
      {
        name: "Vela Aromática Tropical",
        description:
          "Vela de soya con aroma de coco y gardenia. Contenedor de cristal reutilizable, 40+ horas de quema.",
        priceUsd: 24.0,
        imageUrl: img("1602143407151-7111542de6e8"),
        variants: [
          { title: "8oz - Coco & Gardenia", sku: "VAT-8CG", price: 24.0, stock: 20 },
          { title: "8oz - Flamboyán & Vainilla", sku: "VAT-8FV", price: 24.0, stock: 18 },
          { title: "16oz - Coco & Gardenia", sku: "VAT-16CG", price: 38.0, stock: 10 },
        ],
      },
      {
        name: "Marco de Fotos de Madera",
        description:
          "Marco artesanal tallado en madera. Disponible para fotos de 4x6 y 5x7 con acabado natural.",
        priceUsd: 32.0,
        imageUrl: img("1619636744878-c0ab85edd7c8"),
        variants: [
          { title: "4x6 - Natural", sku: "MFM-46N", price: 32.0, stock: 10 },
          { title: "5x7 - Natural", sku: "MFM-57N", price: 40.0, stock: 8 },
          { title: "4x6 - Oscuro", sku: "MFM-46O", price: 32.0, stock: 8 },
        ],
      },
      {
        name: "Mantel Bordado",
        description:
          "Mantel de lino con bordado floral hecho a mano. Diseño de flores tropicales puertorriqueñas en hilos de colores.",
        priceUsd: 45.0,
        imageUrl: img("1558618666-fcd25c85cd64"),
        variants: [
          { title: '4 personas (60x60")', sku: "MB-4P", price: 45.0, stock: 8 },
          { title: '6 personas (60x90")', sku: "MB-6P", price: 65.0, stock: 6 },
        ],
      },
      {
        name: "Plato Decorativo de Cerámica",
        description:
          "Plato de cerámica pintado a mano con escenas de la vida en Puerto Rico. Solo decorativo, pieza de colección.",
        priceUsd: 36.0,
        imageUrl: img("1565193566173-7a0ee3dbe261"),
        variants: [
          { title: "10\" - Escena costera", sku: "PDC-10C", price: 36.0, stock: 8 },
          { title: "10\" - Escena del campo", sku: "PDC-10CA", price: 36.0, stock: 7 },
        ],
      },
      {
        name: "Hamaca de Algodón",
        description:
          "Hamaca tejida a mano de algodón macramé. Perfecta para el patio o la terraza tropical. Soporta hasta 300 lbs.",
        priceUsd: 85.0,
        imageUrl: img("1504196606672-aef5c9cefc92"),
        variants: [
          { title: "Individual - Natural", sku: "HAM-I-N", price: 85.0, stock: 6 },
          { title: "Individual - Multicolor", sku: "HAM-I-M", price: 85.0, stock: 5 },
          { title: "Doble - Natural", sku: "HAM-D-N", price: 125.0, stock: 4 },
        ],
      },
      {
        name: "Difusor de Aromas",
        description:
          "Difusor de bambú con 6 varillas y aceite esencial de ylang-ylang caribeño. Fragancia suave de larga duración.",
        priceUsd: 20.0,
        imageUrl: img("1600857544200-b2f666a9a2ec"),
        variants: [
          { title: "Set - Ylang-ylang", sku: "DA-YY", price: 20.0, stock: 15 },
          { title: "Set - Coco & Lima", sku: "DA-CL", price: 20.0, stock: 12 },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------
async function seedVendor(vendor) {
  console.log(`\n→ ${vendor.shop.vendorName} (${vendor.email})`);

  // 1. Create auth user (or fetch existing)
  let userId;
  await run("crear usuario", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: vendor.email,
      password: vendor.password,
      email_confirm: true,
    });
    if (error) {
      if (error.message?.includes("already been registered")) {
        // fetch existing user
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email === vendor.email);
        if (!existing) throw new Error(`No se encontró el usuario ${vendor.email}`);
        userId = existing.id;
        return;
      }
      throw error;
    }
    userId = data.user.id;
  });

  // 2. Update profile (trigger already inserted id+email)
  await run("actualizar perfil", async () => {
    const { error } = await admin
      .from("profiles")
      .upsert(
        { id: userId, email: vendor.email, full_name: vendor.fullName, role: "vendor" },
        { onConflict: "id" },
      );
    if (error) throw error;
  });

  // 3. Create shop
  let shopId;
  await run("crear tienda", async () => {
    // Check if shop already exists
    const { data: existing } = await admin
      .from("shops")
      .select("id")
      .eq("slug", vendor.shop.slug)
      .maybeSingle();

    if (existing) {
      shopId = existing.id;
      return;
    }

    const { data, error } = await admin
      .from("shops")
      .insert({
        vendor_profile_id: userId,
        slug: vendor.shop.slug,
        vendor_name: vendor.shop.vendorName,
        description: vendor.shop.description,
        logo_url: vendor.shop.logoUrl,
        rating: vendor.shop.rating,
        review_count: vendor.shop.reviewCount,
        is_active: true,
        status: "active",
        shipping_flat_fee_usd: vendor.shop.shippingFlatFee,
        offers_pickup: vendor.shop.offersPickup,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    shopId = data.id;
  });

  // 4. Vendor subscription
  await run("crear subscripción", async () => {
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    const { error } = await admin.from("vendor_subscriptions").upsert(
      {
        shop_id: shopId,
        provider: "stripe",
        status: "active",
        current_period_end: periodEnd.toISOString(),
        stripe_customer_id: `cus_demo_${vendor.shop.slug}`,
        stripe_subscription_id: `sub_demo_${vendor.shop.slug}`,
      },
      { onConflict: "shop_id" },
    );
    if (error) throw error;
  });

  // 5. Vendor onboarding (completed)
  await run("marcar onboarding completo", async () => {
    const { error } = await admin.from("vendor_onboarding").upsert(
      {
        profile_id: userId,
        status: "completed",
        current_step: 8,
        data_json: {
          step_2: { phone: "787-555-0100" },
          step_3: { shop_name: vendor.shop.vendorName },
          step_4: { description: vendor.shop.description },
        },
        completed_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );
    if (error) throw error;
  });

  // 6. Products + variants + images
  let productCount = 0;
  let variantCount = 0;

  for (const product of vendor.products) {
    await run(`producto: ${product.name}`, async () => {
      // Insert product (check slug-based dedup by name+shop_id)
      const { data: existing } = await admin
        .from("products")
        .select("id")
        .eq("shop_id", shopId)
        .eq("name", product.name)
        .maybeSingle();

      let productId;
      if (existing) {
        productId = existing.id;
      } else {
        const { data, error } = await admin
          .from("products")
          .insert({
            shop_id: shopId,
            name: product.name,
            description: product.description,
            price_usd: product.priceUsd,
            image_url: product.imageUrl,
            is_active: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
        productCount++;

        // Product image entry
        await admin.from("product_images").insert({
          product_id: productId,
          image_url: product.imageUrl,
          alt: product.name,
          sort_order: 0,
        });

        // Variants
        const variantRows = product.variants.map((v) => ({
          product_id: productId,
          title: v.title,
          sku: v.sku,
          price_usd: v.price,
          stock_qty: v.stock,
          is_active: true,
          attributes_json: {},
        }));

        const { error: varError } = await admin
          .from("product_variants")
          .insert(variantRows);
        if (varError) throw varError;
        variantCount += variantRows.length;
      }
    });
  }

  console.log(
    `  → ${vendor.shop.vendorName}: ${productCount} productos, ${variantCount} variantes`,
  );
}

async function main() {
  console.log("🌴 Iniciando seed de vendedores...\n");

  for (const vendor of VENDORS) {
    await seedVendor(vendor);
  }

  console.log("\n✅ Seed completado.");
  console.log("\nCredenciales de vendedores:");
  for (const v of VENDORS) {
    console.log(`  ${v.shop.vendorName.padEnd(28)} ${v.email} / ${v.password}`);
  }
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err.message);
  process.exit(1);
});
