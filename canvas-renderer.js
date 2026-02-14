/**
 * Módulo de Renderização do Canvas
 * Renderiza a arte de jogos em formato 1080x1920 (retrato) no HTML5 Canvas
 */

// ===== IMAGEM DO RODAPÉ (pré-carregada) =====
import footerBannerUrl from './assets/footer-banner.png';
let footerImage = null;
const footerImg = new Image();
footerImg.crossOrigin = 'anonymous';
footerImg.onload = () => { footerImage = footerImg; };
footerImg.src = footerBannerUrl;

// ===== TEMAS POR CAMPEONATO (gradientes e cores de destaque) =====
const BG_CONFIGS = {
  // 🇧🇷 Campeonato Brasileiro — Verde + Amarelo
  'brasileirao': {
    gradient: ['#002a0a', '#003d12', '#00521a'],
    accent: '#f7d731',
    glow: 'rgba(247, 215, 49, 0.08)',
  },
  // 🏟️ Campeonato Paulista — Vermelho + Preto
  'paulista': {
    gradient: ['#1a0505', '#2d0a0a', '#3d0f0f'],
    accent: '#e02020',
    glow: 'rgba(224, 32, 32, 0.08)',
  },
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League — Roxo + Magenta
  'premier': {
    gradient: ['#1a0828', '#2a0f40', '#3d195b'],
    accent: '#ff2882',
    glow: 'rgba(255, 40, 130, 0.08)',
  },
  // 🏆 Champions League — Azul Marinho + Prata
  'ucl': {
    gradient: ['#050d24', '#0a1840', '#0d1f5c'],
    accent: '#00a1e4',
    glow: 'rgba(0, 161, 228, 0.08)',
  },
  // 🇪🇸 La Liga — Navy + Laranja
  'laliga': {
    gradient: ['#0a0e1a', '#121830', '#1a2248'],
    accent: '#ff6900',
    glow: 'rgba(255, 105, 0, 0.08)',
  },
  // 🇮🇹 Serie A — Azul + Verde Italiano
  'serie-a': {
    gradient: ['#04131f', '#081e30', '#0a2a42'],
    accent: '#02a86c',
    glow: 'rgba(2, 168, 108, 0.08)',
  },
  // ⚽ Copa Sudamericana — Vermelho + Laranja
  'sulamericana': {
    gradient: ['#1a0800', '#2d1005', '#401808'],
    accent: '#e04428',
    glow: 'rgba(224, 68, 40, 0.08)',
  },
  // 🏆 Libertadores — Dourado + Verde Escuro
  'libertadores': {
    gradient: ['#0a1a08', '#102a0d', '#183a14'],
    accent: '#d4a843',
    glow: 'rgba(212, 168, 67, 0.08)',
  },
  // 🌍 Copa do Mundo — Bordô + Dourado
  'copa-mundo': {
    gradient: ['#1a0812', '#2d0d1e', '#40122a'],
    accent: '#d4af37',
    glow: 'rgba(212, 175, 55, 0.08)',
  },
  // 🇮🇹 Copa da Italia — Verde + Vermelho Tricolore
  'copa-italia': {
    gradient: ['#041208', '#08200f', '#0c3018'],
    accent: '#cd212a',
    glow: 'rgba(205, 33, 42, 0.08)',
  },
  // 🇪🇸 Copa del Rey — Vermelho + Amarelo
  'copa-rey': {
    gradient: ['#1a0808', '#301010', '#481818'],
    accent: '#fabd00',
    glow: 'rgba(250, 189, 0, 0.08)',
  },
  // 🇧🇷 Copa do Brasil — Verde Bandeira + Ouro
  'copa-brasil': {
    gradient: ['#00200a', '#003510', '#004a18'],
    accent: '#ffcc29',
    glow: 'rgba(255, 204, 41, 0.08)',
  },
  // 🔶 Europa League — Laranja + Preto
  'europa': {
    gradient: ['#0f0800', '#1a1005', '#2a1a08'],
    accent: '#f57a22',
    glow: 'rgba(245, 122, 34, 0.08)',
  },
};

