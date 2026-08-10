import { EstadoJuego } from './tipos';
import { CONFIGURACION } from './config';

export function crearEstadoInicial(): EstadoJuego {
  return {
    jugador: {
      id: 'jugador',
      x: window.innerWidth / 2, // Se centrará bien al montar el canvas
      y: window.innerHeight / 2,
      radio: CONFIGURACION.JUGADOR_RADIO,
      vida: CONFIGURACION.JUGADOR_VIDA_INICIAL,
      vidaMaxima: CONFIGURACION.JUGADOR_VIDA_INICIAL,
      velocidad: CONFIGURACION.JUGADOR_VELOCIDAD_INICIAL,
      radioRecogida: CONFIGURACION.JUGADOR_RADIO_RECOGIDA_INICIAL,
      invulnerableHasta: 0,
      ultimoDash: 0,
      enDashHasta: 0,
      dashDirX: 0,
      dashDirY: 0,
    },
    arma: {
      dano: CONFIGURACION.ARMA_DANO_INICIAL,
      velocidadDisparo: CONFIGURACION.ARMA_DISPAROS_POR_SEGUNDO_INICIAL,
      cantidadProyectiles: CONFIGURACION.ARMA_CANTIDAD_PROYECTILES_INICIAL,
      velocidadProyectil: CONFIGURACION.ARMA_VELOCIDAD_PROYECTIL,
      atraviesa: 1, // Cuántos monstruos atraviesa antes de romperse
    },
    enemigos: [],
    proyectiles: [],
    proyectilesEnemigos: [],
    gemas: [],
    textosDano: [],
    experiencia: 0,
    experienciaNecesaria: CONFIGURACION.XP_INICIAL_NECESARIA,
    nivel: 1,
    tiempoSobrevivido: 0,
    dificultad: 1,
    estado: 'jugando',
    ultimaActualizacionDisparo: 0,
    ultimaActualizacionEnemigo: 0,
    ultimoNivelJefe: 0,
    jefesVencidos: 0,
  };
}

// El estado global del juego. Se muta directamente para mayor rendimiento y simplicidad.
export let estadoJuego = crearEstadoInicial();

export function reiniciarEstado() {
  estadoJuego = crearEstadoInicial();
}
