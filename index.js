const mineflayer = require('mineflayer');
const http = require('http');

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Minecraft działa poprawnie!\n');
});

server.listen(PORT, () => {
  console.log(`Serwer HTTP nasłuchuje na porcie ${PORT}`);
});

function createBot() {
  const bot = mineflayer.createBot({
    host: 'blokskraft.aternos.me:',        // <-- TUTAJ wpisz adres serwera (np. mojserwer.aternos.me)
    port: 50703,                         // <-- TUTAJ wpisz port serwera (zazwyczaj 25565)
    username: 'jaandzejmisi',        // <-- TUTAJ wpisz nick bota w grze
    version: false                       // false = automatyczna detekcja wersji
  });

  bot.on('spawn', () => {
    console.log('✅ Bot pomyślnie dołączył do serwera Minecraft!');
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

createBot();
