create temp table if not exists tmp_defaulted_required_policy_shops (
  shop_id uuid primary key,
  published_by uuid not null
) on commit drop;

insert into public.shop_policies (
  shop_id,
  refund_policy,
  shipping_policy,
  privacy_policy,
  terms
)
select
  s.id,
  'Politica de devoluciones y reembolsos:

1. Plazo para devoluciones
Aceptamos solicitudes de devolucion dentro de los primeros 7 dias despues de recibir el producto.

2. Condiciones
El producto debe estar en su condicion original, sin uso y con su empaque. No se aceptan devoluciones de productos personalizados, perecederos o de higiene personal.

3. Proceso
Para solicitar una devolucion, comunicate con nosotros a traves de la tienda indicando tu numero de orden y el motivo. Te responderemos en un plazo de 48 horas.

4. Reembolsos
Una vez aprobada la devolucion y recibido el producto, procesaremos el reembolso por el mismo metodo de pago original dentro de 5 a 10 dias laborables.',
  'Informacion sobre nuestros envios:

1. Zona de cobertura
Realizamos envios dentro de Puerto Rico. Para zonas fuera de nuestra cobertura habitual, comunicate con nosotros antes de ordenar.

2. Tiempo de procesamiento
Los pedidos se procesan en un plazo de 1 a 3 dias laborables despues de la confirmacion de pago.

3. Tiempo de entrega
El tiempo estimado de entrega es de 3 a 7 dias laborables dependiendo de tu ubicacion. Estos plazos son estimados y pueden variar.

4. Costo de envio
El costo de envio se muestra al momento del checkout. Algunos productos pueden calificar para envio gratis segun las promociones vigentes.

5. Seguimiento
Te notificaremos cuando tu pedido sea enviado. Si tu pedido no llega en el plazo estimado, contactanos para darle seguimiento.',
  'Tu privacidad es importante para nosotros. Esta politica explica como manejamos tu informacion:

1. Datos que recopilamos
Al realizar una compra recopilamos tu nombre, correo electronico, numero de telefono y direccion de entrega, unicamente para procesar y entregar tu pedido.

2. Uso de la informacion
Usamos tus datos exclusivamente para procesar pedidos, comunicarnos contigo sobre tu compra y mejorar nuestro servicio. No vendemos ni compartimos tu informacion con terceros.

3. Seguridad
Tus datos se almacenan de forma segura a traves de la plataforma MiTiendita PR. No almacenamos informacion de pago directamente.

4. Tus derechos
Puedes solicitar acceso, correccion o eliminacion de tus datos personales en cualquier momento contactandonos a traves de la tienda.',
  'Bienvenido/a a nuestra tienda en MiTiendita PR. Al realizar una compra aceptas los siguientes terminos:

1. Productos y precios
Los productos se venden tal como se describen en la publicacion. Los precios estan en dolares estadounidenses (USD) e incluyen los impuestos aplicables. Nos reservamos el derecho de actualizar precios sin previo aviso, pero los pedidos confirmados se respetan al precio original.

2. Proceso de compra
Una vez confirmado tu pedido recibiras una notificacion. El vendedor procesara tu orden dentro de un plazo razonable. Si un producto no esta disponible nos comunicaremos contigo para ofrecer alternativas o un reembolso.

3. Responsabilidad del comprador
Es tu responsabilidad verificar que la informacion de contacto y entrega sea correcta antes de confirmar la compra.

4. Comunicacion
Toda comunicacion relacionada con pedidos se realizara a traves de la plataforma o los medios de contacto publicados en esta tienda.

5. Cambios a estos terminos
Podemos actualizar estos terminos en cualquier momento. La version vigente siempre estara disponible en la tienda.'
from public.shops s
left join public.shop_policies sp on sp.shop_id = s.id
where sp.shop_id is null;

with inserted_terms as (
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
    s.id,
    'terms',
    'es-PR',
    'Terminos y condiciones',
    'Bienvenido/a a nuestra tienda en MiTiendita PR. Al realizar una compra aceptas los siguientes terminos:

1. Productos y precios
Los productos se venden tal como se describen en la publicacion. Los precios estan en dolares estadounidenses (USD) e incluyen los impuestos aplicables. Nos reservamos el derecho de actualizar precios sin previo aviso, pero los pedidos confirmados se respetan al precio original.

2. Proceso de compra
Una vez confirmado tu pedido recibiras una notificacion. El vendedor procesara tu orden dentro de un plazo razonable. Si un producto no esta disponible nos comunicaremos contigo para ofrecer alternativas o un reembolso.

3. Responsabilidad del comprador
Es tu responsabilidad verificar que la informacion de contacto y entrega sea correcta antes de confirmar la compra.

4. Comunicacion
Toda comunicacion relacionada con pedidos se realizara a traves de la plataforma o los medios de contacto publicados en esta tienda.

5. Cambios a estos terminos
Podemos actualizar estos terminos en cualquier momento. La version vigente siempre estara disponible en la tienda.',
    null,
    1,
    true,
    now(),
    s.vendor_profile_id
  from public.shops s
  where not exists (
    select 1
    from public.shop_policy_versions v
    where v.shop_id = s.id
      and v.policy_type = 'terms'
      and v.is_current = true
  )
  returning shop_id, published_by
)
insert into tmp_defaulted_required_policy_shops (shop_id, published_by)
select shop_id, published_by
from inserted_terms
on conflict (shop_id) do nothing;

