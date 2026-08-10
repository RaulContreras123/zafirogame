export type Posicion = { x: number; y: number };
export type Entidad = Posicion & { id: string; radio: number };

export type Jugador = Entidad & {
  vida: number;
  vidaMaxima: number;
  velocidad: number;
  radioRecogida: number;
  invulnerableHasta: number;
};

export type Enemigo = Entidad & {
  vida: number;
  vidaMaxima: number;
  velocidad: number;
  dano: number;
  esJefe?: boolean;
  ultimoAtaque?: number;
};

export type Proyectil = Entidad & {
  velocidadX: number;
  velocidadY: number;
  dano: number;
  tiempoVida: number; // para que no vuelen para siempre
  atraviesa: number; // para futuras mejoras
  enemigosGolpeados: string[]; // para no golpear al mismo enemigo dos veces
};

export type Gema = Entidad & {
  valor: number;
  recogiendose: boolean;
};

export type TextoDano = Posicion & {
  id: string;
  texto: string;
  tiempoVida: number;
  opacidad: number;
};

export type EstadisticasArma = {
  dano: number;
  velocidadDisparo: number; // disparos por segundo
  cantidadProyectiles: number;
  velocidadProyectil: number;
  atraviesa: number;
};

export type EstadoJuego = {
  jugador: Jugador;
  enemigos: Enemigo[];
  proyectiles: Proyectil[];
  proyectilesEnemigos: Proyectil[];
  gemas: Gema[];
  textosDano: TextoDano[];
  arma: EstadisticasArma;
  experiencia: number;
  experienciaNecesaria: number;
  nivel: number;
  tiempoSobrevivido: number; // en segundos
  dificultad: number; // multiplicador
  estado: 'jugando' | 'subiendo_nivel' | 'fin_juego' | 'victoria';
  ultimaActualizacionDisparo: number;
  ultimaActualizacionEnemigo: number;
  ultimoNivelJefe: number;
  jefesVencidos: number;
};

export type Entrada = {
  arriba: boolean;
  abajo: boolean;
  izquierda: boolean;
  derecha: boolean;
  joystickX: number; // -1 a 1
  joystickY: number; // -1 a 1
};

export type Mejora = {
  id: string;
  nombre: string;
  descripcion: string;
  efecto: (estado: EstadoJuego) => void;
};
