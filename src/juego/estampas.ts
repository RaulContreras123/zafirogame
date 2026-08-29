/**
 * Estampas — el álbum de Neon Survivor.
 *
 * El juego YA tenía logros, en `logros.ts`, diseñados con el juego. Esto no los
 * reemplaza: los cinco primeros de esta lista son exactamente esos, con sus
 * mismos títulos y descripciones, y `migrarLogrosViejos()` importa lo que el
 * jugador ya había desbloqueado en `localStorage`. Nadie pierde nada.
 *
 * Lo que se añade encima es la página de papel compartida con los demás juegos
 * del arcade y la sincronización con la cuenta, para que las estampas viajen
 * entre el teléfono y la computadora.
 *
 * `check` tiene que ser puro: sin reloj, sin azar. La revisión corre en cada
 * evento, y una estampa que se otorga de forma no determinista es un error que
 * sólo aparece en el álbum de otra persona.
 */

export type Evento =
  | { type: 'enemigo' }
  | { type: 'jefe' }
  | { type: 'nivel'; nivel: number }
  | { type: 'tiempo'; minutos: number }
  | { type: 'dash'; total: number }
  | { type: 'muerte'; minutos: number; nivel: number }
  | { type: 'victoria'; minutos: number }
  | { type: 'award'; owned: string[] };

export type Estampa = {
  id: string;
  name: string;
  hint: string;
  star: number;
  rare?: boolean;
  check: (e: any) => boolean;
};

/* Los ids de los cinco primeros son los de `logros.ts`, a propósito: así la
   migración es una copia directa y no una tabla de equivalencias que se puede
   desincronizar. */
export const ESTAMPAS: Estampa[] = [
  { id: 'PRIMER_JEFE', name: 'Cazador de Jefes', hint: 'Derrota a tu primer jefe.',
    star: 3, rare: true,
    check: (e) => e.type === 'jefe' },
  { id: 'MATA_100', name: 'Exterminador', hint: 'Derrota a 100 enemigos.',
    star: 2,
    check: (e) => e.type === 'enemigo' && e.total >= 100 },
  { id: 'NIVEL_10', name: 'Poder Ascendente', hint: 'Alcanza el nivel 10.',
    star: 3,
    check: (e) => e.type === 'nivel' && e.nivel >= 10 },
  { id: 'SOBREVIVE_5', name: 'Superviviente', hint: 'Sobrevive 5 minutos.',
    star: 3,
    check: (e) => e.type === 'tiempo' && e.minutos >= 5 },
  { id: 'DASH_PERFECTO', name: 'Intocable', hint: 'Realiza 50 dashes.',
    star: 2,
    check: (e) => e.type === 'dash' && e.total >= 50 },

  /* Nuevas. Deliberadamente pocas y todas sobre HACER algo — "juega 50 partidas"
     sería una tarea con dibujito, no un logro que te acuerdas de haber hecho. */
  { id: 'PRIMERA_SANGRE', name: 'Primer Golpe', hint: 'Derrota a tu primer enemigo.',
    star: 1,
    check: (e) => e.type === 'enemigo' && e.total >= 1 },
  { id: 'MATA_500', name: 'Tormenta', hint: 'Derrota a 500 enemigos.',
    star: 4,
    check: (e) => e.type === 'enemigo' && e.total >= 500 },
  { id: 'SOBREVIVE_10', name: 'Inquebrantable', hint: 'Sobrevive 10 minutos.',
    star: 5, rare: true,
    check: (e) => e.type === 'tiempo' && e.minutos >= 10 },
  { id: 'NIVEL_20', name: 'Cristal Puro', hint: 'Alcanza el nivel 20.',
    star: 5, rare: true,
    check: (e) => e.type === 'nivel' && e.nivel >= 20 },

  { id: 'ALBUM_LLENO', name: 'Álbum Completo', hint: 'Consigue todas las demás estampas.',
    star: 5,
    check: (e) => e.type === 'award' &&
      ['PRIMER_JEFE', 'MATA_100', 'NIVEL_10', 'SOBREVIVE_5', 'DASH_PERFECTO',
       'PRIMERA_SANGRE', 'MATA_500', 'SOBREVIVE_10', 'NIVEL_20']
        .every((id) => e.owned.includes(id)) },
];

/**
 * Trae lo que el jugador ya tenía desbloqueado antes de que existiera el álbum.
 *
 * Corre una sola vez, antes de hablar con la cuenta, para que lo migrado forme
 * parte de la copia local cuando se haga la mezcla — si corriera después, un
 * servidor con menos estampas podría pisar las de aquí.
 */
export function migrarLogrosViejos(): string[] {
  try {
    const crudo = localStorage.getItem('neon_survivor_logros');
    if (!crudo) return [];
    const guardado = JSON.parse(crudo) as Record<string, boolean>;
    return Object.keys(guardado).filter((id) => guardado[id]);
  } catch {
    // Un guardado viejo y roto no puede impedir que el juego arranque.
    return [];
  }
}
