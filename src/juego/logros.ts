import { sonidos } from '../audio/sonidos';
import { estadoJuego } from './estado';

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
}
