import React from 'react';
import { Mejora } from '../juego/tipos';
import { elegirMejora } from '../juego/mejoras';
import { sonidos } from '../audio/sonidos';

type Props = {
  mejoras: Mejora[];
  alElegir: () => void;
};

export function Cartas({ mejoras, alElegir }: Props) {
  const seleccionar = (id: string) => {
    sonidos.recogerGema(); // Tono de confirmar
    elegirMejora(id); // Aplica el cambio y despausa el estado global
    alElegir(); // Le avisa al Lienzo que oculte las cartas
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full px-4 sm:px-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-center text-3xl sm:text-4xl font-black italic uppercase tracking-widest mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-md">
          ¡SUBIDA DE NIVEL!
        </h2>
        <p className="text-center text-[10px] sm:text-xs tracking-[0.2em] text-white/50 mb-10 uppercase">
          ELIGE TU EVOLUCIÓN CRISTALINA
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mejoras.map((mejora, indice) => (
            <button
              key={mejora.id}
              onClick={() => seleccionar(mejora.id)}
              className="bg-white/5 border border-white/20 p-6 rounded-2xl backdrop-blur-xl hover:bg-white/10 hover:border-cyan-400/50 transition-colors cursor-pointer group text-left flex flex-col items-start relative overflow-hidden"
              style={{ animationDelay: `${indice * 100}ms` }}
            >
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg mb-4 flex items-center justify-center border border-cyan-400/50 group-hover:scale-110 transition-transform">
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-cyan-400 rotate-45 shadow-[0_0_8px_#22d3ee]"></div>
                  <div className="w-3 h-3 bg-cyan-400 rotate-45 shadow-[0_0_8px_#22d3ee]"></div>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1 tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                {mejora.nombre}
              </h3>
              <p className="text-[11px] text-white/60 leading-relaxed italic">
                {mejora.descripcion}
              </p>
              <div className="mt-4 text-[10px] font-mono text-cyan-400/70 opacity-0 group-hover:opacity-100 transition-opacity">
                +{mejora.id}()
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
