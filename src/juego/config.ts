export const CONFIGURACION = {
  // Jugador
  JUGADOR_VIDA_INICIAL: 3, // Cuántos golpes aguanta al empezar
  JUGADOR_VELOCIDAD_INICIAL: 150, // Qué tan rápido camina (píxeles por segundo)
  JUGADOR_RADIO: 15, // Tamaño del jugador
  JUGADOR_RADIO_RECOGIDA_INICIAL: 60, // Desde qué distancia atrae las gemas
  JUGADOR_TIEMPO_INVULNERABLE: 1000, // Milisegundos que no recibe daño tras un golpe
  JUGADOR_DASH_DURACION: 200, // milisegundos que dura el dash
  JUGADOR_DASH_COOLDOWN: 1500, // milisegundos entre dashes
  JUGADOR_DASH_VELOCIDAD: 600, // velocidad del dash

  // Arma inicial (Poderes de cristal)
  ARMA_DANO_INICIAL: 1, // Cuánto daño hace cada cristal
  ARMA_DISPAROS_POR_SEGUNDO_INICIAL: 2, // Cuántos cristales dispara en un segundo
  ARMA_CANTIDAD_PROYECTILES_INICIAL: 1, // Cuántos cristales salen a la vez
  ARMA_VELOCIDAD_PROYECTIL: 400, // Qué tan rápido vuela el cristal
  ARMA_RADIO_PROYECTIL: 6, // Tamaño del cristal

  // Enemigos (Monstruos de cristal)
  ENEMIGO_VIDA_BASE: 2, // Vida de los monstruos al empezar
  ENEMIGO_VELOCIDAD_BASE: 80, // Qué tan rápido caminan los monstruos
  ENEMIGO_RADIO: 16, // Tamaño de los monstruos
  ENEMIGO_APARICION_BASE_MS: 1000, // Milisegundos entre cada monstruo nuevo (1000 = 1 segundo)
  ENEMIGO_ESCALA_DIFICULTAD: 60, // Cada cuántos segundos se vuelven más fuertes y rápidos

  // Jefe Gusano Gigante
  JEFE_VIDA_BASE: 100, // Mucha más vida que un enemigo normal
  JEFE_VELOCIDAD: 60, // Un poco más lento pero implacable
  JEFE_RADIO: 40, // Mucho más grande
  JEFE_TIEMPO_ENTRE_PODERES: 3000, // Cada 3 segundos usa un poder (ej. invocar gusanos pequeños)

  // Experiencia y Niveles
  XP_INICIAL_NECESARIA: 5, // Cuántas gemas para el primer nivel
  XP_MULTIPLICADOR_NIVEL: 1.8, // Cuánto crece la barra de nivel cada vez

  // Juego
  TIEMPO_VICTORIA_SEGUNDOS: 600, // 10 minutos para ganar
};
