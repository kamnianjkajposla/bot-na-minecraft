const mineflayer = require('mineflayer');
const http = require('http');

// --- 1. PROSTY SERWER HTTP DLA RENDERA ---
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Minecraft działa poprawnie!\n');
});

server.listen(PORT, () => {
  console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`);
});

// --- 2. LOGIKA BOTA MINECRAFT ---
function createBot() {
  const bot = mineflayer.createBot({
    host: 'blokskraft.aternos.me', // Adres serwera
    port: 50703,                   // Port serwera
    username: 'jaandzj',           // Nick bota
    version: false                 // Automatyczna wersja
  });

  bot.on('spawn', () => {
    console.log('✅ Bot pomyślnie dołączył do serwera Minecraft!');

    // Krok 1: Wpisanie komendy REJESTRACJI po 3 sekundach
    setTimeout(() => {
      console.log('Wysyłam komendę rejestracji...');
      bot.chat('/register TwojeHaslo123 '); // <-- Zmień hasło na swoje
    }, 3000);

    // Krok 2: Wpisanie komendy LOGOWANIA po 6 sekundach (w razie gdyby był już zarejestrowany)
    setTimeout(() => {
      console.log('Wysyłam komendę logowania...');
      bot.chat('/login TwojeHaslo123'); // <-- Zmień hasło na swoje
    }, 6000);

    // Krok 3: Uruchomienie chodzenia (anty-AFK) po 9 sekundach
    setTimeout(() => {
      console.log('Rozpoczynam poruszanie się (anty-AFK)...');
      startAntiAfk(bot);
    }, 9000);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[Czat] ${username}: ${message}`);
  });

  bot.on('end', (reason) => {
    console.log(`❌ Bot został rozłączony. Powód: ${reason}`);
    console.log('🔄 Ponowne łączenie za 30 sekund...');
    setTimeout(createBot, 30000); 
  });

  bot.on('error', (err) => {
    console.log('⚠️ Wystąpił błąd bota:', err);
  });
}

// Funkcja odpowiedzialna za chodzenie (przód, tył, boki)
function startAntiAfk(bot) {
  setInterval(async () => {
    try {
      // 1. Idź do przodu (2 bloki)
      bot.setControlState('forward', true);
      await sleep(2000);
      bot.setControlState('forward', false);

      // 2. Idź do tyłu (2 bloki)
      bot.setControlState('back', true);
      await sleep(2000);
      bot.setControlState('back', false);

      // 3. Idź w lewo
      bot.setControlState('left', true);
      await sleep(1000);
      bot.setControlState('left', false);

      // 4. Idź w prawo
      bot.setControlState('right', true);
      await sleep(1000);
      bot.setControlState('right', false);

    } catch (e) {
      console.log('Błąd podczas ruchu anty-AFK:', e);
    }
  }, 15000); // Powtarzaj co 15 sekund
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

createBot();