with inserted_shipping as (
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
    s.id,
    'shipping',
    'es-PR',
    'Politica de envio',
    'Informacion sobre nuestros envios:

1. Zona de cobertura
Realizamos envios dentro de Puerto Rico. Para zonas fuera de nuestra cobertura habitual, comunicate con nosotros antes de ordenar.

2. Tiempo de procesamiento
Los pedidos se procesan en un plazo de 1 a 3 dias laborables despues de la confirmacion de pago.

3. Tiempo de entrega
El tiempo estimado de entrega es de 3 a 7 dias laborables dependiendo de tu ubicacion. Estos plazos son estimados y pueden variar.

4. Costo de envio
El costo de envio se muestra al momento del checkout. Algunos productos pueden calificar para envio gratis segun las promociones vigentes.

5. Seguimiento
Te notificaremos cuando tu pedido sea enviado. Si tu pedido no llega en el plazo estimado, contactanos para darle seguimiento.',
    null,
    1,
    true,
    now(),
    s.vendor_profile_id
  from public.shops s
  where not exists (
    select 1
    from public.shop_policy_versions v
    where v.shop_id = s.id
      and v.policy_type = 'shipping'
      and v.is_current = true
  )
  returning shop_id, published_by
)
insert into tmp_defaulted_required_policy_shops (shop_id, published_by)
select shop_id, published_by
from inserted_shipping
on conflict (shop_id) do nothing;

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
  s.id,
  'refund',
  'es-PR',
  'Politica de reembolso',
  'Politica de devoluciones y reembolsos:

1. Plazo para devoluciones
Aceptamos solicitudes de devolucion dentro de los primeros 7 dias despues de recibir el producto.

2. Condiciones
El producto debe estar en su condicion original, sin uso y con su empaque. No se aceptan devoluciones de productos personalizados, perecederos o de higiene personal.

3. Proceso
Para solicitar una devolucion, comunicate con nosotros a traves de la tienda indicando tu numero de orden y el motivo. Te responderemos en un plazo de 48 horas.

4. Reembolsos
Una vez aprobada la devolucion y recibido el producto, procesaremos el reembolso por el mismo metodo de pago original dentro de 5 a 10 dias laborables.',
  null,
  1,
  true,
  now(),
  s.vendor_profile_id
from public.shops s
where not exists (
  select 1
  from public.shop_policy_versions v
  where v.shop_id = s.id
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
  s.id,
  'privacy',
  'es-PR',
  'Politica de privacidad',
  'Tu privacidad es importante para nosotros. Esta politica explica como manejamos tu informacion:

1. Datos que recopilamos
Al realizar una compra recopilamos tu nombre, correo electronico, numero de telefono y direccion de entrega, unicamente para procesar y entregar tu pedido.

2. Uso de la informacion
Usamos tus datos exclusivamente para procesar pedidos, comunicarnos contigo sobre tu compra y mejorar nuestro servicio. No vendemos ni compartimos tu informacion con terceros.

3. Seguridad
Tus datos se almacenan de forma segura a traves de la plataforma MiTiendita PR. No almacenamos informacion de pago directamente.

4. Tus derechos
Puedes solicitar acceso, correccion o eliminacion de tus datos personales en cualquier momento contactandonos a traves de la tienda.',
  null,
  1,
  true,
  now(),
  s.vendor_profile_id
from public.shops s
where not exists (
  select 1
  from public.shop_policy_versions v
  where v.shop_id = s.id
    and v.policy_type = 'privacy'
    and v.is_current = true
);

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
select
  pending.shop_id,
  pending.published_by,
  'publish',
  v_terms.id,
  v_shipping.id,
  v_refund.id,
  v_privacy.id,
  'Confirmo que estas politicas son precisas, cumplen con la ley aplicable para mi negocio y acepto que soy responsable como vendedor de los productos y su cumplimiento.'
from tmp_defaulted_required_policy_shops pending
join public.shop_policy_versions v_terms
  on v_terms.shop_id = pending.shop_id
 and v_terms.policy_type = 'terms'
 and v_terms.is_current = true
join public.shop_policy_versions v_shipping
  on v_shipping.shop_id = pending.shop_id
 and v_shipping.policy_type = 'shipping'
 and v_shipping.is_current = true
left join public.shop_policy_versions v_refund
  on v_refund.shop_id = pending.shop_id
 and v_refund.policy_type = 'refund'
 and v_refund.is_current = true
left join public.shop_policy_versions v_privacy
  on v_privacy.shop_id = pending.shop_id
 and v_privacy.policy_type = 'privacy'
 and v_privacy.is_current = true
where not exists (
  select 1
  from public.vendor_policy_acceptances acceptance
  where acceptance.shop_id = pending.shop_id
    and acceptance.terms_version_id = v_terms.id
    and acceptance.shipping_version_id = v_shipping.id
);

update public.shop_policies sp
set
  terms = coalesce(v_terms.body, sp.terms),
  shipping_policy = coalesce(v_shipping.body, sp.shipping_policy),
  refund_policy = coalesce(v_refund.body, sp.refund_policy),
  privacy_policy = coalesce(v_privacy.body, sp.privacy_policy),
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
