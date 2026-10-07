// Versão do cache. Você NÃO precisa mexer aqui à mão:
// rode `python atualizar_versao.py` antes de publicar (ele troca este número e o ?v= do index.html juntos).
const CACHE = "academia-v19";

// Tudo é relativo à pasta onde este arquivo está (funciona na raiz do site ou numa subpasta)
const BASE = self.registration.scope;
const aqui = (caminho) => new URL(caminho, BASE).href;

const ARQUIVOS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "logo.png",
  "logosite.png",
  "icones/icon-192-v2.png",
  "icones/icon-512-v2.png"
].map(aqui);

const CAMINHOS = ARQUIVOS.map((u) => new URL(u).pathname);
const CAMINHO_INDICE = new URL("exercicios/indice.json", BASE).pathname;

// Instala e já guarda os arquivos principais.
// Um por um: se algum faltar (ex.: um ícone), os outros continuam salvos.
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(ARQUIVOS.map((u) => c.add(u))))
  );
  self.skipWaiting();
});

// Apaga caches antigos e assume o controle
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
// O índice de exercícios também é guardado, pra aba Exercícios abrir offline.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e CDN passam direto

  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok && (CAMINHOS.includes(url.pathname) || url.pathname === CAMINHO_INDICE)) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((r) => {
          if (r) return r;
          return req.mode === "navigate" ? caches.match(aqui("index.html")) : Response.error();
        })
      )
  );
});
