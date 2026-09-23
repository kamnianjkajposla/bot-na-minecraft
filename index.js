const mineflayer = require('mineflayer');
const http = require('http');
const { goals, Movements } = require('mineflayer-pathfinder');
const pathfinder = require('mineflayer-pathfinder').pathfinder;

// --- KONFIGURACJA GLOBALNA ---
let serverConfig = {
  host: 'blokskraft.aternos.me',
  port: 50703,
  botCount: 2
};

// Przechowywanie danych o aktywnych botach
let activeBotsInfo = [];

// --- 1. INTERAKTYWNA STRONA INTERNETOWA (PANEL STEROWANIA) ---
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // Obsługa żądań obrazu (widoku z oczu bota)
  if (pathname.startsWith('/bot-view/')) {
    const parts = pathname.split('/');
    const botIndex = parseInt(parts[2]);
    const targetBotObj = activeBotsInfo[botIndex];

    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });

    let botName = targetBotObj ? targetBotObj.username : 'Nieznany';
    let health = targetBotObj ? targetBotObj.health : 20;
    let food = targetBotObj ? targetBotObj.food : 20;
    let online = targetBotObj ? targetBotObj.online : false;

    // Generowanie dynamicznego SVG jako "widok z oczu bota"
    const svgContent = `
      <svg width="400" height="250" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${online ? '#4a90e2' : '#333'};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${online ? '#b0c4de' : '#111'};stop-opacity:1" />
          </linearGradient>
          <linearGradient id="ground" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${online ? '#2e8b57' : '#222'};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${online ? '#1b4d3e' : '#050505'};stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Niebo -->
        <rect width="400" height="150" fill="url(#sky)" />
        <!-- Ziemia / Podłoże -->
        <y rect x="0" y="150" width="400" height="100" fill="url(#ground)" />
        <rect x="0" y="150" width="400" height="100" fill="url(#ground)" />
        
        <!-- Horyzont / Dekoracje blokowe -->
        ${online ? `
          <rect x="50" y="110" width="40" height="40" fill="#8B4513" stroke="#5c2d0c" />
          <polygon points="40,110 70,70 100,110" fill="#228B22" />
          
          <rect x="280" y="100" width="50" height="50" fill="#696969" stroke="#444" />
          <polygon points="275,100 305,60 335,100" fill="#A9A9A9" />

          <!-- Celownik na środku -->
          <circle cx="200" cy="125" r="3" fill="rgba(255,255,255,0.6)" />
          <line x1="192" y1="125" x2="208" y2="125" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
          <line x1="200" y1="117" x2="200" y2="133" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
        ` : ''}

        <!-- Pasek informacyjny na górze obrazu -->
        <rect x="0" y="0" width="400" height="30" fill="rgba(0,0,0,0.6)" />
        <text x="15" y="20" fill="#fff" font-family="Arial, sans-serif" font-size="12" font-weight="bold">Bot: ${botName} (${online ? '🟢 Online' : '🔴 Offline'})</text>
        <text x="280" y="20" fill="#ff6b6b" font-family="Arial, sans-serif" font-size="12">❤️ ${health} | 🍖 ${food}</text>
      </svg>
    `;
    res.end(svgContent);
    return;
  }

  if (req.method === 'POST' || pathname.startsWith('/action/')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      
      if (pathname === '/') {
        const newHost = params.get('host');
        const newPort = parseInt(params.get('port'));
        const newCount = parseInt(params.get('botCount'));

        if (newHost) serverConfig.host = newHost;
        if (!isNaN(newPort)) serverConfig.port = newPort;
        if (!isNaN(newCount) && newCount >= 1 && newCount <= 5) {
          serverConfig.botCount = newCount;
        }
        restartAllBots();
      } 
      else if (pathname.startsWith('/action/')) {
        const parts = pathname.split('/');
        const botIndex = parseInt(parts[2]);
        const action = parts[3];
        
        const targetBotObj = activeBotsInfo[botIndex];
        if (targetBotObj && targetBotObj.botInstance) {
          const b = targetBotObj.botInstance;
          try {
            if (action === 'forward') { b.setControlState('forward', true); setTimeout(() => b.setControlState('forward', false), 1000); }
            if (action === 'back') { b.setControlState('back', true); setTimeout(() => b.setControlState('back', false), 1000); }
            if (action === 'left') { b.setControlState('left', true); setTimeout(() => b.setControlState('left', false), 1000); }
            if (action === 'right') { b.setControlState('right', true); setTimeout(() => b.setControlState('right', false), 1000); }
            if (action === 'jump') { b.setControlState('jump', true); setTimeout(() => b.setControlState('jump', false), 500); }
            if (action === 'rtp') { b.chat('/rtp'); }
            if (action === 'chat') {
              const msg = params.get('msg');
              if (msg) b.chat(msg);
            }
          } catch(e) {}
        }
      }

      res.writeHead(302, { 'Location': '/' });
      res.end();
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  
  let botsHtml = activeBotsInfo.map((b, index) => `
    <div style="background: ${b.online ? '#d4edda' : '#f8d7da'}; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #ccc;">
      <h3>🤖 Bot: ${b.username}</h3>
      <p><b>Status:</b> ${b.online ? '🟢 Połączony' : '🔴 Rozłączony'} | <b>Zdrowie:</b> ${b.health} HP | <b>Głód:</b> ${b.food}/20</p>
      
      <div style="margin-top: 10px;">
        <button onclick="loadBotImage(${index})" style="background: #007bff; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;">🖼️ Załaduj obraz (widok bota)</button>
        <div id="img-container-${index}" style="margin-top: 10px;"></div>
      </div>

      ${b.online ? `
        <div style="margin-top: 12px; background: #fff; padding: 10px; border-radius: 5px;">
          <b>Sterowanie botem:</b><br>
          <form method="POST" action="/action/${index}/forward" style="display:inline;"><button type="submit">⬆️ Przód</button></form>
          <form method="POST" action="/action/${index}/back" style="display:inline;"><button type="submit">⬇️ Tył</button></form>
          <form method="POST" action="/action/${index}/left" style="display:inline;"><button type="submit">⬅️ Lewo</button></form>
          <form method="POST" action="/action/${index}/right" style="display:inline;"><button type="submit">➡️ Prawo</button></form>
          <form method="POST" action="/action/${index}/jump" style="display:inline;"><button type="submit">🦘 Skok</button></form>
          <form method="POST" action="/action/${index}/rtp" style="display:inline;"><button type="submit" style="background:#ffc107; color:black;">🌀 /rtp</button></form>
          
          <div style="margin-top: 8px;">
            <form method="POST" action="/action/${index}/chat">
              <input type="text" name="msg" placeholder="Napisz coś na czacie jako bot..." style="width: 70%; padding: 4px;">
              <button type="submit" style="background: #17a2b8; padding: 4px 8px;">Wyślij</button>
            </form>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');

  if (!botsHtml) botsHtml = '<p>Brak aktywnych botów...</p>';

  res.end(`
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <title>Panel Sterowania Botami Minecraft</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f9; color: #333; padding: 20px; max-width: 700px; margin: auto; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
        label { display: block; margin-top: 10px; font-weight: bold; }
        input[type="text"], input[type="number"] { width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
        button { background: #28a745; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 14px; margin: 2px; }
        button:hover { opacity: 0.9; }
      </style>
      <script>
        function loadBotImage(index) {
          const container = document.getElementById('img-container-' + index);
          container.innerHTML = '<p style="color: gray;">Pobieranie widoku z kamery bota...</p>';
          // Ładowanie obrazu SVG generowanego przez serwer dla danego bota z unikalnym znacznikiem czasu, by uniknąć cache
          setTimeout(() => {
            container.innerHTML = '<img src="/bot-view/' + index + '?t=' + new Date().getTime() + '" alt="Widok bota" style="border-radius: 5px; border: 1px solid #ccc; max-width: 100%; display: block;" />';
          }, 400);
        }
      </script>
    </head>
    <body>
      <div class="card">
        <h2>🤖 Panel Sterowania Botami Minecraft</h2>
        <form method="POST" action="/">
          <label>Adres Serwera Minecraft (Host):</label>
          <input type="text" name="host" value="${serverConfig.host}" required>

          <label>Port Serwera:</label>
          <input type="number" name="port" value="${serverConfig.port}" required>

          <label>Liczba Botów (1 - 5):</label>
          <input type="number" name="botCount" min="1" max="5" value="${serverConfig.botCount}" required>

          <button type="submit" style="width:100%; background:#28a745; margin-top:15px; padding:12px; font-size:16px;">Zapisz i Restartuj Boty</button>
        </form>
      </div>

      <div class="card">
        <h3>📊 Aktywne Boty i Sterowanie</h3>
        ${botsHtml}
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`Serwer WWW nasłuchuje na porcie ${PORT}`);
});

// --- 2. ZARZĄDZANIE BOTAMI ---
let runningBots = [];

function stopAllBots() {
  runningBots.forEach(bot => {
    try { bot.quit(); } catch(e) {}
  });
  runningBots = [];
  activeBotsInfo = [];
}

function startAllBots() {
  stopAllBots();
  console.log(`🚀 Uruchamiam ${serverConfig.botCount} botów dla ${serverConfig.host}:${serverConfig.port}...`);

  for (let i = 0; i < serverConfig.botCount; i++) {
    // Pierwszy bot: jaandzj, drugi bot: 25faso7a
    const baseName = i === 0 ? 'jaandzj' : (i === 1 ? '25faso7a' : `bot_user_${i + 1}`);
    
    setTimeout(() => {
      createBotInstance(baseName, i === 1);
    }, i * 2000);
  }
}

function restartAllBots() {
  startAllBots();
}

function createBotInstance(baseUsername, isAdvancedBot) {
  let currentNumber = 0;

  function spawnSingle() {
    const username = currentNumber > 0 ? `${baseUsername}${currentNumber}` : baseUsername;
    
    let botInfo = { username, online: false, health: 20, food: 20, botInstance: null };
    activeBotsInfo.push(botInfo);

    const bot = mineflayer.createBot({
      host: serverConfig.host,
      port: serverConfig.port,
      username: username,
      version: false
    });

    botInfo.botInstance = bot;

    if (isAdvancedBot) {
      bot.loadPlugin(pathfinder);
    }

    bot.on('spawn', () => {
      botInfo.online = true;
      console.log(`✅ Bot [${username}] dołączył do serwera!`);

      // Rejestracja i logowanie (jedno hasło)
      setTimeout(() => { bot.chat('/register TwojeHaslo123'); }, 3000);
      setTimeout(() => { bot.chat('/login TwojeHaslo123'); }, 6000);

      setTimeout(() => {
        if (isAdvancedBot) {
          bot.chat('/rtp');
          startAdvancedBehavior(bot, botInfo);
        } else {
          startAntiAfk(bot, botInfo);
        }
      }, 10000);
    });

    bot.on('health', () => {
      botInfo.health = Math.round(bot.health);
      botInfo.food = bot.food;
    });

    bot.on('respawn', () => {
      if (isAdvancedBot) {
        setTimeout(() => { bot.chat('/rtp'); }, 3000);
      }
    });

    bot.on('end', (reason) => {
      botInfo.online = false;
      botInfo.botInstance = null;
      console.log(`❌ Bot [${username}] rozłączony: ${reason}. Ponowne dołączenie za 1 sekundę...`);

      const reasonStr = String(reason).toLowerCase();
      if (reasonStr.includes('ban') || reasonStr.includes('kick')) {
        currentNumber += 1;
      }

      setTimeout(() => {
        spawnSingle();
      }, 1000);
    });

    bot.on('error', (err) => {
      console.log(`⚠️ Błąd bota [${username}]:`, err.message);
    });

    runningBots.push(bot);
  }

  spawnSingle();
}

// Funkcje zachowań automatycznych
function startAntiAfk(bot, botInfo) {
  setInterval(async () => {
    if (!botInfo.online) return;
    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 3.14;
      const pitch = (Math.random() - 0.5) * 0.8;
      await bot.look(yaw, pitch, true);
      const kierunki = ['forward', 'back', 'left', 'right'];
      const wybrany = kierunki[Math.floor(Math.random() * kierunki.length)];
      bot.setControlState(wybrany, true);
      if (Math.random() > 0.5) bot.setControlState('jump', true);
      await sleep(1500);
      bot.setControlState(wybrany, false);
      bot.setControlState('jump', false);
    } catch(e) {}
  }, 7000);
}

function startAdvancedBehavior(bot, botInfo) {
  setInterval(async () => {
    if (!botInfo.online) return;
    try {
      if (bot.food < 16) {
        const food = bot.inventory.items().find(item => item.name.includes('beef') || item.name.includes('bread') || item.name.includes('pork'));
        if (food) {
          await bot.equip(food, 'hand');
          await bot.consume();
        }
      }
      const mob = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 6);
      if (mob) {
        bot.attack(mob);
      } else {
        const yaw = bot.entity.yaw + (Math.random() - 0.5) * 3.14;
        const pitch = (Math.random() - 0.5) * 0.8;
        await bot.look(yaw, pitch, true);
        const kierunki = ['forward', 'back', 'left', 'right'];
        const wybrany = kierunki[Math.floor(Math.random() * kierunki.length)];
        bot.setControlState(wybrany, true);
        if (Math.random() > 0.4) bot.setControlState('jump', true);
        await sleep(2000);
        bot.setControlState(wybrany, false);
        bot.setControlState('jump', false);
      }
    } catch(e) {}
  }, 5000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

startAllBots();
