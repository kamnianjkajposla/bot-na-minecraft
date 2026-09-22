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
    port: 50703,                   // Port serwera (pamiętaj o zmianie, jeśli Aternos go zmieni)
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

    // Krok 3: Uruchomienie aktywnego chodzenia po 10 sekundach
    setTimeout(() => {
      console.log('Rozpoczynam dynamiczny ruch anty-AFK...');
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

// Bardziej dynamiczna funkcja anty-AFK (chodzi w różne strony, skacze i obraca się)
function startAntiAfk(bot) {
  setInterval(async () => {
    try {
      // 1. Losowy obrót głowy (rozglądanie się wokol)
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 3.14; // losowy kąt obrotu
      const pitch = (Math.random() - 0.5) * 0.8; // delikatnie góra/dół
      await bot.look(yaw, pitch, true);

      // 2. Losowy wybór kierunku ruchu (przód, tył, lewo, prawo lub kombinacje)
      const kierunki = ['forward', 'back', 'left', 'right'];
      const wybranyKierunek = kierunki[Math.floor(Math.random() * kierunki.length)];
      const czasRuchu = Math.floor(Math.random() * 2000) + 1000; // od 1 do 3 sekund ruchu

      // Włączamy ruch w losowym kierunku
      bot.setControlState(wybranyKierunek, true);
      
      // Czasami w trakcie ruchu dodajmy skok
      if (Math.random() > 0.5) {
        bot.setControlState('jump', true);
      }

      // Czekamy chwilę, gdy bot idzie
      await sleep(czasRuchu);

      // Wyłączamy ruchy
      bot.setControlState(wybranyKierunek, false);
      bot.setControlState('jump', false);

    } catch (e) {
      console.log('Błąd podczas dynamicznego anty-AFK:', e);
    }
  }, 7000); // Wykonuje nową akcję losową co 7 sekund
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

createBot();
