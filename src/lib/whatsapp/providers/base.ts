// Interfaz base para todos los proveedores de WhatsApp
export interface WhatsAppProvider {
  name: string;
  
  // Enviar mensaje de texto
  sendMessage(params: SendMessageParams): Promise<SendMessageResponse>;
  
  // Enviar mensaje con botones (si el proveedor lo soporta)
  sendMessageWithButtons?(params: SendMessageWithButtonsParams): Promise<SendMessageResponse>;
  
  // Enviar archivo
  sendFile?(params: SendFileParams): Promise<SendMessageResponse>;
  
  // Verificar si el proveedor está configurado
  isConfigured(): Promise<boolean>;
}

export interface SendMessageParams {
  phone: string;
  message: string;
}

export interface SendMessageWithButtonsParams {
  phone: string;
  message: string;
  buttons: Array<{ buttonId: string; buttonText: string }>;
}

export interface SendFileParams {
  phone: string;
  fileUrl: string;
  caption?: string;
}

export interface SendMessageResponse {
  idMessage: string;
  provider?: string;
}

// Utilidad para limpiar y formatear números de teléfono
export function cleanPhoneNumber(phone: string): string {
  // Limpiar número de teléfono (remover espacios, guiones, etc.)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Detectar si ya tiene código de país (números internacionales suelen tener 10+ dígitos)
  // Si tiene 8-9 dígitos, es un número local chileno sin código de país
  let phoneWithCountry = cleanPhone;
  
  if (cleanPhone.length <= 9) {
    // Número local chileno, agregar código 56
    phoneWithCountry = `56${cleanPhone}`;
  } else if (!cleanPhone.match(/^(1|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7|8[0-9]|9[0-9])/)) {
    // Si no empieza con un código de país válido, agregar 56
    phoneWithCountry = `56${cleanPhone}`;
  }
  
  return phoneWithCountry;
}
