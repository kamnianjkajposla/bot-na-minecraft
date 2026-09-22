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
      bot.chat('/register TwojeHaslo123'); // <-- Zmień hasło na swoje
    }, 3000);

    // Krok 2: Wpisanie komendy LOGOWANIA po 6 sekundach
    setTimeout(() => {
      console.log('Wysyłam komendę logowania...');
      bot.chat('/login TwojeHaslo123'); // <-- Zmień hasło na swoje
    }, 6000);

    // Krok 3: Uruchomienie chodzenia i skakania (anty-AFK w obrębie 11 bloków) po 10 sekundach
    setTimeout(() => {
      console.log('Rozpoczynam aktywność anty-AFK (chodzenie i skakanie)...');
      startAntiAfk(bot);
    }, 10000);
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

// Funkcja anty-AFK: skakanie, obroty i chodzenie w bezpiecznym obrębie
function startAntiAfk(bot) {
  setInterval(async () => {
    try {
      // Losujemy akcję: 0 = przód/tył, 1 = boki, 2 = skok z obrotem
      const akcja = Math.floor(Math.random() * 3);

      if (akcja === 0) {
        // Chodzenie przód i tył
        bot.setControlState('forward', true);
        await sleep(1500);
        bot.setControlState('forward', false);
        
        bot.setControlState('back', true);
        await sleep(1500);
        bot.setControlState('back', false);
      } 
      else if (akcja === 1) {
        // Chodzenie w boki (lewo/prawo)
        bot.setControlState('left', true);
        await sleep(1000);
        bot.setControlState('left', false);

        bot.setControlState('right', true);
        await sleep(1000);
        bot.setControlState('right', false);
      } 
      else {
        // Skakanie połączone z lekkim obrotem głowy
        bot.setControlState('jump', true);
        
        // Zmiana kierunku patrzenia (obrót głowy)
        const yaw = bot.entity.yaw + (Math.random() - 0.5) * 2;
        const pitch = (Math.random() - 0.5) * 0.5;
        await bot.look(yaw, pitch, true);

        await sleep(800);
        bot.setControlState('jump', false);
      }

    } catch (e) {
      console.log('Błąd podczas anty-AFK:', e);
    }
  }, 10000); // Wykonuj losową akcję co 10 sekund
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

createBot();
