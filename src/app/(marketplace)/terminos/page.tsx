import type { Metadata } from "next";

import { LegalPage } from "@/components/marketplace/legal-page";

export const metadata: Metadata = {
  title: "Términos de Servicio · Mitiendita PR",
  description:
    "Términos y condiciones de uso de Mitiendita PR para vendedores y compradores en Puerto Rico.",
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos de Servicio" updatedAt="2 de mayo de 2026">
      <p>
        Bienvenido a Mitiendita PR (&ldquo;la Plataforma&rdquo;). Al usar nuestro sitio,
        aceptas estos Términos de Servicio. Si no estás de acuerdo, por favor no
        utilices la Plataforma.
      </p>

      <h2>1. Qué es Mitiendita PR</h2>
      <p>
        Mitiendita PR es un mercado en línea que conecta a vendedores locales en
        Puerto Rico con compradores. Los vendedores publican sus productos,
        gestionan sus ventas y reciben pagos a través de Stripe Connect y/o
        ATH Móvil. Mitiendita PR no es parte de la transacción entre vendedor y
        comprador; actuamos como facilitador tecnológico.
      </p>

      <h2>2. Cuentas</h2>
      <p>
        Para vender o comprar debes crear una cuenta con información veraz y
        actualizada. Eres responsable de mantener la confidencialidad de tus
        credenciales y de toda actividad que ocurra bajo tu cuenta. Debes tener
        al menos 18 años o la mayoría de edad legal en tu jurisdicción.
      </p>

      <h2>3. Vendedores</h2>
      <p>
        Los vendedores pagan una suscripción mensual de $10 USD para mantener
        su tienda activa. La suscripción se renueva automáticamente cada mes
        hasta que sea cancelada. Los vendedores son responsables de:
      </p>
      <ul>
        <li>La descripción precisa de sus productos, precios e inventario.</li>
        <li>El cumplimiento de pedidos y envíos en los plazos prometidos.</li>
        <li>El cumplimiento de las leyes aplicables, incluyendo el cobro y
          remesa del IVU (Impuesto sobre Ventas y Uso) cuando corresponda.</li>
        <li>Su propia política de devoluciones, garantía y soporte al cliente.</li>
        <li>Mantener la información de su cuenta de Stripe Connect y/o
          ATH Móvil al día.</li>
      </ul>

      <h2>4. Compradores</h2>
      <p>
        Al realizar una compra aceptas pagar el precio mostrado más impuestos
        y costos de envío aplicables. Las disputas sobre productos defectuosos,
        no entregados o no conformes deben dirigirse primero al vendedor.
        Mitiendita PR puede mediar pero no es parte del contrato de venta.
      </p>

      <h2>5. Pagos</h2>
      <p>
        Los pagos con tarjeta se procesan a través de Stripe (Stripe Connect).
        Los pagos por ATH Móvil se confirman mediante recibo subido por el
        comprador y validado por el vendedor. Mitiendita PR no almacena datos
        completos de tarjetas; toda información sensible es manejada por Stripe.
      </p>

      <h2>6. Conducta prohibida</h2>
      <ul>
        <li>Vender artículos ilegales, falsificados o restringidos.</li>
        <li>Usar la Plataforma para fraude, lavado de dinero o estafa.</li>
        <li>Publicar contenido difamatorio, ofensivo o que infrinja derechos
          de terceros.</li>
        <li>Intentar evadir comisiones o procesar pagos fuera de la Plataforma
          después de un contacto iniciado en Mitiendita PR.</li>
      </ul>
      <p>
        Podemos suspender o cerrar cuentas que incumplan estos términos.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        El contenido que publicas (fotos, descripciones, marcas) sigue siendo
        tuyo. Nos otorgas una licencia no exclusiva para mostrarlo dentro de la
        Plataforma con el propósito de operar el servicio.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        La Plataforma se ofrece &ldquo;tal cual&rdquo;. En la máxima medida permitida por
        la ley, no somos responsables por daños indirectos, lucro cesante, ni
        por las acciones u omisiones de vendedores o compradores. Nuestra
        responsabilidad total se limita al monto pagado en suscripciones durante
        los últimos 12 meses.
      </p>

      <h2>9. Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos términos en cualquier momento. Notificaremos
        cambios materiales por correo electrónico o en la Plataforma. El uso
        continuado después del cambio implica aceptación.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes del Estado Libre Asociado de
        Puerto Rico. Cualquier disputa se resolverá en los tribunales de
        Puerto Rico.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para preguntas sobre estos términos escríbenos a{" "}
        <a href="mailto:hola@mitienditapr.com">hola@mitienditapr.com</a>.
      </p>
    </LegalPage>
  );
}
