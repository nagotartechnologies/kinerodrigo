import type { Config } from "@netlify/functions";

// FUNCIÓN DESACTIVADA: El webhook /api/webhook/whatsapp ahora procesa las respuestas
// de Ultramsg automáticamente en tiempo real. Esta función era necesaria solo para
// Green API que requiere polling, pero Ultramsg envía las respuestas directamente al webhook.
export default async (req: Request) => {
  return new Response(JSON.stringify({ 
    success: true,
    message: 'Función desactivada - El webhook procesa respuestas automáticamente',
    info: 'Las respuestas de Ultramsg se procesan en tiempo real vía webhook'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Desactivar el schedule comentándolo
// export const config: Config = {
//   schedule: "*/1 * * * *", // Desactivado - no es necesario con Ultramsg
// };
