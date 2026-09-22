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
    host: process.env.MC_HOST,                  
    port: parseInt(process.env.MC_PORT) || 50703, 
    username: process.env.MC_USERNAME || 'jaandzj', 
    version: process.env.MC_VERSION || false      
  });

  bot.on('spawn', () => {
    console.log('✅ Bot pomyślnie dołączył do serwera Minecraft!');

    // Czekamy 3 sekundy (3000 milisekund) po wejściu, żeby serwer zdążył załadować świat i wyświetlić prośbę o logowanie
    setTimeout(() => {
      // Jeśli serwer wymaga rejestracji, bot wpisze /register (zmień hasło na własne)
      // Pamiętaj: hasło musi być w cudzysłowie!
      console.log('Wysyłam komendę rejestracji/logowania...');
      
      // Przykład rejestracji (jeśli bot wchodzi po raz pierwszy):
      bot.chat('/register TwojeHasło123 TwojeHasło123');

      // Opcjonalnie: Jeśli bot jest już zarejestrowany, odkomentuj linijkę poniżej (usuń //), a zakomentuj wyższą:
      // bot.chat('/login TwojeHasło123');

    }, 3000); // Tutaj możesz zmienić czas (np. 5000 = 5 sekund)
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

// Uruchomienie bota
createBot();
