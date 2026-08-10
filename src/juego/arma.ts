import { estadoJuego } from './estado';
import { distancia, idUnico } from './utilidades';
import { CONFIGURACION } from './config';
import { sonidos } from '../audio/sonidos';

export function actualizarArma(tiempoActual: number) {
  const { arma, jugador, enemigos } = estadoJuego;

  if (enemigos.length === 0) return; // No dispara si no hay a quién dispararle

  const msEntreDisparos = 1000 / arma.velocidadDisparo;
  
  if (tiempoActual - estadoJuego.ultimaActualizacionDisparo >= msEntreDisparos) {
    // 1. Buscar el enemigo más cercano
    let enemigoMasCercano = enemigos[0];
    let distMinima = distancia(jugador.x, jugador.y, enemigoMasCercano.x, enemigoMasCercano.y);

    for (let i = 1; i < enemigos.length; i++) {
      const dist = distancia(jugador.x, jugador.y, enemigos[i].x, enemigos[i].y);
      if (dist < distMinima) {
        distMinima = dist;
        enemigoMasCercano = enemigos[i];
      }
    }

    // 2. Calcular la dirección hacia ese enemigo
    const anguloPrincipal = Math.atan2(enemigoMasCercano.y - jugador.y, enemigoMasCercano.x - jugador.x);

    // 3. Disparar los proyectiles necesarios
    for (let i = 0; i < arma.cantidadProyectiles; i++) {
      // Si hay varios proyectiles, abrimos un poco el abanico (spread)
      let angulo = anguloPrincipal;
      if (arma.cantidadProyectiles > 1) {
        const separacionRadianes = 0.2;
        const inicioOffset = -((arma.cantidadProyectiles - 1) * separacionRadianes) / 2;
        angulo += inicioOffset + (i * separacionRadianes);
      }

      estadoJuego.proyectiles.push({
        id: idUnico(),
        x: jugador.x,
        y: jugador.y,
        radio: CONFIGURACION.ARMA_RADIO_PROYECTIL,
        velocidadX: Math.cos(angulo) * arma.velocidadProyectil,
        velocidadY: Math.sin(angulo) * arma.velocidadProyectil,
        dano: arma.dano,
        tiempoVida: 3, // Segundos máximos antes de desaparecer volando a la nada
        atraviesa: arma.atraviesa,
        enemigosGolpeados: []
      });
    }

    sonidos.disparo();
    estadoJuego.ultimaActualizacionDisparo = tiempoActual;
  }
}
