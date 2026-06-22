// Sistema de detección de intención por scoring para respuestas de WhatsApp
// Reemplaza los regex con prioridad fija por un sistema más robusto

export type Intencion = 'CONFIRMAR' | 'CANCELAR' | 'REAGENDAR' | 'NO_RECONOCIDO';

interface ResultadoIntencion {
  intencion: Intencion;
  confianza: number; // 0-1
  scoreConfirmar: number;
  scoreCancelar: number;
  scoreReagendar: number;
  palabrasDetectadas: string[];
}

// Pesos: fuerte=3, medio=2, débil=1
const PALABRAS_CONFIRMAR = {
  fuertes: ['confirmar', 'confirmo', 'confirmado', 'confirme', '1', 'uno'],
  medias: [
    'si', 'sí', 'asistire', 'asistiré', 'voy', 'ire', 'iré',
    'acepto', 'afirmativo', 'presente', 'cuenta conmigo',
    'ahí estaré', 'ahi estare', 'ahí estare', 'ahi estaré',
    'ahí voy', 'ahi voy', 'nos vemos',
  ],
  debiles: [
    'ok', 'okay', 'vale', 'perfecto', 'listo', 'claro', 'seguro',
    'por supuesto', 'de acuerdo', 'ya', 'dale', 'genial', 'excelente',
    'obvio', 'bien', 'bueno', 'va', 'toy',
    // Chilenismos
    'sipo', 'yapo', 'dale', 'wena', 'bkn', 'piola', 'joya',
    'de una', 'oka', 'okas', 'sisi', 'sip', 'sep', 'seep',
    'yap', 'yaa', 'sii', 'sipi', 'simon', 'sale', 'okey',
    'estoy', 'llego', 'ahi llego', 'ahí llego',
  ],
};

const PALABRAS_CANCELAR = {
  fuertes: ['cancelar', 'cancelo', 'cancelado', 'cancele', '2', 'dos'],
  medias: [
    'no puedo', 'no podre', 'no podré', 'no voy', 'no ire', 'no iré',
    'no asistire', 'no asistiré', 'imposible', 'me surge algo',
    'tengo un problema', 'tengo inconveniente', 'no alcanzo',
    'me complica', 'no me es posible',
  ],
  debiles: [
    'disculpa', 'disculpe', 'perdón', 'perdon', 'lo siento',
    // Chilenismos
    'nel', 'nop', 'nope', 'nica', 'ni cagando', 'nanai',
    'no puedo ir', 'no llego', 'no alcanzó',
  ],
};

const PALABRAS_REAGENDAR = {
  fuertes: ['reagendar', 'reagendo', 'reagendado', 'reagende', 'reprogramar', '3', 'tres'],
  medias: [
    'cambiar', 'cambio', 'mover', 'otro dia', 'otro día',
    'otra fecha', 'otra hora', 'diferente',
    'quiero cambiar', 'necesito cambiar', 'podemos cambiar',
    'se puede cambiar', 'puedo mover', 'cambiar la hora',
    'cambiar el dia', 'cambiar el día', 'cambiar fecha',
  ],
  debiles: [
    'hay otra hora', 'puedo otro día', 'puedo otro dia',
    'se puede mover', 'me sirve otro', 'otro horario',
  ],
};

// Emojis que indican intención
const EMOJIS_CONFIRMAR = ['👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿', '✅', '✔', '✔️', '🙌', '💪', '👌', '🤙'];
const EMOJIS_CANCELAR = ['👎', '👎🏻', '👎🏼', '👎🏽', '👎🏾', '👎🏿', '❌', '✖', '🚫', '😔', '😢'];

// Negaciones que invierten la intención
const NEGACIONES = ['no', 'ni', 'nunca', 'tampoco', 'nada'];

