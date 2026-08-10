import { Mejora } from './tipos';
import { estadoJuego } from './estado';
import { CONFIGURACION } from './config';

/*
  EL CATÁLOGO DE MEJORAS
  Para agregar un poder nuevo, añade un objeto a este arreglo.
  No necesitas tocar absolutamente nada más en todo el juego.
  
  Ejemplo:
  {
    id: 'super_fuerza',
    nombre: 'Súper Fuerza',
    descripcion: 'Haces el doble de daño',
    efecto: (estado) => { estado.arma.dano += 2; }
  }
*/

export const TODAS_LAS_MEJORAS: Mejora[] = [
  {
    id: 'poder_veloz',
    nombre: 'Poder Veloz',
    descripcion: 'El arma dispara un poco más rápido.',
    efecto: (estado) => { estado.arma.velocidadDisparo += 1.5; }
  },
  {
    id: 'doble_cristal',
    nombre: 'Cristal Extra',
    descripcion: 'El arma dispara un cristal adicional a la vez.',
    efecto: (estado) => { estado.arma.cantidadProyectiles += 1; }
  },
  {
    id: 'zapatos_ligeros',
    nombre: 'Zapatos Ligeros',
    descripcion: 'Te mueves más rápido para poder escapar.',
    efecto: (estado) => { estado.jugador.velocidad += 25; }
  },
  {
    id: 'iman_gemas',
    nombre: 'Imán de Gemas',
    descripcion: 'Atraes las gemas de experiencia desde más lejos.',
    efecto: (estado) => { estado.jugador.radioRecogida += 40; }
  },
  {
    id: 'cristal_curativo',
    nombre: 'Cristal Curativo',
    descripcion: 'Recuperas una vida y tu barra de vida crece.',
    efecto: (estado) => {
      estado.jugador.vidaMaxima += 1;
      estado.jugador.vida += 1;
    }
  },
  {
    id: 'filo_cristal',
    nombre: 'Filo de Cristal',
    descripcion: 'Tus cristales lastiman más a los monstruos.',
    efecto: (estado) => { estado.arma.dano += 0.5; }
  },
  {
    id: 'cristal_perforante',
    nombre: 'Cristal Perforante',
    descripcion: 'Tus cristales pueden atravesar a un enemigo más sin romperse.',
    efecto: (estado) => { estado.arma.atraviesa += 1; }
  }
];

export function obtenerMejorasAleatorias(cantidad: number): Mejora[] {
  // Mezcla el arreglo y toma las primeras cartas
  const mezcladas = [...TODAS_LAS_MEJORAS].sort(() => 0.5 - Math.random());
  return mezcladas.slice(0, cantidad);
}

export function elegirMejora(mejoraId: string) {
  const mejora = TODAS_LAS_MEJORAS.find(m => m.id === mejoraId);
  if (mejora) {
    mejora.efecto(estadoJuego);
    
    // Subir de nivel de verdad
    estadoJuego.nivel += 1;
    estadoJuego.experiencia = 0;
    // La próxima vez costará más llenarlo
    estadoJuego.experienciaNecesaria = Math.floor(estadoJuego.experienciaNecesaria * CONFIGURACION.XP_MULTIPLICADOR_NIVEL);
    
    // Despausar el juego
    estadoJuego.estado = 'jugando';
  }
}
