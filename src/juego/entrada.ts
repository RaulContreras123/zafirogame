import { Entrada } from './tipos';

export const entradaActual: Entrada = {
  arriba: false,
  abajo: false,
  izquierda: false,
  derecha: false,
  joystickX: 0,
  joystickY: 0,
};

export function iniciarEntrada() {
  const manejarTecla = (e: KeyboardEvent, presionada: boolean) => {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': entradaActual.arriba = presionada; break;
      case 's': case 'arrowdown': entradaActual.abajo = presionada; break;
      case 'a': case 'arrowleft': entradaActual.izquierda = presionada; break;
      case 'd': case 'arrowright': entradaActual.derecha = presionada; break;
    }
  };

  const alPresionar = (e: KeyboardEvent) => manejarTecla(e, true);
  const alSoltar = (e: KeyboardEvent) => manejarTecla(e, false);

  window.addEventListener('keydown', alPresionar);
  window.addEventListener('keyup', alSoltar);

  return () => {
    window.removeEventListener('keydown', alPresionar);
    window.removeEventListener('keyup', alSoltar);
  };
}
