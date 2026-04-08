import type { PolicyType } from "@/lib/policies/types";

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  terms: "Términos y condiciones",
  shipping: "Política de envío",
  refund: "Política de reembolso",
  privacy: "Política de privacidad",
};

export const POLICY_TYPE_DESCRIPTIONS: Record<PolicyType, string> = {
  terms: "Reglas generales de compra en tu tienda",
  shipping: "Tiempos y condiciones de envío",
  refund: "Condiciones para devoluciones y reembolsos",
  privacy: "Cómo manejas los datos de tus clientes",
};

export const REQUIRED_POLICY_TYPES: PolicyType[] = ["terms", "shipping"];

export const POLICY_MIN_LENGTH: Record<PolicyType, number> = {
  terms: 120,
  shipping: 80,
  refund: 60,
  privacy: 60,
};

export const POLICY_MAX_LENGTH = 12_000;

export const POLICY_LOCALE = "es-PR";

export const DEFAULT_VENDOR_POLICY_ACCEPTANCE_TEXT =
  "Confirmo que estas políticas son precisas, cumplen con la ley aplicable para mi negocio y acepto que soy responsable como vendedor de los productos y su cumplimiento.";

export const DEFAULT_POLICY_TITLES: Record<PolicyType, string> = {
  terms: "Términos y condiciones",
  shipping: "Política de envío",
  refund: "Política de reembolso",
  privacy: "Política de privacidad",
};

export const DEFAULT_POLICY_BODIES: Record<PolicyType, string> = {
  terms: `Bienvenido/a a nuestra tienda en MiTiendita PR. Al realizar una compra aceptas los siguientes términos:

1. Productos y precios
Los productos se venden tal como se describen en la publicación. Los precios están en dólares estadounidenses (USD) e incluyen los impuestos aplicables. Nos reservamos el derecho de actualizar precios sin previo aviso, pero los pedidos confirmados se respetan al precio original.

2. Proceso de compra
Una vez confirmado tu pedido recibirás una notificación. El vendedor procesará tu orden dentro de un plazo razonable. Si un producto no está disponible nos comunicaremos contigo para ofrecer alternativas o un reembolso.

3. Responsabilidad del comprador
Es tu responsabilidad verificar que la información de contacto y entrega sea correcta antes de confirmar la compra.

4. Comunicación
Toda comunicación relacionada con pedidos se realizará a través de la plataforma o los medios de contacto publicados en esta tienda.

5. Cambios a estos términos
Podemos actualizar estos términos en cualquier momento. La versión vigente siempre estará disponible en la tienda.`,

  shipping: `Información sobre nuestros envíos:

1. Zona de cobertura
Realizamos envíos dentro de Puerto Rico. Para zonas fuera de nuestra cobertura habitual, comunícate con nosotros antes de ordenar.

2. Tiempo de procesamiento
Los pedidos se procesan en un plazo de 1 a 3 días laborables después de la confirmación de pago.

3. Tiempo de entrega
El tiempo estimado de entrega es de 3 a 7 días laborables dependiendo de tu ubicación. Estos plazos son estimados y pueden variar.

4. Costo de envío
El costo de envío se muestra al momento del checkout. Algunos productos pueden calificar para envío gratis según las promociones vigentes.

5. Seguimiento
Te notificaremos cuando tu pedido sea enviado. Si tu pedido no llega en el plazo estimado, contáctanos para darle seguimiento.`,

  refund: `Política de devoluciones y reembolsos:

1. Plazo para devoluciones
Aceptamos solicitudes de devolución dentro de los primeros 7 días después de recibir el producto.

2. Condiciones
El producto debe estar en su condición original, sin uso y con su empaque. No se aceptan devoluciones de productos personalizados, perecederos o de higiene personal.

3. Proceso
Para solicitar una devolución, comunícate con nosotros a través de la tienda indicando tu número de orden y el motivo. Te responderemos en un plazo de 48 horas.

4. Reembolsos
Una vez aprobada la devolución y recibido el producto, procesaremos el reembolso por el mismo método de pago original dentro de 5 a 10 días laborables.`,

  privacy: `Tu privacidad es importante para nosotros. Esta política explica cómo manejamos tu información:

1. Datos que recopilamos
Al realizar una compra recopilamos tu nombre, correo electrónico, número de teléfono y dirección de entrega, únicamente para procesar y entregar tu pedido.

2. Uso de la información
Usamos tus datos exclusivamente para procesar pedidos, comunicarnos contigo sobre tu compra y mejorar nuestro servicio. No vendemos ni compartimos tu información con terceros.

3. Seguridad
Tus datos se almacenan de forma segura a través de la plataforma MiTiendita PR. No almacenamos información de pago directamente.

4. Tus derechos
Puedes solicitar acceso, corrección o eliminación de tus datos personales en cualquier momento contactándonos a través de la tienda.`,
};
