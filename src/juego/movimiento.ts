import { estadoJuego } from './estado';
import { entradaActual } from './entrada';
import { distancia } from './utilidades';

import { CONFIGURACION } from './config';
import { sonidos } from '../audio/sonidos';
import { estadisticasJuego } from './logros';

export function actualizarMovimiento(deltaSegundos: number, anchoPantalla: number, altoPantalla: number, tiempoActual: number) {
  // 1. Mover Jugador
  let dx = 0;
  let dy = 0;

  // Priorizar el joystick si se está usando, si no usar el teclado
  if (entradaActual.joystickX !== 0 || entradaActual.joystickY !== 0) {
    dx = entradaActual.joystickX;
    dy = entradaActual.joystickY;
  } else {
    if (entradaActual.izquierda) dx -= 1;
    if (entradaActual.derecha) dx += 1;
    if (entradaActual.arriba) dy -= 1;
    if (entradaActual.abajo) dy += 1;
  }

  // Normalizar para no moverse más rápido en diagonal con el teclado
  if (dx !== 0 || dy !== 0) {
    const longitud = Math.hypot(dx, dy);
    dx /= longitud;
    dy /= longitud;
  }

  // Dash
  if (entradaActual.dash && tiempoActual > estadoJuego.jugador.ultimoDash + CONFIGURACION.JUGADOR_DASH_COOLDOWN && (dx !== 0 || dy !== 0)) {
    estadoJuego.jugador.ultimoDash = tiempoActual;
    estadoJuego.jugador.enDashHasta = tiempoActual + CONFIGURACION.JUGADOR_DASH_DURACION;
    estadoJuego.jugador.dashDirX = dx;
    estadoJuego.jugador.dashDirY = dy;
    sonidos.dash();
    estadisticasJuego.dashesRealizados++;
    // Dar invulnerabilidad por la duración del dash
    estadoJuego.jugador.invulnerableHasta = Math.max(estadoJuego.jugador.invulnerableHasta, estadoJuego.jugador.enDashHasta);
  }

  if (tiempoActual < estadoJuego.jugador.enDashHasta) {
    // Estamos en dash
    estadoJuego.jugador.x += estadoJuego.jugador.dashDirX * CONFIGURACION.JUGADOR_DASH_VELOCIDAD * deltaSegundos;
    estadoJuego.jugador.y += estadoJuego.jugador.dashDirY * CONFIGURACION.JUGADOR_DASH_VELOCIDAD * deltaSegundos;
  } else {
    // Caminar normal
    estadoJuego.jugador.x += dx * estadoJuego.jugador.velocidad * deltaSegundos;
    estadoJuego.jugador.y += dy * estadoJuego.jugador.velocidad * deltaSegundos;
  }

  // El jugador ahora se puede mover libremente, la cámara lo seguirá.

  // 2. Mover Enemigos hacia el jugador
  for (const enemigo of estadoJuego.enemigos) {
    const angulo = Math.atan2(estadoJuego.jugador.y - enemigo.y, estadoJuego.jugador.x - enemigo.x);
    enemigo.x += Math.cos(angulo) * enemigo.velocidad * deltaSegundos;
    enemigo.y += Math.sin(angulo) * enemigo.velocidad * deltaSegundos;
  }

  // 3. Mover Proyectiles
  for (const proyectil of estadoJuego.proyectiles) {
    proyectil.x += proyectil.velocidadX * deltaSegundos;
    proyectil.y += proyectil.velocidadY * deltaSegundos;
    proyectil.tiempoVida -= deltaSegundos;
  }
  
  for (const proyectil of estadoJuego.proyectilesEnemigos) {
    proyectil.x += proyectil.velocidadX * deltaSegundos;
    proyectil.y += proyectil.velocidadY * deltaSegundos;
    proyectil.tiempoVida -= deltaSegundos;
  }

  // Limpiar proyectiles viejos que ya expiraron
  estadoJuego.proyectiles = estadoJuego.proyectiles.filter(p => p.tiempoVida > 0 && p.atraviesa > 0);
  estadoJuego.proyectilesEnemigos = estadoJuego.proyectilesEnemigos.filter(p => p.tiempoVida > 0);

  // 4. Mover Gemas (Efecto imán)
  for (const gema of estadoJuego.gemas) {
    const dist = distancia(gema.x, gema.y, estadoJuego.jugador.x, estadoJuego.jugador.y);
    // Si entran en el radio, o ya estaban siendo recogidas
    if (dist < estadoJuego.jugador.radioRecogida || gema.recogiendose) {
      gema.recogiendose = true;
      const angulo = Math.atan2(estadoJuego.jugador.y - gema.y, estadoJuego.jugador.x - gema.x);
      // Las gemas vuelan súper rápido hacia el jugador
      gema.x += Math.cos(angulo) * 500 * deltaSegundos;
      gema.y += Math.sin(angulo) * 500 * deltaSegundos;
    }
  }

  // 5. Mover Textos de Daño hacia arriba
  for (const texto of estadoJuego.textosDano) {
    texto.y -= 30 * deltaSegundos; // Suben 30 píxeles por segundo
    texto.tiempoVida -= deltaSegundos;
    texto.opacidad = Math.max(0, texto.tiempoVida / 0.5); // Desvanecer suavemente
  }
  // Limpiar textos viejos
  estadoJuego.textosDano = estadoJuego.textosDano.filter(t => t.tiempoVida > 0);
}
