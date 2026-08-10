import React, { useEffect, useRef, useState } from 'react';
import { iniciarBucle } from '../juego/bucle';
import { iniciarEntrada } from '../juego/entrada';
import { estadoJuego, reiniciarEstado } from '../juego/estado';
import { Hud } from './Hud';
import { Cartas } from './Cartas';
import { ControlesTactiles } from './ControlesTactiles';
import { obtenerMejorasAleatorias } from '../juego/mejoras';
import { Mejora } from '../juego/tipos';
import { Trophy, Skull } from 'lucide-react';
import { reiniciarEstadisticas } from '../juego/logros';

export function LienzoJuego() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Usamos un número que sube para obligar a React a repintar el HUD y los menús sin meter todo el estado enorme
  const [actualizador, setActualizador] = useState(0);
  const [mejorasDisponibles, setMejorasDisponibles] = useState<Mejora[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Llenar toda la pantalla y recalcular si se gira el celular
    const redimensionar = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Mover al jugador al centro la primera vez que se abre
      if (estadoJuego.jugador.x === 0 && estadoJuego.jugador.y === 0) {
        estadoJuego.jugador.x = canvas.width / 2;
        estadoJuego.jugador.y = canvas.height / 2;
      }
    };
    
    window.addEventListener('resize', redimensionar);
    redimensionar();

    // Arrancar los oyentes del teclado
    const limpiarEntrada = iniciarEntrada();

    let ultimoAvisoReact = 0;
    
    // Arrancar el motor del juego y recibir avisos
    const detenerBucle = iniciarBucle(ctx, () => {
      const tiempoActual = performance.now();
      
      // Si la barra se llenó, sacar las cartas
      if (estadoJuego.estado === 'subiendo_nivel') {
         setMejorasDisponibles(prev => {
             if (prev.length === 0) return obtenerMejorasAleatorias(3);
             return prev;
         });
         setActualizador(t => t + 1);
         return;
      }

      // Si nos mataron o ganamos, avisar a React de inmediato
      if (estadoJuego.estado === 'fin_juego' || estadoJuego.estado === 'victoria') {
         setActualizador(t => t + 1);
         return;
      }

      // Si no pasa nada raro, actualizar el tiempo y la barrita 10 veces por segundo (100ms)
      if (tiempoActual - ultimoAvisoReact > 100) {
        ultimoAvisoReact = tiempoActual;
        setActualizador(t => t + 1);
      }
    });

    // Limpieza al desmontar
    return () => {
      window.removeEventListener('resize', redimensionar);
      limpiarEntrada();
      detenerBucle();
    };
  }, []);

  const alElegirMejora = () => {
    setMejorasDisponibles([]); // Se cierra el menú de cartas
    setActualizador(t => t + 1);
  };

  const reintentar = () => {
    reiniciarEstado();
    reiniciarEstadisticas();
    // Volver a acomodar al jugador
    if (canvasRef.current) {
        estadoJuego.jugador.x = canvasRef.current.width / 2;
        estadoJuego.jugador.y = canvasRef.current.height / 2;
    }
    setActualizador(t => t + 1);
  };

  const minutos = Math.floor(estadoJuego.tiempoSobrevivido / 60);
  const segundos = Math.floor(estadoJuego.tiempoSobrevivido % 60);
  const tiempoString = `${minutos}:${segundos.toString().padStart(2, '0')}`;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0c0a1a] text-white font-sans touch-none select-none flex flex-col">
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4c1d95 0%, transparent 70%)' }}
      ></div>
      {/* EL CANVAS: Aquí ocurre la magia cruda y rápida que React no toca */}
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full relative z-0"
      />
      
      {/* EL HUD: Las barritas flotando encima */}
      {(estadoJuego.estado === 'jugando' || estadoJuego.estado === 'subiendo_nivel') && (
         <Hud actualizador={actualizador} />
      )}
      
      {/* Solo en móviles, encima de todo */}
      <ControlesTactiles />

      {/* Pantalla de Subir Nivel */}
      {estadoJuego.estado === 'subiendo_nivel' && mejorasDisponibles.length > 0 && (
        <Cartas mejoras={mejorasDisponibles} alElegir={alElegirMejora} />
      )}

      {/* Pantalla de Perder */}
      {estadoJuego.estado === 'fin_juego' && (
        <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Skull className="w-24 h-24 text-red-500 mb-6 drop-shadow-lg" />
          <h2 className="text-6xl font-black text-white mb-4 tracking-tight">Has Caído</h2>
          <p className="text-2xl text-red-200 mb-10">Sobreviviste: <span className="font-bold text-white">{tiempoString}</span></p>
          <button 
            onClick={reintentar}
            className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full text-2xl transition-transform hover:scale-105 shadow-xl shadow-red-900/50 border-2 border-red-400"
          >
            Volver a intentar
          </button>
        </div>
      )}

      {/* Pantalla de Ganar */}
      {estadoJuego.estado === 'victoria' && (
        <div className="absolute inset-0 bg-amber-900/90 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Trophy className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-lg" />
          <h2 className="text-6xl font-black text-white mb-4 tracking-tight text-center">¡AMANECIÓ!</h2>
          <p className="text-2xl text-yellow-200 mb-10 text-center">Sobreviviste a la cueva completa.</p>
          <button 
            onClick={reintentar}
            className="px-10 py-5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full text-2xl transition-transform hover:scale-105 shadow-xl shadow-yellow-900/50 border-2 border-yellow-300"
          >
            Jugar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
