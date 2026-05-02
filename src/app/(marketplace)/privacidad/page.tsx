import type { Metadata } from "next";

import { LegalPage } from "@/components/marketplace/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidad · Mitiendita PR",
  description:
    "Cómo Mitiendita PR recopila, usa y protege la información de vendedores y compradores.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de Privacidad" updatedAt="2 de mayo de 2026">
      <p>
        En Mitiendita PR respetamos tu privacidad. Esta política explica qué
        información recopilamos, cómo la usamos y cuáles son tus derechos.
      </p>

      <h2>1. Información que recopilamos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, correo electrónico,
          contraseña (cifrada), número de teléfono.
        </li>
        <li>
          <strong>Datos de vendedor:</strong> información de tu tienda, dirección,
          ZIP code, información fiscal y de Stripe Connect.
        </li>
        <li>
          <strong>Datos de compra:</strong> productos comprados, dirección de
          envío, recibos de ATH Móvil cuando aplique.
        </li>
        <li>
          <strong>Datos de pago:</strong> los datos completos de tarjeta los
          maneja Stripe; nosotros sólo guardamos identificadores y los últimos
          cuatro dígitos.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo,
          páginas visitadas, registros de errores.
        </li>
      </ul>

      <h2>2. Cómo usamos tu información</h2>
      <ul>
        <li>Operar la Plataforma y procesar transacciones.</li>
        <li>Enviar confirmaciones de pedido y notificaciones.</li>
        <li>Prevenir fraude y cumplir con la ley.</li>
        <li>Mejorar el servicio (análisis agregado, no personal).</li>
      </ul>
      <p>
        No vendemos tus datos personales a terceros.
      </p>

      <h2>3. Con quién compartimos información</h2>
      <ul>
        <li><strong>Stripe</strong> — para procesar pagos y suscripciones.</li>
        <li><strong>Supabase</strong> — almacenamiento de la base de datos.</li>
        <li><strong>Resend</strong> — envío de correos transaccionales.</li>
        <li><strong>Vercel</strong> — alojamiento de la aplicación.</li>
        <li>Autoridades cuando lo exija la ley.</li>
      </ul>
      <p>
        Cada proveedor tiene sus propias políticas de privacidad y seguridad.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Usamos cookies esenciales para mantener tu sesión iniciada y para
        funciones del carrito. No utilizamos cookies de publicidad de terceros.
      </p>

      <h2>5. Seguridad</h2>
      <p>
        Aplicamos medidas razonables para proteger tu información: cifrado en
        tránsito (HTTPS), políticas de seguridad a nivel de fila (RLS) en la
        base de datos, y verificación de firma en webhooks. Ningún sistema es
        100% seguro; te recomendamos usar contraseñas únicas.
      </p>

      <h2>6. Retención</h2>
      <p>
        Conservamos tu información mientras tu cuenta esté activa. Al cerrar
        tu cuenta eliminamos los datos personales en un plazo razonable, salvo
        cuando debamos retenerlos por obligación legal (ej. registros fiscales).
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Puedes acceder, corregir o eliminar tu información desde tu cuenta o
        escribiéndonos a{" "}
        <a href="mailto:hola@mitienditapr.com">hola@mitienditapr.com</a>.
        Responderemos en un plazo razonable.
      </p>

      <h2>8. Menores</h2>
      <p>
        La Plataforma no está dirigida a menores de 18 años. Si nos enteramos
        de que recopilamos datos de un menor sin consentimiento parental, los
        eliminaremos.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Podemos actualizar esta política. Notificaremos cambios materiales por
        correo o en la Plataforma.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Preguntas sobre privacidad:{" "}
        <a href="mailto:hola@mitienditapr.com">hola@mitienditapr.com</a>.
      </p>
    </LegalPage>
  );
}
