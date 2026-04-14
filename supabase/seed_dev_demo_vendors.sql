-- Demo vendors + products for DEVELOPMENT / STAGING only.
-- Project: mitienditapr-dev (run in SQL Editor or via Supabase MCP).
--
-- Login: each account email below, password: DevSeed2026!
-- Remove old demo data first (slugs demo-* and emails @dev.mitienditapr.test).

begin;

-- Clean previous demo seed (safe if nothing exists)
delete from public.orders o
using public.shops s
where o.shop_id = s.id
  and s.slug like 'demo-%';

delete from public.shops where slug like 'demo-%';

delete from auth.users where email like '%@dev.mitienditapr.test';

create temporary table _seed_shops (
  slug text primary key,
  shop_id uuid not null,
  owner_id uuid not null
) on commit drop;

do $seed$
declare
  inst constant uuid := '00000000-0000-0000-0000-000000000000';
  pwd constant text := crypt('DevSeed2026!', gen_salt('bf'));
  i int;
  u uuid;
  s uuid;
  vid_terms uuid;
  vid_ship uuid;
  vid_refund uuid;
  vid_priv uuid;
  emails text[] := array[
    'seed-demo-cafe@dev.mitienditapr.test',
    'seed-demo-arte@dev.mitienditapr.test',
    'seed-demo-verde@dev.mitienditapr.test',
    'seed-demo-moda@dev.mitienditapr.test',
    'seed-demo-tech@dev.mitienditapr.test',
    'seed-demo-dulces@dev.mitienditapr.test'
  ];
  full_names text[] := array[
    'Marisol Vega',
    'Carlos Méndez',
    'Ana Sofía Torres',
    'Gabriel Nieves',
    'Daniela Ortiz',
    'Rosa Emilia Vázquez'
  ];
  phones text[] := array[
    '(787) 555-0101',
    '(787) 555-0102',
    '(939) 555-0103',
    '(787) 555-0104',
    '(787) 555-0105',
    '(939) 555-0106'
  ];
  addresses text[] := array[
    'Urb. Santa Juanita, Bayamón, PR00956',
    'Calle Loíza #214, Santurce, San Juan, PR 00911',
    'Plaza Río Hondo, Bayamón, PR 00961',
    'Av. Ashford 6, Condado, San Juan, PR 00907',
    'Rexville Town Center, Bayamón, PR 00957',
    'Calle Mayor #45, Río Piedras, PR 00925'
  ];
  zips text[] := array['00956', '00911', '00961', '00907', '00957', '00925'];
  avatars text[] := array[
    'https://picsum.photos/seed/mt-avatar-cafe/120/120',
    'https://picsum.photos/seed/mt-avatar-arte/120/120',
    'https://picsum.photos/seed/mt-avatar-verde/120/120',
    'https://picsum.photos/seed/mt-avatar-moda/120/120',
    'https://picsum.photos/seed/mt-avatar-tech/120/120',
    'https://picsum.photos/seed/mt-avatar-dulces/120/120'
  ];
  slugs text[] := array[
    'demo-cafeteria-el-coqui',
    'demo-arte-y-barro',
    'demo-verde-bayamon',
    'demo-moda-isla',
    'demo-tech-plaza',
    'demo-dulces-abuela'
  ];
  shop_names text[] := array[
    'Cafetería El Coquí',
    'Arte y Barro',
    'Verde Bayamón',
    'Moda Isla',
    'Tech Plaza PR',
    'Dulces de la Abuela'
  ];
  shop_descs text[] := array[
    'Café artesanal, panes del día y desayunos rápidos. Tostadores locales y opción sin lactosa.',
    'Cerámica hecha a mano, piezas únicas para hogar y regalos. Taller pequeño en Santurce.',
    'Verduras, frutas y hierbas de fincas en la montaña. Bolsa de la semana y entregas los viernes.',
    'Ropa ligera tropical, tallas XS–XXL y accesorios. Cambios dentro de 10 días.',
    'Accesorios para laptop, cables USB-C certificados, audífonos y organizadores de escritorio.',
    'Dulces típicos: tembleque, majarete, piragüitas de sabores clásicos. Por encargo para fiestas.'
  ];
  logos text[] := array[
    'https://picsum.photos/seed/mt-logo-cafe/240/240',
    'https://picsum.photos/seed/mt-logo-arte/240/240',
    'https://picsum.photos/seed/mt-logo-verde/240/240',
    'https://picsum.photos/seed/mt-logo-moda/240/240',
    'https://picsum.photos/seed/mt-logo-tech/240/240',
    'https://picsum.photos/seed/mt-logo-dulces/240/240'
  ];
  ath text[] := array[
    '7876001001',
    '7876001002',
    '7876001003',
    '7876001004',
    '7876001005',
    '7876001006'
  ];
  ig text[] := array[
    '@elcoqui.cafe',
    '@arteybarro.pr',
    '@verde.bayamon',
    '@modaisla',
    '@techplaza.pr',
    '@dulces.abuela.pr'
  ];
  ship_fees numeric[] := array[4.99, 6.50, 5.00, 0.00, 7.25, 3.99];
  pickups boolean[] := array[true, false, true, false, true, false];
