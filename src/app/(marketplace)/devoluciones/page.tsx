import type { Metadata } from "next";

import { LegalPage } from "@/components/marketplace/legal-page";

export const metadata: Metadata = {
  title: "Devoluciones y Reembolsos · Mitiendita PR",
  description:
    "Política base de devoluciones y reembolsos en Mitiendita PR. Cada vendedor puede tener reglas adicionales.",
};

export default function DevolucionesPage() {
  return (
    <LegalPage title="Devoluciones y Reembolsos" updatedAt="2 de mayo de 2026">
      <p>
        Mitiendita PR es un mercado de vendedores independientes. Cada vendedor
        gestiona su propio inventario, envío y servicio al cliente, por lo que
        las políticas específicas pueden variar de tienda en tienda. Esta página
        explica las reglas mínimas que aplican a todas las compras.
      </p>

      <h2>1. Política del vendedor</h2>
      <p>
        Antes de comprar, revisa la política de devoluciones publicada en la
        tienda. Si la política del vendedor entra en conflicto con esta política
        base, prevalece la más favorable al comprador.
      </p>

      <h2>2. Cuándo puedes solicitar reembolso</h2>
      <ul>
        <li>El producto no llegó en el plazo prometido por el vendedor.</li>
        <li>Llegó dañado, defectuoso o sustancialmente distinto a lo descrito.</li>
        <li>El vendedor canceló el pedido.</li>
      </ul>

      <h2>3. Cómo solicitar un reembolso</h2>
      <ol className="list-decimal pl-6">
        <li>
          Contacta primero al vendedor desde la página de tu orden. Explica el
          problema con fotos cuando aplique.
        </li>
        <li>
          Da al vendedor un plazo razonable (recomendamos 5 días hábiles) para
          responder y proponer una solución.
        </li>
        <li>
          Si no llegan a un acuerdo, escríbenos a{" "}
          <a href="mailto:hola@mitienditapr.com">hola@mitienditapr.com</a> con
          el número de orden y la conversación con el vendedor.
        </li>
      </ol>

      <h2>4. Plazos</h2>
      <p>
        Las solicitudes deben hacerse dentro de los <strong>14 días</strong>{" "}
        siguientes a la recepción del producto, salvo que la política del
        vendedor ofrezca un plazo mayor.
      </p>

      <h2>5. Cómo se procesa el reembolso</h2>
      <ul>
        <li>
          <strong>Pagos con tarjeta (Stripe):</strong> el reembolso se acredita
          al método original en 5–10 días hábiles.
        </li>
        <li>
          <strong>ATH Móvil:</strong> el vendedor envía el reembolso por la
          misma vía. Mitiendita PR puede mediar si el vendedor no responde.
        </li>
      </ul>

      <h2>6. Productos no reembolsables</h2>
      <ul>
        <li>Artículos personalizados o hechos a la medida.</li>
        <li>Productos perecederos (alimentos, flores) salvo defecto.</li>
        <li>Artículos de higiene personal abiertos.</li>
        <li>Tarjetas de regalo o productos digitales descargados.</li>
      </ul>
      <p>
        El vendedor debe indicar claramente estas exclusiones antes de la compra.
      </p>

      <h2>7. Disputas con tarjeta (chargebacks)</h2>
      <p>
        Si abres una disputa con tu banco antes de contactarnos, no podremos
        ayudarte directamente; el caso lo resolverá Stripe y tu emisor.
        Recomendamos siempre intentar primero la solución amistosa.
      </p>

      <h2>8. Suscripción de vendedor</h2>
      <p>
        La suscripción mensual de $10 USD para vendedores no es reembolsable
        una vez facturada. Puedes cancelar en cualquier momento desde tu panel
        para evitar el siguiente cobro; mantendrás acceso hasta el final del
        ciclo pagado.
      </p>

      <h2>9. Contacto</h2>
      <p>
        Para reclamos:{" "}
        <a href="mailto:hola@mitienditapr.com">hola@mitienditapr.com</a>.
      </p>
    </LegalPage>
  );
}