/**
 * Função principal de renderização — Canvas 1080x1920 (retrato)
 */
export function renderCanvas(canvas, games, options = {}) {
  const ctx = canvas.getContext('2d');
  const W = 1080; // Largura do canvas
  const H = 1920; // Altura do canvas

  const bgKey = options.background || 'brasileirao';
  const bgConfig = BG_CONFIGS[bgKey] || BG_CONFIGS['brasileirao'];
  const title = options.title || 'JOGOS DO DIA';
  const dateStr = options.date || formatDate(new Date());
  const bgImage = options.bgImage || null; // Imagem de fundo (Image object ou null)

  // Limpar canvas
  ctx.clearRect(0, 0, W, H);

  // Desenhar fundo (imagem + gradiente)
  drawBackground(ctx, W, H, bgConfig, bgImage);

  // Desenhar decorações (grid, cantos, linhas diagonais)
  drawDecorations(ctx, W, H, bgConfig);

  // ===== AUTO-LAYOUT: TÍTULO + JOGOS + RODAPÉ =====
  // 1) Medir altura do cabeçalho (título)
  const headerHeight = measureHeaderHeight(ctx, W, title);

  // 2) Medir altura do rodapé (imagem do banner)
  const footerPadX = 140; // Padding horizontal do footer
  const footerDrawW = W - footerPadX * 2;
  let footerH = 0;
  if (footerImage) {
    const aspectRatio = footerImage.naturalHeight / footerImage.naturalWidth;
    footerH = footerDrawW * aspectRatio;
  }

  // 3) Calcular espaço disponível e gaps iguais
  const topMargin = 60;       // Margem superior
  const bottomMargin = 60;    // Margem inferior
  const usableH = H - topMargin - bottomMargin;

  // Áreas: [header] + [gap] + [games] + [gap] + [footer]
  // Queremos que os gaps entre as 3 seções sejam iguais
  // Altura dos jogos é dinâmica — ocupam o espaço remanescente
  const minGap = 30;          // Gap mínimo entre seções
  const gamesH = usableH - headerHeight - footerH - minGap * 2;

  // Posições calculadas pelo auto-layout
  const headerY = topMargin;
  const gamesStartY = headerY + headerHeight + minGap;
  const gamesEndY = gamesStartY + gamesH;
  const footerY = gamesEndY + minGap;

  // 4) Desenhar cada seção na posição calculada
  drawHeader(ctx, W, title, dateStr, bgConfig, headerY);

  if (games.length > 0) {
    drawGames(ctx, W, H, games, bgConfig, gamesStartY, gamesEndY);
  } else {
    drawEmptyState(ctx, W, H);
  }

  drawFooter(ctx, W, H, bgConfig, footerY, footerDrawW, footerH, footerPadX);
}

