const mineflayer = require('mineflayer');
const http = require('http');

// --- 1. PROSTY SERWER HTTP DLA RENDERA (wystarczy jeden dla wszystkich botów) ---
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Boty Minecraft działają poprawnie!\n');
});

server.listen(PORT, () => {
  console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`);
});

// --- 2. LISTA NICKÓW BOTÓW (Tutaj wpisz od 1 do 3 graczy) ---
const botUsernames = [
  'jaandzj',   // Pierwszy bot
  '132miisjaned22_732',  // Drugi bot (zmień na dowolny nick)
  'oo00-partro_misi2'  // Trzeci bot (zmień na dowolny nick)
];

// Główna funkcja tworząca pojedynczego bota
function createBot(username) {
  const bot = mineflayer.createBot({
    host: 'blokskraft.aternos.me', // Adres serwera
    port: 50703,                   // Port serwera
    username: username,            // Nick aktualnego bota z listy
    version: false                 // Automatyczna wersja
  });

  bot.on('spawn', () => {
    console.log(`✅ Bot [${username}] pomyślnie dołączył do serwera!`);

    // Krok 1: Wpisanie komendy REJESTRACJI po 3 sekundach
    setTimeout(() => {
      bot.chat(`/register TwojeHaslo123`); // Zmień hasło na swoje
    }, 3000);

    // Krok 2: Wpisanie komendy LOGOWANIA po 6 sekundach
    setTimeout(() => {
      bot.chat(`/login TwojeHaslo123`); // Zmień hasło na swoje
    }, 6000);

    // Krok 3: Uruchomienie ruchu anty-AFK po 10 sekundach
    setTimeout(() => {
      startAntiAfk(bot, username);
    }, 10000);
  });

  bot.on('chat', (sender, message) => {
    if (sender === bot.username) return;
  });

  bot.on('end', (reason) => {
    console.log(`❌ Bot [${username}] został rozłączony. Powód: ${reason}. Ponawiam za 30s...`);
    setTimeout(() => {
      createBot(username); // Ponowne połączenie dla tego konkretnego bota
    }, 30000);
  });

  bot.on('error', (err) => {
    console.log(`⚠️ Błąd bota [${username}]:`, err);
  });
}

// Funkcja odpowiedzialna za chodzenie i skakanie dla każdego bota
function startAntiAfk(bot, username) {
  setInterval(async () => {
    try {
      // Losowy obrót głowy
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 3.14;
      const pitch = (Math.random() - 0.5) * 0.8;
      await bot.look(yaw, pitch, true);

      // Losowy kierunek ruchu
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
      // Ignorujemy pomniejsze błędy ruchu
    }
  }, 7000); // Wykonaj ruch co 7 sekund
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- 3. URUCHOMIENIE WSZYSTKICH BOTÓW Z LISTY ---
botUsernames.forEach((name, index) => {
  // Każdy bot wchodzi z 3-sekundowym opóźnieniem, żeby nie spamować serwera naraz
  setTimeout(() => {
    createBot(name);
  }, index * 3000);
});