function calcularScore(
  mensaje: string,
  palabras: { fuertes: string[]; medias: string[]; debiles: string[] }
): { score: number; detectadas: string[] } {
  let score = 0;
  const detectadas: string[] = [];
  const msgLower = mensaje.toLowerCase();

  for (const palabra of palabras.fuertes) {
    if (palabra.length <= 2) {
      // Para "1", "2", "3", "si" etc: match exacto o con espacios
      const regex = new RegExp(`(^|\\s)${escapeRegex(palabra)}($|\\s|[.,!?])`, 'i');
      if (regex.test(msgLower)) {
        score += 3;
        detectadas.push(palabra);
      }
    } else if (msgLower.includes(palabra)) {
      score += 3;
      detectadas.push(palabra);
    }
  }

  for (const palabra of palabras.medias) {
    if (msgLower.includes(palabra)) {
      score += 2;
      detectadas.push(palabra);
    }
  }

  for (const palabra of palabras.debiles) {
    if (palabra.length <= 3) {
      const regex = new RegExp(`(^|\\s)${escapeRegex(palabra)}($|\\s|[.,!?])`, 'i');
      if (regex.test(msgLower)) {
        score += 1;
        detectadas.push(palabra);
      }
    } else if (msgLower.includes(palabra)) {
      score += 1;
      detectadas.push(palabra);
    }
  }

  return { score, detectadas };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectarNegacion(mensaje: string, palabraDetectada: string): boolean {
  const msgLower = mensaje.toLowerCase();
  const idx = msgLower.indexOf(palabraDetectada);
  if (idx === -1) return false;

  // Buscar negación en las 20 caracteres antes de la palabra
  const contextoAntes = msgLower.substring(Math.max(0, idx - 20), idx);
  return NEGACIONES.some(neg => contextoAntes.includes(neg));
}

export function detectarIntencion(mensaje: string): ResultadoIntencion {
  const mensajeLimpio = mensaje
    .replace(/[^\w\sáéíóúñü👍👎✅❌✔🚫😔😢🙌💪👌🤙]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Calcular scores base
  let { score: scoreConfirmar, detectadas: detConfirmar } = calcularScore(mensajeLimpio, PALABRAS_CONFIRMAR);
  let { score: scoreCancelar, detectadas: detCancelar } = calcularScore(mensajeLimpio, PALABRAS_CANCELAR);
  let { score: scoreReagendar, detectadas: detReagendar } = calcularScore(mensajeLimpio, PALABRAS_REAGENDAR);

  // Bonus por emojis
  for (const emoji of EMOJIS_CONFIRMAR) {
    if (mensaje.includes(emoji)) {
      scoreConfirmar += 2;
      detConfirmar.push(emoji);
    }
  }
  for (const emoji of EMOJIS_CANCELAR) {
    if (mensaje.includes(emoji)) {
      scoreCancelar += 2;
      detCancelar.push(emoji);
    }
  }

  // Penalizar por negación contextual
  // Ej: "no puedo confirmar" → reducir score de confirmar
  for (const palabra of detConfirmar) {
    if (detectarNegacion(mensajeLimpio, palabra)) {
      scoreConfirmar -= 3;
      scoreCancelar += 1; // "no + positivo" sugiere cancelar
    }
  }

  // "no quiero cancelar" → reducir score de cancelar
  for (const palabra of detCancelar) {
    if (palabra.startsWith('no ')) continue; // ya es negativa
    if (detectarNegacion(mensajeLimpio, palabra)) {
      scoreCancelar -= 3;
    }
  }

  // Caso especial: "no" solo como respuesta completa → cancelar
  if (/^no[.]?$/i.test(mensajeLimpio)) {
    scoreCancelar += 3;
  }

  // Caso especial: respuesta es solo un emoji
  const soloEmoji = mensaje.trim();
  if (EMOJIS_CONFIRMAR.includes(soloEmoji)) {
    scoreConfirmar += 3;
  }
  if (EMOJIS_CANCELAR.includes(soloEmoji)) {
    scoreCancelar += 3;
  }

  // Determinar intención ganadora
  const maxScore = Math.max(scoreConfirmar, scoreCancelar, scoreReagendar);
  const todasDetectadas = [...detConfirmar, ...detCancelar, ...detReagendar];

  if (maxScore <= 0) {
    return {
      intencion: 'NO_RECONOCIDO',
      confianza: 0,
      scoreConfirmar,
      scoreCancelar,
      scoreReagendar,
      palabrasDetectadas: todasDetectadas,
    };
  }

  // Verificar empate entre cancelar y reagendar (reagendar tiene prioridad sobre cancelar)
  let intencion: Intencion;
  if (scoreReagendar >= scoreCancelar && scoreReagendar >= scoreConfirmar && scoreReagendar > 0) {
    intencion = 'REAGENDAR';
  } else if (scoreConfirmar >= scoreCancelar && scoreConfirmar > 0) {
    intencion = 'CONFIRMAR';
  } else if (scoreCancelar > 0) {
    intencion = 'CANCELAR';
  } else {
    intencion = 'NO_RECONOCIDO';
  }

  // Calcular confianza (0-1): diferencia entre top score y segundo score
  const scores = [scoreConfirmar, scoreCancelar, scoreReagendar].sort((a, b) => b - a);
  const diferencia = scores[0] - scores[1];
  const confianza = Math.min(1, (maxScore * 0.3) + (diferencia * 0.2));

  return {
    intencion,
    confianza,
    scoreConfirmar,
    scoreCancelar,
    scoreReagendar,
    palabrasDetectadas: todasDetectadas,
  };
}
