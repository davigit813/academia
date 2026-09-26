// Nome do cache (muda a versão pra forçar atualização)
const CACHE_NAME = "academia-v2";

// Arquivos que vão ficar em cache (pra funcionar offline)
const ARQUIVOS_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/logo.png",
  "/logosite.png",
  "/manifest.json"
];

// ====== INSTALAÇÃO: guarda os arquivos em cache ======
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

// ====== ATIVAÇÃO: limpa caches antigos ======
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) => {
      return Promise.all(
        nomes.map((nome) => {
          if (nome !== CACHE_NAME) {
            return caches.delete(nome);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ====== FETCH: serve do cache, senão busca da rede ======
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Não intercepta requisições pro Supabase, Google Fonts e CDN
  if (
    url.includes("supabase.co") ||
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com") ||
    url.includes("cdn.jsdelivr.net")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((resposta) => {
      if (resposta) return resposta;

      return fetch(event.request).then((respostaRede) => {
        if (!respostaRede || respostaRede.status !== 200) {
          return respostaRede;
        }

        const respostaClone = respostaRede.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, respostaClone);
        });

        return respostaRede;
      });
    })
  );
});

// ====== RESPONDE AO PEDIDO DE SKIP_WAITING (vindo do frontend) ======
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});