import { EstadoJuego } from './tipos';

/*
  REGLA DE ORO: La lógica del juego NO sabe cómo se dibuja. 
  Puedes borrar y rehacer este archivo entero sin romper el juego.
  Aquí le damos color y forma a los datos fríos del estado.
*/

export function dibujarJuego(ctx: CanvasRenderingContext2D, estado: EstadoJuego, ancho: number, alto: number, tiempoActual: number) {
  // 1. Limpiar el fondo (Se borra para dejar ver el fondo CSS)
  ctx.clearRect(0, 0, ancho, alto);

  ctx.save();
  
  // Transformación de la cámara (el jugador siempre está en el centro)
  let offsetX = ancho / 2 - estado.jugador.x;
  let offsetY = alto / 2 - estado.jugador.y;
  
  // Efecto de temblor de pantalla (Screen Shake) cuando nos pegan
  if (tiempoActual < estado.jugador.invulnerableHasta && tiempoActual > estado.jugador.enDashHasta) {
    const intensidadShake = (estado.jugador.invulnerableHasta - tiempoActual) / 1000 * 20; // 20px máx
    offsetX += (Math.random() - 0.5) * intensidadShake;
    offsetY += (Math.random() - 0.5) * intensidadShake;
  }

  ctx.translate(offsetX, offsetY);

  // Fondo Parallax (estrellas o polvo mágico)
  const parallaxX = estado.jugador.x * 0.7;
  const parallaxY = estado.jugador.y * 0.7;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  const gridSize = 80;
  
  // Rango visible de la cámara ajustado por el parallax
  const startX = Math.floor((estado.jugador.x - ancho/2 - parallaxX) / gridSize) * gridSize - gridSize;
  const startY = Math.floor((estado.jugador.y - alto/2 - parallaxY) / gridSize) * gridSize - gridSize;
  const endX = startX + ancho + gridSize * 2;
  const endY = startY + alto + gridSize * 2;
  
  for (let x = startX; x < endX; x += gridSize) {
    for (let y = startY; y < endY; y += gridSize) {
      // Pseudo-aleatorio simple y determinista para dibujar en las celdas
      const rand = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const fraccion = rand - Math.floor(rand);
      if (fraccion > 0.3) {
        ctx.beginPath();
        ctx.arc(x + parallaxX + (fraccion * gridSize), y + parallaxY + ((1 - fraccion) * gridSize), fraccion * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // 2. Dibujar Gemas (Exp) - Brillan para llamar la atención
  for (const gema of estado.gemas) {
    ctx.beginPath();
    ctx.arc(gema.x, gema.y, gema.radio, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffcc';
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffcc';
    ctx.fill();
    ctx.shadowBlur = 0; // Apagar brillo
  }

  // 3. Dibujar Enemigos (Monstruos de cristal oscuros que parecen gusanos)
  for (const enemigo of estado.enemigos) {
    const angulo = Math.atan2(estado.jugador.y - enemigo.y, estado.jugador.x - enemigo.x);
    const proporcionVida = enemigo.vida / enemigo.vidaMaxima;
    
    // Tonos morados/rosados acordes al tema artístico, cambian con colorHue y jefesVencidos
    let colorHSL = `hsl(${enemigo.colorHue}, 70%, ${40 + 20 * proporcionVida}%)`;
    let strokeColor = `hsl(${enemigo.colorHue}, 100%, 70%)`;
    let alphaColor = (alpha: number) => `hsla(${enemigo.colorHue}, 70%, ${40 + 20 * proporcionVida}%, ${alpha})`;
    
    // Si es jefe, que sea más aterrador y cambie también
    if (enemigo.esJefe) {
      colorHSL = `hsl(${enemigo.colorHue}, 90%, ${30 + 30 * proporcionVida}%)`;
      strokeColor = `hsl(${enemigo.colorHue}, 100%, 60%)`;
      alphaColor = (alpha: number) => `hsla(${enemigo.colorHue}, 90%, ${30 + 30 * proporcionVida}%, ${alpha})`;
    }
    
    // Dibujar segmentos del cuerpo (cola de gusano)
    const numSegmentos = enemigo.esJefe ? 10 : 5 + enemigo.tipoGusano;
    for (let i = numSegmentos; i > 0; i--) {
      // Cada segmento es más pequeño
      const radioSegmento = enemigo.radio * (1 - (i * (enemigo.esJefe ? 0.08 : 0.15)));
      // Cada segmento está más lejos hacia atrás
      const distanciaCentro = i * (enemigo.radio * (0.85 - (enemigo.tipoGusano * 0.1)));
      
      const segX = enemigo.x - Math.cos(angulo) * distanciaCentro;
      const segY = enemigo.y - Math.sin(angulo) * distanciaCentro;
      
      // Movimiento ondulante de la cola
      const ondulacion = Math.sin(tiempoActual / (150 - enemigo.tipoGusano * 20) - i) * (enemigo.radio * (0.4 + enemigo.tipoGusano * 0.1));
      const segXConOnda = segX + Math.cos(angulo + Math.PI / 2) * ondulacion;
      const segYConOnda = segY + Math.sin(angulo + Math.PI / 2) * ondulacion;

      ctx.beginPath();
      ctx.arc(segXConOnda, segYConOnda, Math.max(2, radioSegmento), 0, Math.PI * 2);
      ctx.fillStyle = alphaColor(1 - (i * (enemigo.esJefe ? 0.05 : 0.1)));
      ctx.fill();
      
      // Borde del segmento
      ctx.strokeStyle = enemigo.esJefe ? strokeColor : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = enemigo.esJefe ? 2 : 1;
      ctx.stroke();
    }

    // Cabeza (Cuerpo principal)
    ctx.beginPath();
    ctx.arc(enemigo.x, enemigo.y, enemigo.radio, 0, Math.PI * 2);
    ctx.fillStyle = colorHSL;
    ctx.fill();
    ctx.strokeStyle = enemigo.esJefe ? strokeColor : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = enemigo.esJefe ? 3 : 1.5;
    ctx.stroke();
    
    // Ojos pequeños mirando al jugador
    ctx.fillStyle = enemigo.esJefe ? '#fff200' : '#ffffff';
    ctx.beginPath();
    // Ojo izquierdo
    ctx.arc(
      enemigo.x + Math.cos(angulo) * (enemigo.esJefe ? 12 : 6) - Math.sin(angulo) * (enemigo.esJefe ? 8 : 4), 
      enemigo.y + Math.sin(angulo) * (enemigo.esJefe ? 12 : 6) + Math.cos(angulo) * (enemigo.esJefe ? 8 : 4), 
      enemigo.esJefe ? 6 : 3, 0, Math.PI * 2
    );
    // Ojo derecho
    ctx.arc(
      enemigo.x + Math.cos(angulo) * (enemigo.esJefe ? 12 : 6) + Math.sin(angulo) * (enemigo.esJefe ? 8 : 4), 
      enemigo.y + Math.sin(angulo) * (enemigo.esJefe ? 12 : 6) - Math.cos(angulo) * (enemigo.esJefe ? 8 : 4), 
      enemigo.esJefe ? 6 : 3, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Barra de vida del monstruo (solo si ha recibido daño)
    if (enemigo.vida < enemigo.vidaMaxima) {
      const anchoBarra = 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(enemigo.x - anchoBarra/2, enemigo.y - enemigo.radio - 12, anchoBarra, 4);
      ctx.fillStyle = '#f43f5e'; // rose-500
      ctx.fillRect(enemigo.x - anchoBarra/2, enemigo.y - enemigo.radio - 12, anchoBarra * proporcionVida, 4);
    }
  }

  // 4. Dibujar Jugador (Niña de poderes de cristal)
  // Parpadea si le acaban de pegar (invulnerable)
  const parpadea = estado.jugador.invulnerableHasta > tiempoActual && Math.floor(tiempoActual / 100) % 2 === 0;
  
  if (!parpadea) {
    // A. Área magnética dibujada muy tenue
    ctx.beginPath();
    ctx.arc(estado.jugador.x, estado.jugador.y, estado.jugador.radioRecogida, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 204, 0.05)';
    ctx.fill();

    // B. Cuerpo de la niña
    ctx.beginPath();
    ctx.arc(estado.jugador.x, estado.jugador.y, estado.jugador.radio, 0, Math.PI * 2);
    ctx.fillStyle = '#dca3ff'; // Color cristalino suave
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // C. Centro brillante
    ctx.beginPath();
    ctx.arc(estado.jugador.x, estado.jugador.y, estado.jugador.radio * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // 5. Dibujar Proyectiles (Cristales mágicos)
  for (const proyectil of estado.proyectiles) {
    ctx.save();
    ctx.translate(proyectil.x, proyectil.y);
    const ang = Math.atan2(proyectil.velocidadY, proyectil.velocidadX) + Math.PI / 2;
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -proyectil.radio * 1.5);
    ctx.lineTo(proyectil.radio, 0);
    ctx.lineTo(0, proyectil.radio * 1.5);
    ctx.lineTo(-proyectil.radio, 0);
    ctx.closePath();
    ctx.fillStyle = '#e6ccff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 5.5. Dibujar Proyectiles Enemigos
  for (const proyectil of estado.proyectilesEnemigos) {
    ctx.save();
    ctx.translate(proyectil.x, proyectil.y);
    const ang = Math.atan2(proyectil.velocidadY, proyectil.velocidadX) + Math.PI / 2;
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -proyectil.radio * 1.5);
    ctx.lineTo(proyectil.radio, 0);
    ctx.lineTo(0, proyectil.radio * 1.5);
    ctx.lineTo(-proyectil.radio, 0);
    ctx.closePath();
    ctx.fillStyle = '#ff6b6b'; // Rojo coral
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 6. Dibujar Textos Flotantes (Daño saltando)
  for (const texto of estado.textosDano) {
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = `rgba(255, 255, 255, ${texto.opacidad})`;
    ctx.textAlign = 'center';
    ctx.fillText(texto.texto, texto.x, texto.y);
  }

  ctx.restore(); // Finalizar cámara
}
