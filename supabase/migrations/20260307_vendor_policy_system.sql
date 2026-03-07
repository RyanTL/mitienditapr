-- Vendor policies + terms auditable system (PR/US baseline, Spanish primary).
-- Adds policy templates, immutable shop policy versions, vendor acceptance logs,
-- and buyer checkout policy snapshots.

create table if not exists public.policy_templates (
  id uuid primary key default gen_random_uuid(),
  policy_type text not null check (policy_type in ('terms', 'shipping', 'refund', 'privacy')),
  locale text not null default 'es-PR',
  title text not null,
  body_template text not null,
  version integer not null default 1 check (version >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (policy_type, locale, version)
);

create table if not exists public.shop_policy_versions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  policy_type text not null check (policy_type in ('terms', 'shipping', 'refund', 'privacy')),
  locale text not null default 'es-PR',
  title text not null,
  body text not null,
  source_template_id uuid references public.policy_templates(id) on delete set null,
  version_number integer not null check (version_number >= 1),
  is_current boolean not null default true,
  published_at timestamptz not null default now(),
  published_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, policy_type, version_number)
);

create unique index if not exists idx_shop_policy_versions_current_unique
  on public.shop_policy_versions(shop_id, policy_type)
  where is_current = true;

create index if not exists idx_shop_policy_versions_shop_type
  on public.shop_policy_versions(shop_id, policy_type, published_at desc);

create table if not exists public.vendor_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  accepted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  acceptance_scope text not null check (acceptance_scope in ('publish', 'update')),
  terms_version_id uuid not null references public.shop_policy_versions(id) on delete restrict,
  shipping_version_id uuid not null references public.shop_policy_versions(id) on delete restrict,
  refund_version_id uuid references public.shop_policy_versions(id) on delete set null,
  privacy_version_id uuid references public.shop_policy_versions(id) on delete set null,
  ip_hash text,
  user_agent text,
  acceptance_text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_policy_acceptances_shop
  on public.vendor_policy_acceptances(shop_id, accepted_at desc);