// ===== FUNDO (imagem de fundo OU gradiente de cor) =====
function drawBackground(ctx, W, H, config, bgImage) {
  if (bgImage) {
    // ── Com imagem de fundo: desenhar imagem + overlay escuro (sem gradiente) ──
    const imgW = bgImage.naturalWidth || bgImage.width;
    const imgH = bgImage.naturalHeight || bgImage.height;
    // Calcular posição para "cover" (preencher sem distorcer)
    const scale = Math.max(W / imgW, H / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (W - drawW) / 2;
    const drawY = (H - drawH) / 2;
    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
  } else {
    // ── Sem imagem: gradiente de cor como fundo ──
    const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
    grad.addColorStop(0, config.gradient[0]);
    grad.addColorStop(0.5, config.gradient[1]);
    grad.addColorStop(1, config.gradient[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Brilho radial sutil para dar profundidade
    const radial = ctx.createRadialGradient(W / 2, H * 0.2, 0, W / 2, H * 0.2, W);
    radial.addColorStop(0, config.glow);
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);
  }
}

// ===== DECORAÇÕES (grid, cantos, linhas diagonais) =====
function drawDecorations(ctx, W, H, config) {
  ctx.save();

  // --- Grade sutil ---
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  const gridSize = 60; // Tamanho de cada célula do grid (px)
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // --- Colchetes decorativos nos cantos ---
  const accentColor = config.accent;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.15; // Opacidade dos colchetes

  // Canto superior-esquerdo
  ctx.beginPath();
  ctx.moveTo(40, 100);
  ctx.lineTo(40, 40);
  ctx.lineTo(100, 40);
  ctx.stroke();

  // Canto superior-direito
  ctx.beginPath();
  ctx.moveTo(W - 40, 100);
  ctx.lineTo(W - 40, 40);
  ctx.lineTo(W - 100, 40);
  ctx.stroke();

  // Canto inferior-esquerdo
  ctx.beginPath();
  ctx.moveTo(40, H - 100);
  ctx.lineTo(40, H - 40);
  ctx.lineTo(100, H - 40);
  ctx.stroke();

  // Canto inferior-direito
  ctx.beginPath();
  ctx.moveTo(W - 40, H - 100);
  ctx.lineTo(W - 40, H - 40);
  ctx.lineTo(W - 100, H - 40);
  ctx.stroke();

  // --- Linhas diagonais sutis ---
  ctx.globalAlpha = 0.03; // Opacidade das diagonais
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 120) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }

  ctx.restore();
}

// ===== PARSER DE SEGMENTOS (suporte a *NNpx* para tamanho de fonte) =====
// Exemplo: "*25px* Jogos em *64px*DESTAQUE"
// Resulta em: [{size:25, text:" Jogos em "}, {size:64, text:"DESTAQUE"}]
function parseTitleSegments(line) {
  const regex = /\*(\d+)px\*/g;
  const segments = [];
  let lastIndex = 0;
  let currentSize = 72; // Tamanho padrão (px)
  let match;

  while ((match = regex.exec(line)) !== null) {
    const textBefore = line.slice(lastIndex, match.index);
    if (textBefore) {
      segments.push({ size: currentSize, text: textBefore });
    }
    currentSize = parseInt(match[1], 10);
    lastIndex = regex.lastIndex;
  }

  const remaining = line.slice(lastIndex);
  if (remaining) {
    segments.push({ size: currentSize, text: remaining });
  }

  if (segments.length === 0) {
    segments.push({ size: 72, text: line });
  }

  return segments;
}

// ===== MEDIR ALTURA DO CABEÇALHO (sem desenhar) =====
function measureHeaderHeight(ctx, W, title) {
  const lines = title.split('\n').filter(l => l.trim() !== '');
  const lineSpacing = 15;
  let totalH = 0;

  lines.forEach((line) => {
    const segments = parseTitleSegments(line.trim());
    const maxSize = Math.max(...segments.map(s => s.size));
    totalH += maxSize + lineSpacing;
  });

  return totalH;
}

