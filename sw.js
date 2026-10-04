// Troque este número a cada vez que publicar uma mudança (v10 -> v11 -> v12...)
const CACHE = "academia-v15";

const ARQUIVOS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/logo.png",
  "/logosite.png",
  "/icones/icon-192.png"
];

// Instala e já guarda os arquivos principais
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ARQUIVOS))
      .catch(() => {})
  );
  self.skipWaiting();
});

// Apaga caches antigos (academia-v9 etc.) e assume o controle
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Botão "Atualizar" do aviso de nova versão
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Sempre tenta a internet primeiro (pega a versão nova);
// só usa o cache se estiver sem conexão.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e CDN passam direto

  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok && ARQUIVOS.includes(url.pathname)) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => r || caches.match("/index.html"))
      )
  );
});
