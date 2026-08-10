import React from 'react';
import { estadoJuego } from '../juego/estado';

// Recibe `actualizador` solo para forzar que React lo dibuje cuando el bucle lo pida
export function Hud({ actualizador }: { actualizador: number }) {
  const { jugador, experiencia, experienciaNecesaria, nivel, tiempoSobrevivido } = estadoJuego;

  const porcentajeExp = Math.min(100, (experiencia / experienciaNecesaria) * 100);

  // Formato "MM:SS"
  const minutos = Math.floor(tiempoSobrevivido / 60);
  const segundos = Math.floor(tiempoSobrevivido % 60);
  const tiempoTexto = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

  return (
    <header className="absolute top-0 left-0 w-full z-10 p-8 flex justify-between items-start pointer-events-none">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="flex gap-2 ml-1">
            {Array.from({ length: jugador.vidaMaxima }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rotate-45 transition-all ${
                  i < jugador.vida
                    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                    : 'bg-slate-800 border border-white/20 opacity-50'
                }`}
              />
            ))}
          </div>
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-rose-400 drop-shadow-md hidden sm:block">
            Vidas Restantes
          </span>
        </div>
        <div className="w-48 sm:w-64 h-2 bg-slate-800 rounded-full mt-2 overflow-hidden border border-white/10">
          <div
            className="h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee] transition-all duration-300"
            style={{ width: `${porcentajeExp}%` }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-cyan-400 drop-shadow-md">
          Experiencia Cristalina: Nivel {nivel}
        </span>
      </div>

      <div className="text-right drop-shadow-md">
        <div className="text-3xl sm:text-5xl font-black tracking-tighter leading-none italic text-white/90">
          {tiempoTexto}
        </div>
        <div className="text-[8px] sm:text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2">
          Tiempo Sobrevivido
        </div>
      </div>
    </header>
  );
}