// ===== CABEÇALHO (título com suporte a múltiplas linhas e tamanhos variáveis) =====
// startY = posição Y onde o cabeçalho começa (vinda do auto-layout)
function drawHeader(ctx, W, title, dateStr, config, startY) {
  ctx.save();

  const lines = title.split('\n').filter(l => l.trim() !== '');
  const lineSpacing = 15;

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = config.accent;
  ctx.shadowBlur = 30;

  let currentY = startY;

  lines.forEach((line) => {
    const segments = parseTitleSegments(line.trim());
    const maxSize = Math.max(...segments.map(s => s.size));

    // Centralizar verticalmente na linha (meio da maior fonte)
    const lineCenterY = currentY + maxSize / 2;

    let totalWidth = 0;
    const measured = segments.map(seg => {
      ctx.font = `900 ${seg.size}px "Outfit", "Inter", sans-serif`;
      const w = ctx.measureText(seg.text).width;
      totalWidth += w;
      return { ...seg, width: w };
    });

    let drawX = W / 2 - totalWidth / 2;

    measured.forEach(seg => {
      ctx.font = `900 ${seg.size}px "Outfit", "Inter", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(seg.text, drawX, lineCenterY);
      drawX += seg.width;
    });

    currentY += maxSize + lineSpacing;
  });

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ===== DISTRIBUIÇÃO DOS CARDS DOS JOGOS =====
function drawGames(ctx, W, H, games, config, startY, endY) {
  const count = games.length;

  // Layout vertical empilhado para formato retrato
  const cardW = W - 120;      // Largura do card (60px de padding em cada lado)
  const availableH = endY - startY;

  const gap = 25;              // Espaçamento entre cards (px)
  const totalGap = (count - 1) * gap;
  const cardH = Math.min(420, (availableH - totalGap) / count); // Altura máxima: 420px
  const totalH = count * cardH + totalGap;
  const offsetY = startY + (availableH - totalH) / 2; // Centralizar verticalmente
  const offsetX = 60;          // Margem esquerda dos cards

  games.forEach((game, i) => {
    const y = offsetY + i * (cardH + gap);
    drawGameCard(ctx, offsetX, y, cardW, cardH, game, config, i);
  });
}

// ===== CARD INDIVIDUAL DO JOGO =====
function drawGameCard(ctx, x, y, w, h, game, config, index) {
  ctx.save();

  // --- Fundo do card com bordas arredondadas ---
  const r = 20; // Raio das bordas arredondadas (px)
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'; // Cor de fundo do card
  ctx.fill();

  // --- Borda do card ---
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; // Cor da borda
  ctx.lineWidth = 1.5; // Espessura da borda
  ctx.stroke();

  // --- Linha de destaque no topo do card ---
  const accentGrad = ctx.createLinearGradient(x, y, x + w, y);
  accentGrad.addColorStop(0, 'transparent');
  accentGrad.addColorStop(0.3, config.accent);
  accentGrad.addColorStop(0.7, config.accent);
  accentGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = accentGrad;
  ctx.lineWidth = 3; // Espessura da linha de destaque
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.stroke();

  // --- Brilho interno do card ---
  const innerGlow = ctx.createRadialGradient(x + w / 2, y, 0, x + w / 2, y, h);
  innerGlow.addColorStop(0, config.glow);
  innerGlow.addColorStop(1, 'transparent');
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = innerGlow;
  ctx.fill();

  // ====================================================
  // LAYOUT DO CARD: todo conteúdo centralizado verticalmente
  // Bloco de conteúdo (posições relativas):
  //   0:   Info (campeonato/horário)
  //   70:  Nome linha 1
  //   128: Nome linha 2 (70 + 58)
  //   168: Linha separadora (meio entre nomes e odds)
  //   208: Rótulos das odds (CASA/EMPATE/FORA)
  //   273: Valores das odds (208 + 65)
  // ====================================================

  const blockHeight = 273;                       // ALTURA TOTAL do bloco de conteúdo
  const blockTop = y + (h - blockHeight) / 2;    // Topo do bloco (padding superior = inferior)

  const logoSize = Math.min(140, h * 0.38);      // TAMANHO DOS LOGOS (máximo: 140px)
  const logoPadding = 90;                         // DISTÂNCIA DOS LOGOS até a borda (px)

  // Centro vertical dos logos (alinhado com a área dos nomes)
  const logoCenterY = blockTop + 64;              // Centro entre info(0) e line2(128)

  // --- Logo do Time A (lado esquerdo) ---
  const logoAx = x + logoPadding + logoSize / 2;
  drawLogo(ctx, logoAx, logoCenterY, logoSize, game.logoA, config);

  // --- Logo do Time B (lado direito) ---
  const logoBx = x + w - logoPadding - logoSize / 2;
  drawLogo(ctx, logoBx, logoCenterY, logoSize, game.logoB, config);

  // --- Área central ---
  const centerX = x + w / 2;

  // --- Campeonato + Horário na mesma linha (ex: "BRASILEIRO - 15H00") ---
  const infoY = blockTop;                        // POSIÇÃO Y do campeonato/horário

  const infoParts = [];
  if (game.league) infoParts.push(game.league.toUpperCase());
  if (game.time) infoParts.push(game.time);

  if (infoParts.length > 0) {
    const infoLine = infoParts.join(' - ');
    ctx.font = '600 22px "Inter", sans-serif';    // FONTE DO CAMPEONATO/HORÁRIO (tamanho: 22px)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = config.accent;                // Cor do texto = cor de destaque do tema
    ctx.globalAlpha = 0.85;                       // Opacidade do campeonato/horário
    ctx.fillText(infoLine, centerX, infoY);
    ctx.globalAlpha = 1;
  }

  // ====================================================
  // NOMES DOS TIMES: 2 linhas, o time mais curto recebe "vs"
  // ====================================================
  const nameA = game.teamA || 'Time A';
  const nameB = game.teamB || 'Time B';

  // Time A (casa) sempre na linha 1, Time B (fora) sempre na linha 2
  ctx.font = '800 50px "Outfit", sans-serif';     // FONTE DOS NOMES DOS TIMES (tamanho: 50px)

  let line1 = nameA;
  let line2 = 'vs ' + nameB;

  const namesY = blockTop + 70;                   // POSIÇÃO Y do nome linha 1

  // Largura máxima para truncar nomes longos
  const maxNameW = w - logoSize * 2 - logoPadding * 2 - 20;

  // --- Linha 1: Nome do time mais longo ---
  ctx.font = '800 50px "Outfit", sans-serif';     // FONTE LINHA 1 (tamanho: 50px, peso: 800)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';                       // Cor: branco
  let display1 = truncateText(ctx, line1, maxNameW);
  ctx.fillText(display1, centerX, namesY);

  // --- Linha 2: "vs NomeDoTimeMaisCurto" (mesmo tamanho de fonte) ---
  const vsText = 'vs ';
  const restOfLine2 = line2.slice(3);              // Nome sem o "vs "

  // Medir larguras para centralizar a linha 2
  ctx.font = '600 36px "Inter", sans-serif';       // FONTE DO "vs" (tamanho: 36px)
  const vsWidth = ctx.measureText(vsText).width;
  ctx.font = '800 50px "Outfit", sans-serif';      // FONTE DO NOME NA LINHA 2 (tamanho: 50px)
  const restWidth = ctx.measureText(restOfLine2).width;
  const totalLine2W = vsWidth + restWidth;
  const line2StartX = centerX - totalLine2W / 2;

  // Parte "vs" em cor de destaque
  ctx.font = '600 36px "Inter", sans-serif';       // FONTE DO "vs" (tamanho: 36px, peso: 600)
  ctx.textAlign = 'left';
  ctx.fillStyle = config.accent;                   // Cor do "vs" = cor de destaque
  ctx.globalAlpha = 0.7;                           // Opacidade do "vs"
  ctx.fillText(vsText, line2StartX, namesY + 58);  // ESPAÇAMENTO entre linha 1 e linha 2: 58px
  ctx.globalAlpha = 1;

  // Parte com o nome do time (mesmo tamanho que linha 1)
  ctx.font = '800 50px "Outfit", sans-serif';      // FONTE DO NOME LINHA 2 (tamanho: 50px, peso: 800)
  ctx.fillStyle = 'rgba(255,255,255,0.9)';         // Cor: branco 90% opacidade
  ctx.fillText(restOfLine2, line2StartX + vsWidth, namesY + 58);

  // --- Seção de Odds (parte inferior do bloco centralizado) ---
  const oddsY = blockTop + 203;                    // Base para rótulos (+5) e valores (+70)
  drawOddsSection(ctx, x, oddsY, w, game, config);

  ctx.restore();
}

// ===== LOGO DO TIME (sem borda circular) =====
function drawLogo(ctx, cx, cy, size, logo, config) {
  ctx.save();

  if (logo) {
    // Desenhar logo diretamente (sem recorte circular, sem borda)
    ctx.drawImage(logo, cx - size / 2, cy - size / 2, size, size);
  } else {
    // Placeholder sutil quando não tem logo
    ctx.font = `${Math.round(size * 0.45)}px sans-serif`; // TAMANHO DO ÍCONE PLACEHOLDER
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; // Cor do placeholder
    ctx.fillText('🛡️', cx, cy);
  }

  ctx.restore();
}

// ===== TRUNCAR TEXTO (adiciona "…" se ultrapassar largura máxima) =====
function truncateText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let truncated = text;
  while (ctx.measureText(truncated + '…').width > maxW && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

// ===== SEÇÃO DE ODDS (CASA / EMPATE / FORA) =====
function drawOddsSection(ctx, cardX, y, cardW, game, config) {
  ctx.save();

  // --- Linha separadora acima das odds (centralizada entre nomes e odds) ---
  const sepY = y - 30; // POSIÇÃO da linha separadora (centralizada entre nomes e odds)
  const lineGrad = ctx.createLinearGradient(cardX + 30, sepY, cardX + cardW - 30, sepY);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.2, 'rgba(255,255,255,0.08)');
  lineGrad.addColorStop(0.8, 'rgba(255,255,255,0.08)');
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1; // Espessura da linha separadora
  ctx.beginPath();
  ctx.moveTo(cardX + 30, sepY);
  ctx.lineTo(cardX + cardW - 30, sepY);
  ctx.stroke();

  // Dados das odds
  const odds = [
    { label: 'CASA', value: game.oddHome },
    { label: 'EMPATE', value: game.oddDraw },
    { label: 'FORA', value: game.oddAway },
  ];

  const sectionW = cardW / 3; // Largura de cada seção de odd

  odds.forEach((odd, i) => {
    const cx = cardX + sectionW * i + sectionW / 2;

    // --- Rótulo da odd (CASA / EMPATE / FORA) ---
    ctx.font = '600 20px "Inter", sans-serif';    // FONTE DO RÓTULO (tamanho: 20px)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';      // Cor do rótulo (branco 40%)
    ctx.fillText(odd.label, cx, y + 5);            // Posição Y do rótulo das odds

    // --- Valor da odd (número) ---
    ctx.font = '800 64px "Outfit", sans-serif';   // FONTE DO VALOR DA ODD (tamanho: 64px)
    ctx.fillStyle = config.accent;                 // Cor do valor = cor de destaque
    ctx.shadowColor = config.accent;               // Sombra com cor de destaque
    ctx.shadowBlur = 18;                           // Intensidade do brilho da sombra
    ctx.fillText(odd.value || '-', cx, y + 70);    // Posição Y do valor (65px abaixo do rótulo)
    ctx.shadowBlur = 0;
  });

  ctx.restore();
}

// ===== ESTADO VAZIO (quando não tem jogos) =====
function drawEmptyState(ctx, W, H) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Ícone de bola
  ctx.font = '60px sans-serif'; // TAMANHO DO ÍCONE (60px)
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillText('⚽', W / 2, H / 2 - 40);

  // Mensagem
  ctx.font = '500 24px "Inter", sans-serif'; // FONTE DA MENSAGEM (tamanho: 24px)
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText('Adicione jogos para gerar a arte', W / 2, H / 2 + 40);

  ctx.restore();
}

// ===== RODAPÉ (linha decorativa inferior) =====
function drawFooter(ctx, W, H, config, footerY, footerW, footerH, padX) {
  if (!footerImage || footerH === 0) return;

  ctx.save();

  // Bordas arredondadas para a imagem do rodapé
  const radius = 12;
  roundedRect(ctx, padX, footerY, footerW, footerH, radius);
  ctx.clip();

  // Desenhar imagem do banner no rodapé
  ctx.drawImage(footerImage, padX, footerY, footerW, footerH);

  ctx.restore();
}

// ===== UTILITÁRIOS =====

// Desenhar retângulo com bordas arredondadas
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Formatar data como DD/MM/AAAA
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export { formatDate };
