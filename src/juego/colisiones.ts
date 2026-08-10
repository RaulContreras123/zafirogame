import { estadoJuego } from './estado';
import { distancia, idUnico } from './utilidades';
import { sonidos } from '../audio/sonidos';
import { estadisticasJuego } from './logros';

export function actualizarColisiones(tiempoActual: number) {
  const { jugador, enemigos, proyectiles, gemas } = estadoJuego;

  // 1. Proyectiles golpeando Monstruos
  for (const proyectil of proyectiles) {
    if (proyectil.atraviesa <= 0) continue; // Si ya golpeó lo que podía, ignorar

    for (const enemigo of enemigos) {
      if (enemigo.vida <= 0) continue;
      // No golpear dos veces al mismo monstruo con el mismo cristal
      if (proyectil.enemigosGolpeados.includes(enemigo.id)) continue; 

      if (distancia(proyectil.x, proyectil.y, enemigo.x, enemigo.y) < proyectil.radio + enemigo.radio) {
        enemigo.vida -= proyectil.dano;
        proyectil.atraviesa -= 1;
        proyectil.enemigosGolpeados.push(enemigo.id);
        sonidos.hit();

        // Crear el número flotante de daño
        estadoJuego.textosDano.push({
          id: idUnico(),
          x: enemigo.x,
          y: enemigo.y - enemigo.radio,
          texto: proyectil.dano.toString(),
          tiempoVida: 0.5,
          opacidad: 1
        });
      }
    }
  }

  // 2. Monstruos tocando al Jugador
  if (tiempoActual > jugador.invulnerableHasta) {
    for (const enemigo of enemigos) {
      if (enemigo.vida <= 0) continue;

      if (distancia(jugador.x, jugador.y, enemigo.x, enemigo.y) < jugador.radio + enemigo.radio) {
        jugador.vida -= enemigo.dano;
        jugador.invulnerableHasta = tiempoActual + 1000; // 1 segundo completo de invulnerabilidad
        sonidos.hit();
        
        if (jugador.vida <= 0) {
          estadoJuego.estado = 'fin_juego';
          sonidos.gameOver();
        }
        break; // Solo recibe daño de un monstruo a la vez para ser justos
      }
    }
  }

  // 2.5. Proyectiles Enemigos golpeando al Jugador
  if (tiempoActual > jugador.invulnerableHasta) {
    for (const proyectil of estadoJuego.proyectilesEnemigos) {
      if (proyectil.tiempoVida <= 0) continue;
      
      if (distancia(jugador.x, jugador.y, proyectil.x, proyectil.y) < jugador.radio + proyectil.radio) {
        jugador.vida -= proyectil.dano;
        proyectil.tiempoVida = 0; // Se destruye al impactar
        jugador.invulnerableHasta = tiempoActual + 1000;
        sonidos.hit();
        
        if (jugador.vida <= 0) {
          estadoJuego.estado = 'fin_juego';
          sonidos.gameOver();
        }
        break;
      }
    }
  }

  // 3. Jugador recogiendo Gemas
  for (const gema of gemas) {
    if (gema.valor > 0 && distancia(jugador.x, jugador.y, gema.x, gema.y) < jugador.radio + gema.radio) {
      gema.valor = 0; // Marcar como recogida para borrarla
      estadoJuego.experiencia += 1;
      sonidos.recogerGema();
      
      if (estadoJuego.experiencia >= estadoJuego.experienciaNecesaria) {
        estadoJuego.estado = 'subiendo_nivel';
        sonidos.subirNivel();
      }
    }
  }

  // 4. Limpieza del final del cuadro
  
  // Guardar enemigos vivos y convertir a los muertos en gemas
  const enemigosVivos = [];
  for (const enemigo of enemigos) {
    if (enemigo.vida > 0) {
      enemigosVivos.push(enemigo);
    } else {
      // Enemigo muere: Suelta una gema justo donde cayó
      estadisticasJuego.enemigosDerrotados++;
      if (enemigo.esJefe) {
        estadoJuego.jefesVencidos++;
        // Jefe suelta una explosión de gemas
        for (let i = 0; i < 20; i++) {
          estadoJuego.gemas.push({
            id: idUnico(),
            x: enemigo.x + (Math.random() - 0.5) * 60,
            y: enemigo.y + (Math.random() - 0.5) * 60,
            radio: 5,
            valor: 1,
            recogiendose: false
          });
        }
      } else {
        estadoJuego.gemas.push({
          id: idUnico(),
          x: enemigo.x,
          y: enemigo.y,
          radio: 5,
          valor: 1,
          recogiendose: false
        });
      }
    }
  }
  estadoJuego.enemigos = enemigosVivos;

  // Filtrar gemas recogidas
  estadoJuego.gemas = gemas.filter(g => g.valor > 0);
}