begin
  for i in 1..6  loop
    u := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      u,
      inst,
      'authenticated',
      'authenticated',
      emails[i],
      pwd,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      u,
      jsonb_build_object('sub', u::text, 'email', emails[i]),
      'email',
      u::text,
      now(),
      now(),
      now()
    );

    update public.profiles
    set
      role = 'vendor',
      full_name = full_names[i],
      phone = phones[i],
      address = addresses[i],
      zip_code = zips[i],
      avatar_url = avatars[i],
      email = emails[i]
    where id = u;

    insert into public.shops (
      slug,
      vendor_profile_id,
      vendor_name,
      description,
      logo_url,
      is_active,
      status,
      shipping_flat_fee_usd,
      offers_pickup,
      published_at,
      ath_movil_phone,
      contact_phone,
      contact_instagram,
      contact_facebook,
      contact_whatsapp
    )
    values (
      slugs[i],
      u,
      shop_names[i],
      shop_descs[i],
      logos[i],
      true,
      'active',
      ship_fees[i],
      pickups[i],
      now(),
      ath[i],
      phones[i],
      ig[i],
      'https://facebook.com/mitiendita-demo-' || i::text,
      'https://wa.me/1' || replace(replace(ath[i], '-', ''), '(', '')
    )
    returning id into s;

    insert into _seed_shops (slug, shop_id, owner_id)
    values (slugs[i], s, u);

    insert into public.vendor_subscriptions (
      shop_id,
      provider,
      status,
      current_period_end,
      provider_subscription_id,
      stripe_subscription_id
    )
    values (
      s,
      'stripe',
      'active',
      now() + interval '365 days',
      'seed_sub_' || replace(s::text, '-', ''),
      null
    );

    insert into public.vendor_onboarding (
      profile_id,
      status,
      current_step,
      data_json,
      completed_at
    )
    values (
      u,
      'completed',
      8,
      '{"seed": true}'::jsonb,
      now()
    );

    insert into public.shop_policies (
      shop_id,
      refund_policy,
      shipping_policy,
      privacy_policy,
      terms
    )
    values (
      s,
      'Devoluciones por defecto (dev): 7 días en producto sin uso, con recibo.',
      'Envíos en Puerto Rico (dev): 3–7 días laborables. Costo según checkout.',
      'Privacidad (dev): datos solo para despacho y soporte; no se venden listas.',
      'Términos (dev): precios en USD; la tienda cumple con leyes aplicables en PR.'
    );

    insert into public.shop_policy_versions (
      shop_id,
      policy_type,
      locale,
      title,
      body,
      source_template_id,
      version_number,
      is_current,
      published_at,
      published_by
    )
    values (
      s,
      'terms',
      'es-PR',
      'Términos (demo)',
      'Términos de demostración para entorno de desarrollo.',
      null,
      1,
      true,
      now(),
      u
    )
    returning id into vid_terms;

    insert into public.shop_policy_versions (
      shop_id,
      policy_type,
      locale,
      title,
      body,
      source_template_id,
      version_number,
      is_current,
      published_at,
      published_by
    )
    values (
      s,
      'shipping',
      'es-PR',
      'Envío (demo)',
      'Política de envío de demostración.',
      null,
      1,
      true,
      now(),
      u
    )
    returning id into vid_ship;

    insert into public.shop_policy_versions (
      shop_id,
      policy_type,
      locale,
      title,
      body,
      source_template_id,
      version_number,
      is_current,
      published_at,
      published_by
    )
    values (
      s,
      'refund',
      'es-PR',
      'Reembolsos (demo)',
      'Política de reembolso de demostración.',
      null,
      1,
      true,
      now(),
      u
    )
    returning id into vid_refund;

    insert into public.shop_policy_versions (
      shop_id,
      policy_type,
      locale,
      title,
      body,
      source_template_id,
      version_number,
      is_current,
      published_at,
      published_by
    )
    values (
      s,
      'privacy',
      'es-PR',
      'Privacidad (demo)',
      'Política de privacidad de demostración.',
      null,
      1,
      true,
      now(),
      u
    )
    returning id into vid_priv;

    update public.shop_policies sp
    set
      terms_version_id = vid_terms,
      shipping_version_id = vid_ship,
      refund_version_id = vid_refund,
      privacy_version_id = vid_priv
    where sp.shop_id = s;

    insert into public.vendor_policy_acceptances (
      shop_id,
      accepted_by_profile_id,
      acceptance_scope,
      terms_version_id,
      shipping_version_id,
      refund_version_id,
      privacy_version_id,
      acceptance_text
    )
    values (
      s,
      u,
      'publish',
      vid_terms,
      vid_ship,
      vid_refund,
      vid_priv,
      'Acepto términos y políticas (datos de prueba dev).'
    );
  end loop;
