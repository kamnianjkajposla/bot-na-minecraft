const mineflayer = require('mineflayer');
const http = require('http');

// --- 1. PROSTY SERWER HTTP DLA RENDERA ---
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Boty Minecraft działają poprawnie!\n');
});

server.listen(PORT, () => {
  console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`);
});

// --- 2. LISTA 2 BOTÓW ---
const botUsernames = [
  'jaandzj',       // Pierwszy bot
  '92mismi123'   // Drugi bot (możesz zmienić ten nick na jaki chcesz)
];

// Funkcja tworząca pojedynczego bota
function createBot(username) {
  const bot = mineflayer.createBot({
    host: 'blokskraft.aternos.me', // Adres serwera
    port: 50703,                   // Port serwera (zmień, jeśli Aternos zmieni)
    username: username,            // Nick aktualnego bota
    version: false                 // Automatyczna wersja
  });

  bot.on('spawn', () => {
    console.log(`✅ Bot [${username}] pomyślnie dołączył do serwera!`);

    // Krok 1: Wpisanie komendy REJESTRACJI po 3 sekundach
    setTimeout(() => {
      bot.chat('/register TwojeHaslo123'); // Zmień hasło na swoje
    }, 3000);

    // Krok 2: Wpisanie komendy LOGOWANIA po 6 sekundach
    setTimeout(() => {
      bot.chat('/login TwojeHaslo123'); // Zmień hasło na swoje
    }, 6000);

    // Krok 3: Uruchomienie ruchu anty-AFK po 10 sekundach
    setTimeout(() => {
      startAntiAfk(bot);
    }, 10000);
  });

  bot.on('chat', (sender, message) => {
    if (sender === bot.username) return;
  });

  bot.on('end', (reason) => {
    console.log(`❌ Bot [${username}] został rozłączony. Powód: ${reason}. Ponawiam za 30s...`);
    setTimeout(() => {
      createBot(username);
    }, 30000);
  });

  bot.on('error', (err) => {
    console.log(`⚠️ Błąd bota [${username}]:`, err);
  });
}

// Funkcja ruchu anty-AFK (chodzenie i skakanie)
function startAntiAfk(bot) {
  setInterval(async () => {
    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 3.14;
      const pitch = (Math.random() - 0.5) * 0.8;
      await bot.look(yaw, pitch, true);

      const kierunki = ['forward', 'back', 'left', 'right'];
      const wybranyKierunek = kierunki[Math.floor(Math.random() * kierunki.length)];
      const czasRuchu = Math.floor(Math.random() * 2000) + 1000;

      bot.setControlState(wybranyKierunek, true);
      if (Math.random() > 0.5) {
        bot.setControlState('jump', true);
      }

      await sleep(czasRuchu);

      bot.setControlState(wybranyKierunek, false);
      bot.setControlState('jump', false);
    } catch (e) {
      // Ignorujemy błędy ruchu
    }
  }, 7000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- 3. URUCHOMIENIE DWÓCH BOTÓW Z OPRÓŻNIENIEM STARTU ---
botUsernames.forEach((name, index) => {
  // Drugi bot wchodzi 4 sekundy po pierwszym, żeby Aternos ich nie odrzucił za nagły ruch
  setTimeout(() => {
    createBot(name);
  }, index * 4000);
});