create table if not exists public.order_policy_snapshots (
  order_id uuid primary key references public.orders(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  terms_version_id uuid not null references public.shop_policy_versions(id) on delete restrict,
  shipping_version_id uuid not null references public.shop_policy_versions(id) on delete restrict,
  accepted_at timestamptz not null,
  acceptance_text text not null default '',
  created_at timestamptz not null default now()
);

alter table public.shop_policies
  add column if not exists terms_version_id uuid references public.shop_policy_versions(id) on delete set null;

alter table public.shop_policies
  add column if not exists shipping_version_id uuid references public.shop_policy_versions(id) on delete set null;

alter table public.shop_policies
  add column if not exists refund_version_id uuid references public.shop_policy_versions(id) on delete set null;

alter table public.shop_policies
  add column if not exists privacy_version_id uuid references public.shop_policy_versions(id) on delete set null;

drop trigger if exists trg_shop_policy_versions_updated_at on public.shop_policy_versions;
create trigger trg_shop_policy_versions_updated_at
before update on public.shop_policy_versions
for each row execute function public.set_updated_at();

insert into public.policy_templates (policy_type, locale, title, body_template, version, is_active)
values
(
  'terms',
  'es-PR',
  'Terminos y condiciones de venta',
  'Este comercio opera en Puerto Rico y Estados Unidos. Al realizar una compra, aceptas que la tienda vendedora es responsable del producto, su calidad, garantia y cumplimiento legal aplicable. La plataforma MiTienditaPR provee la infraestructura tecnologica y no actua como vendedor del producto.\n\nPagos: Los pagos se procesan por proveedores externos seguros.\n\nCancelaciones: La tienda podra rechazar ordenes por disponibilidad o fraude.\n\nAtencion al cliente: Para reclamaciones sobre productos, debes contactar directamente a la tienda.\n\nAl continuar, confirmas que has leido y aceptado estos terminos.',
  1,
  true
),
(
  'shipping',
  'es-PR',
  'Politica de envio',
  'La tienda realiza envios dentro de Puerto Rico y, cuando aplique, Estados Unidos.\n\nTiempo estimado: {{tiempo_envio}}\nCosto de envio: {{costo_envio}}\nRecogido en tienda: {{recogido}}\n\nLa tienda es responsable del despacho y entrega. La plataforma MiTienditaPR no controla transportistas ni tiempos de entrega.',
  1,
  true
),
(
  'refund',
  'es-PR',
  'Politica de reembolso',
  'Las solicitudes de reembolso o cambio deben realizarse dentro de {{dias_reembolso}} dias desde la entrega.\n\nCondiciones: producto sin uso, en su empaque original y con evidencia de compra.\n\nLos reembolsos aprobados se procesan por la tienda. MiTienditaPR no emite reembolsos directamente.',
  1,
  true
),
(
  'privacy',
  'es-PR',
  'Politica de privacidad de la tienda',
  'La tienda utiliza los datos del cliente solo para procesar ordenes, coordinar entregas y servicio al cliente.\n\nNo se venderan datos personales a terceros.\n\nLa plataforma MiTienditaPR puede procesar datos como operador tecnologico para habilitar pagos, seguridad y funcionalidad del servicio.',
  1,
  true
)
on conflict (policy_type, locale, version) do nothing;

-- Backfill: convert existing shop_policies text into versioned policies when none exist.
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
select
  sp.shop_id,
  'terms',
  'es-PR',
  'Terminos y condiciones de venta',
  sp.terms,
  null,
  1,
  true,
  now(),
  s.vendor_profile_id
from public.shop_policies sp
join public.shops s on s.id = sp.shop_id
where btrim(sp.terms) <> ''
  and not exists (
    select 1
    from public.shop_policy_versions v
    where v.shop_id = sp.shop_id
      and v.policy_type = 'terms'
      and v.is_current = true
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
select
  sp.shop_id,
  'shipping',
  'es-PR',
  'Politica de envio',
  sp.shipping_policy,
  null,
  1,
  true,
  now(),
  s.vendor_profile_id
from public.shop_policies sp
join public.shops s on s.id = sp.shop_id
where btrim(sp.shipping_policy) <> ''
  and not exists (
    select 1
    from public.shop_policy_versions v
    where v.shop_id = sp.shop_id
      and v.policy_type = 'shipping'
      and v.is_current = true
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
select
  sp.shop_id,
  'refund',
  'es-PR',
  'Politica de reembolso',
  sp.refund_policy,
  null,
  1,
  true,
  now(),
  s.vendor_profile_id
from public.shop_policies sp
join public.shops s on s.id = sp.shop_id
where btrim(sp.refund_policy) <> ''
  and not exists (
    select 1
    from public.shop_policy_versions v
    where v.shop_id = sp.shop_id
      and v.policy_type = 'refund'
      and v.is_current = true
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
select
  sp.shop_id,
  'privacy',
  'es-PR',
  'Politica de privacidad de la tienda',
  sp.privacy_policy,
  null,
  1,
  true,
  now(),
  s.vendor_profile_id
from public.shop_policies sp
join public.shops s on s.id = sp.shop_id
where btrim(sp.privacy_policy) <> ''
  and not exists (
    select 1
    from public.shop_policy_versions v
    where v.shop_id = sp.shop_id
      and v.policy_type = 'privacy'
      and v.is_current = true
  );

update public.shop_policies sp
set
  terms_version_id = v_terms.id,
  shipping_version_id = v_shipping.id,
  refund_version_id = v_refund.id,
  privacy_version_id = v_privacy.id
from public.shops s
left join public.shop_policy_versions v_terms
  on v_terms.shop_id = s.id and v_terms.policy_type = 'terms' and v_terms.is_current = true
left join public.shop_policy_versions v_shipping
  on v_shipping.shop_id = s.id and v_shipping.policy_type = 'shipping' and v_shipping.is_current = true
left join public.shop_policy_versions v_refund
  on v_refund.shop_id = s.id and v_refund.policy_type = 'refund' and v_refund.is_current = true
left join public.shop_policy_versions v_privacy
  on v_privacy.shop_id = s.id and v_privacy.policy_type = 'privacy' and v_privacy.is_current = true
where sp.shop_id = s.id;

alter table public.policy_templates enable row level security;
alter table public.shop_policy_versions enable row level security;
alter table public.vendor_policy_acceptances enable row level security;
alter table public.order_policy_snapshots enable row level security;

drop policy if exists "policy_templates_public_read" on public.policy_templates;
create policy "policy_templates_public_read"
on public.policy_templates for select
using (is_active = true);

drop policy if exists "shop_policy_versions_public_read_active_shop" on public.shop_policy_versions;
create policy "shop_policy_versions_public_read_active_shop"
on public.shop_policy_versions for select
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_policy_versions.shop_id
      and s.is_active = true
      and s.status = 'active'
  )
);

drop policy if exists "shop_policy_versions_vendor_mutate_own_shop" on public.shop_policy_versions;
create policy "shop_policy_versions_vendor_mutate_own_shop"
on public.shop_policy_versions for all
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_policy_versions.shop_id
      and s.vendor_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shops s
    where s.id = shop_policy_versions.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "vendor_policy_acceptances_vendor_read_own_shop" on public.vendor_policy_acceptances;
create policy "vendor_policy_acceptances_vendor_read_own_shop"
on public.vendor_policy_acceptances for select
using (
  exists (
    select 1
    from public.shops s
    where s.id = vendor_policy_acceptances.shop_id
      and s.vendor_profile_id = auth.uid()
  )
);

drop policy if exists "vendor_policy_acceptances_vendor_insert_own_shop" on public.vendor_policy_acceptances;
create policy "vendor_policy_acceptances_vendor_insert_own_shop"
on public.vendor_policy_acceptances for insert
with check (
  exists (
    select 1
    from public.shops s
    where s.id = vendor_policy_acceptances.shop_id
      and s.vendor_profile_id = auth.uid()
      and vendor_policy_acceptances.accepted_by_profile_id = auth.uid()
  )
);

drop policy if exists "order_policy_snapshots_own_read" on public.order_policy_snapshots;
create policy "order_policy_snapshots_own_read"
on public.order_policy_snapshots for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_policy_snapshots.order_id
      and o.profile_id = auth.uid()
  )
);

drop policy if exists "order_policy_snapshots_own_insert" on public.order_policy_snapshots;
create policy "order_policy_snapshots_own_insert"
on public.order_policy_snapshots for insert
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_policy_snapshots.order_id
      and o.profile_id = auth.uid()
  )
);