end
$seed$;

insert into public.products (
  shop_id,
  name,
  description,
  price_usd,
  image_url,
  is_active,
  rating,
  review_count
)
select
  m.shop_id,
  v.name,
  v.description,
  v.price,
  v.image_url,
  true,
  v.rating,
  v.review_count
from _seed_shops m
join (
  values
    ('demo-cafeteria-el-coqui', 'Café Yaucoffee 12 oz', 'Grano tostado medio, notas a chocolate.', 12.95, 'https://picsum.photos/seed/mt-p-cafe-1/800/600', 4.6, 18),
    ('demo-cafeteria-el-coqui', 'Sandwich de jamón y queso', 'Pan de manteca, servido caliente.', 6.75, 'https://picsum.photos/seed/mt-p-cafe-2/800/600', 4.4, 31),
    ('demo-cafeteria-el-coqui', 'Flan de queso', 'Receta casera, porción individual.', 4.25, 'https://picsum.photos/seed/mt-p-cafe-3/800/600', 4.9, 52),
    ('demo-cafeteria-el-coqui', 'Jugo de chinola fresco', '16 oz, sin azúcar añadida.', 3.50, 'https://picsum.photos/seed/mt-p-cafe-4/800/600', 4.7, 12),
    ('demo-arte-y-barro', 'Taza artesanal “Arena”', 'Gres, 350 ml, apta microondas.', 24.00, 'https://picsum.photos/seed/mt-p-arte-1/800/600', 4.8, 9),
    ('demo-arte-y-barro', 'Cuenco ramen azul cobalto', 'Hecho a torno, único.', 38.00, 'https://picsum.photos/seed/mt-p-arte-2/800/600', 5.0, 6),
    ('demo-arte-y-barro', 'Porta velas minimal', 'Set de 3 piezas.', 16.50, 'https://picsum.photos/seed/mt-p-arte-3/800/600', 4.5, 14),
    ('demo-arte-y-barro', 'Plato decorativo 25 cm', 'Esmalte mate verde oliva.', 42.00, 'https://picsum.photos/seed/mt-p-arte-4/800/600', 4.6, 7),
    ('demo-verde-bayamon', 'Bolsa mixta mediana', '5–6 libras de vegetales de temporada.', 22.00, 'https://picsum.photos/seed/mt-p-verde-1/800/600', 4.9, 64),
    ('demo-verde-bayamon', 'Hierbas frescas (manojo)', 'Culantro, recao o albahaca.', 2.50, 'https://picsum.photos/seed/mt-p-verde-2/800/600', 4.8, 103),
    ('demo-verde-bayamon', 'Tomates cherry 1 lb', 'Invernadero local.', 4.99, 'https://picsum.photos/seed/mt-p-verde-3/800/600', 4.7, 28),
    ('demo-verde-bayamon', 'Pana (1 unidad)', 'Pesa aprox. 2–3 lb.', 5.50, 'https://picsum.photos/seed/mt-p-verde-4/800/600', 4.5, 15),
    ('demo-verde-bayamon', 'Aguacate criollo (par)', 'Maduración en 2–4 días.', 3.25, 'https://picsum.photos/seed/mt-p-verde-5/800/600', 4.6, 41),
    ('demo-moda-isla', 'Guayabera linen blanca', 'Talla S–XL, tela fresca.', 48.00, 'https://picsum.photos/seed/mt-p-moda-1/800/600', 4.5, 22),
    ('demo-moda-isla', 'Vestido midi floral', 'Tirantes ajustables.', 56.00, 'https://picsum.photos/seed/mt-p-moda-2/800/600', 4.7, 17),
    ('demo-moda-isla', 'Sombrero paja natural', 'Protección UPF 50+.', 32.00, 'https://picsum.photos/seed/mt-p-moda-3/800/600', 4.4, 11),
    ('demo-moda-isla', 'Bolso tote yute', 'Forro interior con cierre.', 28.00, 'https://picsum.photos/seed/mt-p-moda-4/800/600', 4.6, 9),
    ('demo-tech-plaza', 'Hub USB-C 7 en 1', 'HDMI 4K, lector SD, PD 100W.', 45.99, 'https://picsum.photos/seed/mt-p-tech-1/800/600', 4.7, 88),
    ('demo-tech-plaza', 'Cable USB-C 2 m (100W)', 'Trenzado nylon.', 14.99, 'https://picsum.photos/seed/mt-p-tech-2/800/600', 4.8, 201),
    ('demo-tech-plaza', 'Soporte laptop aluminio', 'Ajuste 6 ángulos.', 34.50, 'https://picsum.photos/seed/mt-p-tech-3/800/600', 4.6, 44),
    ('demo-tech-plaza', 'Audífonos on-ear BT', '40 h batería (declarado).', 59.00, 'https://picsum.photos/seed/mt-p-tech-4/800/600', 4.3, 56),
    ('demo-tech-plaza', 'Organizador escritorio bambú', 'Compartimentos modulares.', 24.00, 'https://picsum.photos/seed/mt-p-tech-5/800/600', 4.5, 33),
    ('demo-dulces-abuela', 'Tembleque 8 porciones', 'Coco y canela.', 18.00, 'https://picsum.photos/seed/mt-p-dulce-1/800/600', 5.0, 37),
    ('demo-dulces-abuela', 'Majarete tradicional', 'Porción familiar.', 15.50, 'https://picsum.photos/seed/mt-p-dulce-2/800/600', 4.9, 29),
    ('demo-dulces-abuela', 'Caja surtido mini', '6 bocaditos variados.', 12.00, 'https://picsum.photos/seed/mt-p-dulce-3/800/600', 4.8, 19),
    ('demo-dulces-abuela', 'Arroz con dulce (bandeja)', 'Rinde10 porciones.', 22.00, 'https://picsum.photos/seed/mt-p-dulce-4/800/600', 4.7, 14),
    ('demo-dulces-abuela', 'Piragua kit (4 sabores)', 'Jarabes: frambuesa, vainilla, tamarindo, uva.', 20.00, 'https://picsum.photos/seed/mt-p-dulce-5/800/600', 4.6, 8)
) as v(slug, name, description, price, image_url, rating, review_count)
 on m.slug = v.slug;

insert into public.product_variants (
  product_id,
  title,
  sku,
  attributes_json,
  price_usd,
  stock_qty,
  is_active
)
select
  p.id,
  'Estándar',
  'SKU-' || substr(replace(p.id::text, '-', ''), 1, 12),
  '{}'::jsonb,
  p.price_usd,
  (floor(random() * 40) + 5)::int,
  true
from public.products p
join _seed_shops m on p.shop_id = m.shop_id;

insert into public.product_images (product_id, image_url, alt, sort_order)
select
  p.id,
  'https://picsum.photos/seed/' || substr(replace(p.id::text, '-', ''), 1, 16) || '-alt/800/600',
  p.name || ' — vista 2',
  1
from public.products p
join _seed_shops m on p.shop_id = m.shop_id;

commit;
