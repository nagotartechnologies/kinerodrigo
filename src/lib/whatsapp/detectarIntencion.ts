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

// Negaciones que invierten la intención (se comparan como palabras completas)
const NEGACIONES = ['no', 'ni', 'nunca', 'tampoco'];
// Cantidad de palabras previas donde se busca una negación
const VENTANA_NEGACION = 3;

/**
 * Minúsculas, sin tildes y sin puntuación. Los emojis se descartan aquí
 * porque se evalúan aparte sobre el mensaje original.
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizar(texto: string): string[] {
  const normalizado = normalizar(texto);
  return normalizado ? normalizado.split(' ') : [];
}

/** Posición donde empieza el término (una o varias palabras) dentro de los tokens, o -1 */
function buscarTermino(tokens: string[], termino: string[]): number {
  for (let i = 0; i + termino.length <= tokens.length; i++) {
    if (termino.every((palabra, j) => tokens[i + j] === palabra)) return i;
  }
  return -1;
}

interface Detectada {
  termino: string;
  posicion: number;
}

function calcularScore(
  tokens: string[],
  palabras: { fuertes: string[]; medias: string[]; debiles: string[] }
): { score: number; detectadas: Detectada[] } {
  let score = 0;
  const detectadas: Detectada[] = [];
  // Evita contar dos veces variantes que quedan iguales al normalizar ("si"/"sí")
  const vistos = new Set<string>();
  const niveles: Array<[string[], number]> = [[palabras.fuertes, 3], [palabras.medias, 2], [palabras.debiles, 1]];

  for (const [lista, peso] of niveles) {
    for (const palabra of lista) {
      const termino = normalizar(palabra);
      if (!termino || vistos.has(termino)) continue;
      vistos.add(termino);
      const posicion = buscarTermino(tokens, termino.split(' '));
      if (posicion !== -1) {
        score += peso;
        detectadas.push({ termino, posicion });
      }
    }
  }

  return { score, detectadas };
}

function detectarNegacion(tokens: string[], { termino, posicion }: Detectada): boolean {
  if (NEGACIONES.includes(termino.split(' ')[0])) return false; // el término ya es negativo
  const previas = tokens.slice(Math.max(0, posicion - VENTANA_NEGACION), posicion);
  return previas.some(t => NEGACIONES.includes(t));
}

export function detectarIntencion(mensaje: string): ResultadoIntencion {
  const tokens = tokenizar(mensaje);
  const mensajeLimpio = tokens.join(' ');

  // Calcular scores base
  const confirmar = calcularScore(tokens, PALABRAS_CONFIRMAR);
  const cancelar = calcularScore(tokens, PALABRAS_CANCELAR);
  const reagendar = calcularScore(tokens, PALABRAS_REAGENDAR);
  let scoreConfirmar = confirmar.score;
  let scoreCancelar = cancelar.score;
  const scoreReagendar = reagendar.score;
  const detConfirmar = confirmar.detectadas.map(d => d.termino);
  const detCancelar = cancelar.detectadas.map(d => d.termino);
  const detReagendar = reagendar.detectadas.map(d => d.termino);

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
  for (const detectada of confirmar.detectadas) {
    if (detectarNegacion(tokens, detectada)) {
      scoreConfirmar -= 3;
      scoreCancelar += 1; // "no + positivo" sugiere cancelar
    }
  }

  // "no quiero cancelar" → reducir score de cancelar
  for (const detectada of cancelar.detectadas) {
    if (detectarNegacion(tokens, detectada)) {
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
