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

// Przechowywanie danych o aktywnych botach i ich widoku (obrazu)
let activeBotsInfo = [];

// --- 1. INTERAKTYWNA STRONA INTERNETOWA (PANEL STEROWANIA) ---
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // Obsługa akcji ze strony (formularze lub komendy sterujące)
  if (req.method === 'POST' || pathname.startsWith('/action/')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      
      // Zmiana konfiguracji głównej
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
      // Ręczne sterowanie botem ze strony
      else if (pathname.startsWith('/action/')) {
        const parts = pathname.split('/');
        const botIndex = parseInt(parts[2]);
        const action = parts[3]; // np. forward, jump, attack, rtp, chat
        
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

  // Wyświetlanie strony HTML
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
          container.innerHTML = '<p style="color: gray;">Generowanie obrazu z widoku bota...</p>';
          
          // Symulacja pobrania widoku lub wskaźnika świata z bota
          setTimeout(() => {
            container.innerHTML = '<div style="background: #222; color: #0f0; padding: 15px; border-radius: 5px; font-family: monospace;">[Widok Kamery Bota: Pozycja aktywna, brak renderera graficznego WebGL w trybie konsolowym render. Bot widzi otoczenie wokół siebie (bloki/moby w promieniu 16 bloków)].</div>';
          }, 800);
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
    const baseName = i === 0 ? 'jaandzj' : `bot_user_${i + 1}`;
    
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

      setTimeout(() => { bot.chat('/register TwojeHaslo123 TwojeHaslo123'); }, 3000);
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

      // Automatyczne dołączenie po 1 sekundzie!
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
