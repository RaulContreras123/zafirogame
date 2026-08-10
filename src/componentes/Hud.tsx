import React, { useEffect, useState } from 'react';
import { estadoJuego } from '../juego/estado';
import { CONFIGURACION } from '../juego/config';
import { obtenerLogrosRecientes } from '../juego/logros';
import { Trophy } from 'lucide-react';

// Recibe `actualizador` solo para forzar que React lo dibuje cuando el bucle lo pida
export function Hud({ actualizador }: { actualizador: number }) {
  const { jugador, experiencia, experienciaNecesaria, nivel, tiempoSobrevivido } = estadoJuego;

  const porcentajeExp = Math.min(100, (experiencia / experienciaNecesaria) * 100);

  // Formato "MM:SS"
  const minutos = Math.floor(tiempoSobrevivido / 60);
  const segundos = Math.floor(tiempoSobrevivido % 60);
  const tiempoTexto = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

  // Calcular cooldown del dash
  const [tiempoActualRender, setTiempoActualRender] = useState(performance.now());
  useEffect(() => {
    setTiempoActualRender(performance.now());
  }, [actualizador]);
  
  const tiempoDesdeUltimoDash = tiempoActualRender - jugador.ultimoDash;
  const porcentajeDash = Math.min(100, (tiempoDesdeUltimoDash / CONFIGURACION.JUGADOR_DASH_COOLDOWN) * 100);

  const logros = obtenerLogrosRecientes();

  return (
    <>
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
        <div className="w-48 sm:w-64 h-1.5 bg-slate-800/50 rounded-full mt-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${porcentajeDash >= 100 ? 'bg-white shadow-[0_0_5px_#fff]' : 'bg-white/30'}`}
            style={{ width: `${porcentajeDash}%` }}
          />
        </div>
        <span className="text-[8px] uppercase tracking-widest text-white/60">
          DASH {porcentajeDash >= 100 ? '(LISTO)' : ''}
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

    {/* Notificaciones de Logros */}
    <div className="absolute top-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-50">
      {logros.map(logro => (
        <div key={logro.id} className="animate-in fade-in slide-in-from-top-10 duration-500 bg-yellow-500/90 text-black px-6 py-3 rounded-full flex items-center gap-4 shadow-[0_0_20px_rgba(234,179,8,0.5)] border-2 border-yellow-300">
          <Trophy size={24} className="text-yellow-900" />
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">¡Logro Desbloqueado!</div>
            <div className="text-sm font-black">{logro.titulo}</div>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
