import { estadoJuego } from './estado';
import { idUnico } from './utilidades';
import { CONFIGURACION } from './config';

export function actualizarEnemigos(tiempoActual: number, anchoPantalla: number, altoPantalla: number) {
  // Aumentar la dificultad de forma sencilla: sube 1 cada X segundos que sobrevives
  estadoJuego.dificultad = 1 + Math.floor(estadoJuego.tiempoSobrevivido / CONFIGURACION.ENEMIGO_ESCALA_DIFICULTAD);

  // 1. Lógica de Jefes (Cada 5 niveles)
  if (estadoJuego.nivel % 5 === 0 && estadoJuego.ultimoNivelJefe !== estadoJuego.nivel) {
    estadoJuego.ultimoNivelJefe = estadoJuego.nivel;
    estadoJuego.enemigos.push({
      id: idUnico(),
      x: estadoJuego.jugador.x + anchoPantalla / 2 + 100, // Aparece desde la derecha, fuera de pantalla
      y: estadoJuego.jugador.y,
      radio: CONFIGURACION.JEFE_RADIO,
      vida: CONFIGURACION.JEFE_VIDA_BASE * (1 + estadoJuego.jefesVencidos * 0.5) + (estadoJuego.dificultad * 10),
      vidaMaxima: CONFIGURACION.JEFE_VIDA_BASE * (1 + estadoJuego.jefesVencidos * 0.5) + (estadoJuego.dificultad * 10),
      velocidad: Math.min(CONFIGURACION.JEFE_VELOCIDAD + (estadoJuego.dificultad * 2), estadoJuego.jugador.velocidad - 30),
      dano: 2 + estadoJuego.jefesVencidos, // Hace más daño cada vez
      esJefe: true,
      ultimoAtaque: tiempoActual,
    });
  }

  // 2. Lógica de los poderes del Jefe y Enemigos disparando
  for (const enemigo of estadoJuego.enemigos) {
    if (enemigo.esJefe && enemigo.ultimoAtaque) {
      if (tiempoActual - enemigo.ultimoAtaque >= CONFIGURACION.JEFE_TIEMPO_ENTRE_PODERES) {
        enemigo.ultimoAtaque = tiempoActual;
        // Poder del jefe: Dispara bolas de fuego en espiral/círculo o invoca 1 gusano
        const tipoAtaque = Math.random() > 0.3 ? 'bolas_fuego' : 'gusanos';
        
        if (tipoAtaque === 'gusanos') {
          // Invoca 1 gusano pequeño
          const angulo = Math.random() * Math.PI * 2;
          const distancia = enemigo.radio + 20;
          estadoJuego.enemigos.push({
            id: idUnico(),
            x: enemigo.x + Math.cos(angulo) * distancia,
            y: enemigo.y + Math.sin(angulo) * distancia,
            radio: CONFIGURACION.ENEMIGO_RADIO,
            vida: CONFIGURACION.ENEMIGO_VIDA_BASE + estadoJuego.dificultad,
            vidaMaxima: CONFIGURACION.ENEMIGO_VIDA_BASE + estadoJuego.dificultad,
            velocidad: CONFIGURACION.ENEMIGO_VELOCIDAD_BASE + (estadoJuego.dificultad * 5),
            dano: 1,
          });
        } else {
          // Dispara bolas de fuego en círculo (patrón espectacular)
          const numBolas = 8 + (estadoJuego.jefesVencidos * 2);
          const desface = (tiempoActual / 500) % (Math.PI * 2); // Rotación dinámica del patrón
          for (let i = 0; i < numBolas; i++) {
             const angulo = (i / numBolas) * Math.PI * 2 + desface;
             estadoJuego.proyectilesEnemigos.push({
               id: idUnico(),
               x: enemigo.x,
               y: enemigo.y,
               radio: 8, // Más grandes que las normales
               velocidadX: Math.cos(angulo) * 150,
               velocidadY: Math.sin(angulo) * 150,
               dano: 1,
               tiempoVida: 4,
               atraviesa: 1,
               enemigosGolpeados: []
             });
          }
        }
      }
    } else if (estadoJuego.nivel >= 10 && !enemigo.esJefe) {
      // Los enemigos normales disparan a partir del nivel 10
      if (!enemigo.ultimoAtaque) enemigo.ultimoAtaque = tiempoActual + Math.random() * 3000;
      if (tiempoActual - enemigo.ultimoAtaque >= 3000) {
        enemigo.ultimoAtaque = tiempoActual;
        const angulo = Math.atan2(estadoJuego.jugador.y - enemigo.y, estadoJuego.jugador.x - enemigo.x);
        estadoJuego.proyectilesEnemigos.push({
          id: idUnico(),
          x: enemigo.x,
          y: enemigo.y,
          radio: 5,
          velocidadX: Math.cos(angulo) * 150,
          velocidadY: Math.sin(angulo) * 150,
          dano: 1,
          tiempoVida: 3,
          atraviesa: 1,
          enemigosGolpeados: []
        });
      }
    }
  }

  // Mientras más dificultad, menos tardan en aparecer (pero sin pasarse de rápidos)
  const msAparicion = Math.max(200, CONFIGURACION.ENEMIGO_APARICION_BASE_MS / Math.sqrt(estadoJuego.dificultad));

  if (tiempoActual - estadoJuego.ultimaActualizacionEnemigo >= msAparicion) {
    // Escoger en qué borde de la pantalla va a nacer el monstruo
    let x = 0;
    let y = 0;
    const borde = Math.floor(Math.random() * 4); // 0: Arriba, 1: Derecha, 2: Abajo, 3: Izquierda
    const margenFuera = 30; // Distancia extra para que aparezcan totalmente ocultos y caminen hacia adentro

    switch (borde) {
      case 0: 
        x = estadoJuego.jugador.x - anchoPantalla / 2 + Math.random() * anchoPantalla; 
        y = estadoJuego.jugador.y - altoPantalla / 2 - margenFuera; 
        break;
      case 1: 
        x = estadoJuego.jugador.x + anchoPantalla / 2 + margenFuera; 
        y = estadoJuego.jugador.y - altoPantalla / 2 + Math.random() * altoPantalla; 
        break;
      case 2: 
        x = estadoJuego.jugador.x - anchoPantalla / 2 + Math.random() * anchoPantalla; 
        y = estadoJuego.jugador.y + altoPantalla / 2 + margenFuera; 
        break;
      case 3: 
        x = estadoJuego.jugador.x - anchoPantalla / 2 - margenFuera; 
        y = estadoJuego.jugador.y - altoPantalla / 2 + Math.random() * altoPantalla; 
        break;
    }

    // La vida y la velocidad suben según la dificultad
    const vidaExtra = estadoJuego.dificultad - 1;
    const velocidadExtra = estadoJuego.dificultad * 5;

    estadoJuego.enemigos.push({
      id: idUnico(),
      x,
      y,
      radio: CONFIGURACION.ENEMIGO_RADIO,
      vida: CONFIGURACION.ENEMIGO_VIDA_BASE + vidaExtra,
      vidaMaxima: CONFIGURACION.ENEMIGO_VIDA_BASE + vidaExtra,
      velocidad: Math.min(CONFIGURACION.ENEMIGO_VELOCIDAD_BASE + velocidadExtra, estadoJuego.jugador.velocidad - 20), // Nunca más rápidos que el jugador
      dano: 1
    });

    estadoJuego.ultimaActualizacionEnemigo = tiempoActual;
  }
}
