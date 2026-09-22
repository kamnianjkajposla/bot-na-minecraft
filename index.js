const mineflayer = require('mineflayer');
const http = require('http');
const { goals, Movements } = require('mineflayer-pathfinder');
const pathfinder = require('mineflayer-pathfinder').pathfinder;

// --- 1. PROSTY SERWER HTTP DLA RENDERA ---
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Boty Minecraft działają poprawnie!\n');
});

server.listen(PORT, () => {
  console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`);
});

// --- 2. LISTA 2 BOTÓW Z DYNAMICZNYMI NICKAMI ---
const botConfigs = [
  { username: 'jaandzj', baseName: 'jaandzj', number: 0, isBot2: false },
  { username: '92mismi123', baseName: '92mismi', number: 123, isBot2: true } // Drugi bot z bazowym nickiem i numerem
];

function createBot(config) {
  // Generujemy aktualny nick z uwzględnieniem numeru (jeśli dostał bana)
  const currentUsername = config.number > 0 ? `${config.baseName}${config.number}` : config.baseName;

  const bot = mineflayer.createBot({
    host: 'blokskraft.aternos.me',
    port: 50703,
    username: currentUsername,
    version: false
  });

  if (config.isBot2) {
    bot.loadPlugin(pathfinder);
  }

  bot.on('spawn', () => {
    console.log(`✅ Bot [${currentUsername}] pomyślnie dołączył do serwera!`);

    // Logowanie / Rejestracja
    setTimeout(() => {
      bot.chat('/register TwojeHaslo123');
    }, 3000);

    setTimeout(() => {
      bot.chat('/login TwojeHaslo123');
    }, 6000);

    // Zachowanie po starcie
    setTimeout(() => {
      if (config.isBot2) {
        console.log(`[${currentUsername}] Wykonuję /rtp...`);
        bot.chat('/rtp');
        startBot2Behavior(bot);
      } else {
        startAntiAfk(bot);
      }
    }, 10000);
  });

  // Obsługa śmierci / respawnu dla drugiego bota
  bot.on('respawn', () => {
    if (config.isBot2) {
      console.log(`[${currentUsername}] Bot zginął! Odrodził się i wykonuje /rtp...`);
      setTimeout(() => {
        bot.chat('/rtp');
      }, 3000);
    }
  });

  bot.on('end', (reason) => {
    console.log(`❌ Bot [${currentUsername}] został rozłączony. Powód: ${reason}`);

    // Sprawdzamy, czy powód rozłączenia to ban / wyrzucenie
    const reasonStr = String(reason).toLowerCase();
    if (reasonStr.includes('ban') || reasonStr.includes('banned') || reasonStr.includes('kick') || reasonStr.includes('disconnected')) {
      config.number += 1; // Zwiększamy liczbę w nicku, żeby ominąć bana!
      console.yk?.(`🔄 Wykryto bana/wyrzucenie! Zmieniam nick na nowy numer i wchodzę jako: ${config.baseName}${config.number}`);
    }

    console.log(`🔄 Ponowne łączenie za 30 sekund...`);
    setTimeout(() => {
      createBot(config);
    }, 30000);
  });

  bot.on('error', (err) => {
    console.log(`⚠️ Błąd bota [${currentUsername}]:`, err);
  });
}

// Zwykły anty-AFK dla pierwszego bota
function startAntiAfk(bot) {
  setInterval(async () => {
    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 3.14;
      const pitch = (Math.random() - 0.5) * 0.8;
      await bot.look(yaw, pitch, true);

      const kierunki = ['forward', 'back', 'left', 'right'];
      const wybranyKierunek = kierunki[Math.floor(Math.random() * kierunki.length)];
      bot.setControlState(wybranyKierunek, true);
      if (Math.random() > 0.5) bot.setControlState('jump', true);

      await sleep(1500);
      bot.setControlState(wybranyKierunek, false);
      bot.setControlState('jump', false);
    } catch (e) {}
  }, 7000);
}

// Zaawansowane zachowanie dla Drugiego Bota
function startBot2Behavior(bot) {
  setInterval(async () => {
    try {
      // 1. Sprawdzanie poziomu głodu / jedzenia
      if (bot.food < 16) {
        const foodItem = bot.inventory.items().find(item => item.name.includes('beef') || item.name.includes('pork') || item.name.includes('bread') || item.name.includes('mutton') || item.name.includes('chicken'));
        if (foodItem) {
          try {
            await bot.equip(foodItem, 'hand');
            await bot.consume();
            console.log(`[${bot.username}] Zjadłem jedzenie, aby uzupełnić głód.`);
          } catch (err) {}
        }
      }

      // 2. Szukanie mobów w pobliżu do zaatakowania
      const filter = entity => entity.type === 'mob' && entity.position.distanceTo(bot.entity.position) < 6;
      const mob = bot.nearestEntity(filter);

      if (mob) {
        bot.attack(mob);
      } else {
        const yaw = bot.entity.yaw + (Math.random() - 0.5) * 3.14;
        const pitch = (Math.random() - 0.5) * 0.8;
        await bot.look(yaw, pitch, true);

        const kierunki = ['forward', 'back', 'left', 'right'];
        const wybranyKierunek = kierunki[Math.floor(Math.random() * kierunki.length)];
        bot.setControlState(wybranyKierunek, true);
        if (Math.random() > 0.4) bot.setControlState('jump', true);

        await sleep(2000);
        bot.setControlState(wybranyKierunek, false);
        bot.setControlState('jump', false);
      }

    } catch (e) {}
  }, 5000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- 3. URUCHOMIENIE DWÓCH BOTÓW ---
botConfigs.forEach((config, index) => {
  setTimeout(() => {
    createBot(config);
  }, index * 4000);
});
