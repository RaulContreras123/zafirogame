import { estadoJuego } from './estado';
import { actualizarMovimiento } from './movimiento';
import { actualizarArma } from './arma';
import { actualizarEnemigos } from './enemigos';
import { actualizarColisiones } from './colisiones';
import { dibujarJuego } from './dibujo';
import { CONFIGURACION } from './config';
import { comprobarLogrosTracker } from './logros';

let idAnimacion = 0;
let tiempoAnterior = performance.now();
let acumulador = 0;
let tiempoInicioJuego = performance.now();
let tiempoPausadoAcumulado = 0;
let inicioPausa = 0;

// 60 cuadros por segundo siempre, sin importar la computadora
const TIEMPO_PASO_FIJO_MS = 1000 / 60; 

export function iniciarBucle(ctx: CanvasRenderingContext2D, alActualizarReact: () => void) {
  // Reset de tiempos al montar
  tiempoAnterior = performance.now();
  tiempoInicioJuego = performance.now();
  tiempoPausadoAcumulado = 0;
  inicioPausa = 0;
  acumulador = 0;
  
  function iteracion(tiempoActual: number) {
    if (estadoJuego.estado === 'fin_juego' || estadoJuego.estado === 'victoria') {
       // El juego terminó, detener todo
       alActualizarReact();
       return;
    }

    if (estadoJuego.estado === 'subiendo_nivel') {
       // Estamos pausados escogiendo carta
       if (inicioPausa === 0) inicioPausa = tiempoActual;
       tiempoAnterior = tiempoActual;
       requestAnimationFrame(iteracion);
       return;
    } else if (inicioPausa > 0) {
       // Acabamos de salir de pausa, compensar el reloj
       tiempoPausadoAcumulado += (tiempoActual - inicioPausa);
       inicioPausa = 0;
       tiempoAnterior = tiempoActual;
    }

    // Cuánto tiempo ha pasado desde el último cuadro que dibujamos
    const deltaTiempo = tiempoActual - tiempoAnterior;
    tiempoAnterior = tiempoActual;
    acumulador += deltaTiempo;

    // Reloj principal
    estadoJuego.tiempoSobrevivido = (tiempoActual - tiempoInicioJuego - tiempoPausadoAcumulado) / 1000;

    // Checar condición de victoria
    if (estadoJuego.tiempoSobrevivido >= CONFIGURACION.TIEMPO_VICTORIA_SEGUNDOS) {
        estadoJuego.estado = 'victoria';
    }

    // Lógica del juego: Se corre en pasos fijos y predecibles (Acumulador)
    while (acumulador >= TIEMPO_PASO_FIJO_MS) {
      const deltaSegundos = TIEMPO_PASO_FIJO_MS / 1000;
      
      actualizarMovimiento(deltaSegundos, ctx.canvas.width, ctx.canvas.height, tiempoActual);
      actualizarEnemigos(tiempoActual, ctx.canvas.width, ctx.canvas.height);
      actualizarArma(tiempoActual);
      actualizarColisiones(tiempoActual);
      comprobarLogrosTracker();
      
      acumulador -= TIEMPO_PASO_FIJO_MS;
    }

    // El dibujo sí ocurre cada vez que el monitor puede (desconectado de la lógica)
    dibujarJuego(ctx, estadoJuego, ctx.canvas.width, ctx.canvas.height, tiempoActual);
    
    // Le avisamos a la Interfaz Gráfica (Vidas, Tiempo) que puede actualizarse
    alActualizarReact();

    idAnimacion = requestAnimationFrame(iteracion);
  }

  idAnimacion = requestAnimationFrame(iteracion);

  // Devolver función de limpieza para que React desmonte bonito
  return () => {
    cancelAnimationFrame(idAnimacion);
  };
}
