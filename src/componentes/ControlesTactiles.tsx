import React, { useRef, useEffect } from 'react';
import { entradaActual } from '../juego/entrada';

export function ControlesTactiles() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const perillaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const joystick = joystickRef.current;
    const perilla = perillaRef.current;
    if (!joystick || !perilla) return;

    let activo = false;
    let centro = { x: 0, y: 0 };
    let radioMaximo = 40; // Qué tan lejos puede moverse la perilla

    const manejarInicio = (e: TouchEvent) => {
      e.preventDefault();
      activo = true;
      const rect = joystick.getBoundingClientRect();
      centro = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      actualizarPosicion(e.touches[0]);
    };

    const manejarMovimiento = (e: TouchEvent) => {
      e.preventDefault();
      if (!activo) return;
      actualizarPosicion(e.touches[0]);
    };

    const manejarFin = (e: TouchEvent) => {
      e.preventDefault();
      activo = false;
      entradaActual.joystickX = 0;
      entradaActual.joystickY = 0;
      perilla.style.transform = `translate(0px, 0px)`;
    };

    const actualizarPosicion = (toque: React.Touch | Touch) => {
      const dx = toque.clientX - centro.x;
      const dy = toque.clientY - centro.y;
      const distancia = Math.hypot(dx, dy);
      
      const radioEfectivo = Math.min(distancia, radioMaximo);
      const angulo = Math.atan2(dy, dx);
      
      const perillaX = Math.cos(angulo) * radioEfectivo;
      const perillaY = Math.sin(angulo) * radioEfectivo;
      
      perilla.style.transform = `translate(${perillaX}px, ${perillaY}px)`;
      
      // Pasar a la lógica de entrada entre -1 y 1
      entradaActual.joystickX = perillaX / radioMaximo;
      entradaActual.joystickY = perillaY / radioMaximo;
    };

    joystick.addEventListener('touchstart', manejarInicio, { passive: false });
    joystick.addEventListener('touchmove', manejarMovimiento, { passive: false });
    joystick.addEventListener('touchend', manejarFin, { passive: false });
    joystick.addEventListener('touchcancel', manejarFin, { passive: false });

    return () => {
      joystick.removeEventListener('touchstart', manejarInicio);
      joystick.removeEventListener('touchmove', manejarMovimiento);
      joystick.removeEventListener('touchend', manejarFin);
      joystick.removeEventListener('touchcancel', manejarFin);
    };
  }, []);

  return (
    <div className="absolute bottom-12 left-12 sm:hidden z-20 opacity-60">
      {/* Fondo del Joystick */}
      <div 
        ref={joystickRef}
        className="w-32 h-32 bg-white/10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm"
      >
        {/* Botón que se mueve */}
        <div 
          ref={perillaRef}
          className="w-14 h-14 bg-white/50 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] pointer-events-none"
          style={{ transition: 'none' }}
        />
      </div>
    </div>
  );
}
