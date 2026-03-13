export default function Privacidad() {
  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", padding: "48px 24px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "28px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
          Política de Privacidad
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "40px" }}>
          Última actualización: marzo 2025
        </p>

        {[
          {
            titulo: "1. Información que recopilamos",
            contenido: `Coincidimos recopila la siguiente información cuando creás una cuenta:
• Nombre y nombre de usuario elegido por vos
• Dirección de email
• Disponibilidad horaria que cargás voluntariamente
• Información de grupos y juntadas en los que participás`
          },
          {
            titulo: "2. Cómo usamos tu información",
            contenido: `Usamos tu información exclusivamente para:
• Permitirte coordinar juntadas con tus contactos
• Mostrarte la disponibilidad compartida con tu grupo
• Enviarte notificaciones relacionadas a tus grupos (cuando estén habilitadas)

No vendemos, compartimos ni cedemos tu información personal a terceros.`
          },
          {
            titulo: "3. Almacenamiento de datos",
            contenido: `Tus datos se almacenan en servidores seguros provistos por Supabase (supabase.com), ubicados en la Unión Europea. Supabase cumple con estándares de seguridad SOC 2 Type 2.`
          },
          {
            titulo: "4. Datos de terceros",
            contenido: `Coincidimos utiliza los siguientes servicios de terceros:
• Supabase — base de datos y autenticación
• Vercel — hosting de la aplicación web
• Google Play — distribución de la app en Android

Cada uno de estos servicios tiene su propia política de privacidad.`
          },
          {
            titulo: "5. Tus derechos",
            contenido: `Tenés derecho a:
• Acceder a tus datos personales
• Corregir información incorrecta
• Solicitar la eliminación de tu cuenta y todos tus datos
• Exportar tu información

Para ejercer cualquiera de estos derechos, contactanos en el email que figura al final de esta página.`
          },
          {
            titulo: "6. Eliminación de cuenta",
            contenido: `Podés solicitar la eliminación completa de tu cuenta y todos tus datos asociados en cualquier momento escribiéndonos a nuestro email de contacto. Procesamos estas solicitudes en un plazo máximo de 7 días hábiles.`
          },
          {
            titulo: "7. Menores de edad",
            contenido: `Coincidimos no está dirigida a menores de 13 años. Si tenés conocimiento de que un menor nos proporcionó información personal, contactanos para eliminarla.`
          },
          {
            titulo: "8. Cambios a esta política",
            contenido: `Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos a través de la app. El uso continuado de Coincidimos después de los cambios implica aceptación de la nueva política.`
          },
          {
            titulo: "9. Contacto",
            contenido: `Si tenés preguntas sobre esta política de privacidad, podés contactarnos en:\n\ncoincidimosapp@gmail.com`
          },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom: "32px" }}>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>
              {s.titulo}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
              {s.contenido}
            </p>
          </div>
        ))}

        <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
            © 2025 Coincidimos · coincidimosapp@gmail.com
          </p>
        </div>
      </div>
    </main>
  );
}
