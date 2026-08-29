import { sonidos } from '../audio/sonidos';
import { estadoJuego } from './estado';
// @ts-ignore  — el kit es JS compartido y vendorizado; allowJs lo permite.
import { mountLogbook, ES } from '../../vendor/arcade-kit/logbook.js';
import { ESTAMPAS, migrarLogrosViejos } from './estampas';

/* El álbum de estampas, compartido con los demás juegos del arcade.
 *
 * NO reemplaza a los logros de aquí arriba: los cinco originales siguen siendo
 * los mismos, con sus ids, y `migrarLogrosViejos` importa lo que el jugador ya
 * tenía desbloqueado. Lo que añade es la página de papel y la cuenta, para que
 * las estampas viajen entre dispositivos.
 *
 * La API vive en raulcontrerasherrera.com y este juego se sirve desde
 * gatoarcade.com, así que la llamada es entre dominios — funciona porque la
 * cuenta compartida ahora permite este origen explícitamente. */
export const album = mountLogbook({
  game: 'monstruos',
  title: 'ÁLBUM',
  stickers: ESTAMPAS,
  strings: ES,
  api: 'https://raulcontrerasherrera.com/api',
  migrate: migrarLogrosViejos,
  /* SIN inicio de sesión, a propósito.
     gatoarcade.com es un arcade para niños — los juegos los hicieron ellos en
     el taller. Ofrecer un login de Google aquí significa pedirle a un menor su
     identificador, su correo y su nombre, que es exactamente lo que COPPA y el
     RGPD-K existen para evitar, y ningún texto legal convierte eso en una
     buena idea por defecto. Las estampas funcionan igual: se guardan en el
     dispositivo. Lo único que se pierde es llevarlas a otro aparato, y a
     cambio no se recoge absolutamente nada. */
  allowSignIn: false,
});

export type Logro = {
  id: string;
  titulo: string;
  descripcion: string;
  desbloqueado: boolean;
};

export const logrosDisponibles: Record<string, Logro> = {
  PRIMER_JEFE: { id: 'PRIMER_JEFE', titulo: 'Cazador de Jefes', descripcion: 'Derrota a tu primer jefe', desbloqueado: false },
  MATA_100: { id: 'MATA_100', titulo: 'Exterminador', descripcion: 'Derrota a 100 enemigos', desbloqueado: false },
  NIVEL_10: { id: 'NIVEL_10', titulo: 'Poder Ascendente', descripcion: 'Alcanza el nivel 10', desbloqueado: false },
  SOBREVIVE_5: { id: 'SOBREVIVE_5', titulo: 'Superviviente', descripcion: 'Sobrevive 5 minutos', desbloqueado: false },
  DASH_PERFECTO: { id: 'DASH_PERFECTO', titulo: 'Intocable', descripcion: 'Realiza 50 dashes', desbloqueado: false },
};

export const estadisticasJuego = {
  enemigosDerrotados: 0,
  dashesRealizados: 0,
};

let logrosRecientes: Logro[] = [];

export function inicializarLogros() {
  const guardados = localStorage.getItem('neon_survivor_logros');
  if (guardados) {
    try {
      const parsed = JSON.parse(guardados);
      for (const id in parsed) {
        if (logrosDisponibles[id] && parsed[id]) {
          logrosDisponibles[id].desbloqueado = true;
        }
      }
    } catch (e) {
      console.error('Error al cargar logros');
    }
  }
}

export function guardarLogros() {
  const paraGuardar: Record<string, boolean> = {};
  for (const id in logrosDisponibles) {
    paraGuardar[id] = logrosDisponibles[id].desbloqueado;
  }
  localStorage.setItem('neon_survivor_logros', JSON.stringify(paraGuardar));
}

export function reiniciarEstadisticas() {
  estadisticasJuego.enemigosDerrotados = 0;
  estadisticasJuego.dashesRealizados = 0;
}

export function desbloquearLogro(id: string) {
  const logro = logrosDisponibles[id];
  if (logro && !logro.desbloqueado) {
    logro.desbloqueado = true;
    guardarLogros();
    
    // Evitar duplicados en la cola visual
    if (!logrosRecientes.find(l => l.id === id)) {
      logrosRecientes.push(logro);
      sonidos.subirNivel(); // TODO: Podría ser un sonido especial de logro
      
      setTimeout(() => {
        logrosRecientes = logrosRecientes.filter(l => l.id !== id);
      }, 4000);
    }
  }
}

export function obtenerLogrosRecientes() {
  return [...logrosRecientes];
}

export function comprobarLogrosTracker() {
  if (estadisticasJuego.enemigosDerrotados >= 100) desbloquearLogro('MATA_100');
  if (estadoJuego.nivel >= 10) desbloquearLogro('NIVEL_10');
  if (estadisticasJuego.dashesRealizados >= 50) desbloquearLogro('DASH_PERFECTO');
  if (estadoJuego.jefesVencidos >= 1) desbloquearLogro('PRIMER_JEFE');
  if (estadoJuego.tiempoSobrevivido >= 300) desbloquearLogro('SOBREVIVE_5'); // 300 segundos = 5 min

  /* El álbum se entera desde el mismo sitio que los logros, con los números en
     crudo. Así una estampa nunca puede contradecir lo que el juego acaba de
     decirle al jugador, y las estampas nuevas (500 enemigos, 10 minutos,
     nivel 20) no necesitan otro sitio donde contar lo mismo otra vez. */
  album.report({ type: 'enemigo', total: estadisticasJuego.enemigosDerrotados });
  album.report({ type: 'dash', total: estadisticasJuego.dashesRealizados });
  album.report({ type: 'nivel', nivel: estadoJuego.nivel });
  album.report({ type: 'tiempo', minutos: estadoJuego.tiempoSobrevivido / 60 });
  if (estadoJuego.jefesVencidos >= 1) album.report({ type: 'jefe' });
}
