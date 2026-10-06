// ============================================================
// EXEMPLO REFORÇADO da função "log-evento" (Supabase Edge Function)
// ============================================================
// Antes de trocar a sua: compare com a função atual. Se o segredo do seu
// webhook do Discord tiver outro nome, mude em DISCORD_WEBHOOK_URL abaixo.
//
// O que ela faz de diferente:
//  - só aceita POST com JSON pequeno;
//  - só aceita tipos de evento conhecidos;
//  - corta textos grandes e impede @everyone / @menções no Discord;
//  - limita a quantidade de eventos por IP (anti-spam);
//  - opcional: só aceita pedidos vindos do seu site (ORIGENS_PERMITIDAS).
//
// Segredos (rode no terminal, uma vez):
//   supabase secrets set DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
//   supabase secrets set ORIGENS_PERMITIDAS="https://seusite.com"   (opcional)
// Deploy:
//   supabase functions deploy log-evento --no-verify-jwt

const WEBHOOK = Deno.env.get("DISCORD_WEBHOOK_URL") ?? "";
const ORIGENS = (Deno.env.get("ORIGENS_PERMITIDAS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const TIPOS_PERMITIDOS = new Set([
  "cadastro_ok",
  "cadastro_duplicado",
  "login_ok",
  "login_falhou",
  "sessao_restaurada",
  "checkin",
  "peso_salvo",
  "carga_salva",
  "erro_supabase",
  "erro_fetch",
]);

const LIMITE_POR_MINUTO = 20;
const TAMANHO_MAXIMO_BYTES = 2000;
const acessos = new Map<string, { inicio: number; total: number }>();

function excedeuLimite(ip: string): boolean {
  const agora = Date.now();
  const atual = acessos.get(ip);
  if (!atual || agora - atual.inicio > 60_000) {
    acessos.set(ip, { inicio: agora, total: 1 });
    return false;
  }
  atual.total += 1;
  return atual.total > LIMITE_POR_MINUTO;
}

// Texto curto e sem @ (evita mencionar alguém no Discord)
function limpar(valor: unknown, max = 200): string {
  return String(valor ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/@/g, "@\u200b")
    .slice(0, max);
}

function cabecalhos(origem: string | null): Record<string, string> {
  const permitida = ORIGENS.length === 0 ? "*" : (origem && ORIGENS.includes(origem) ? origem : ORIGENS[0]);
  return {
    "Access-Control-Allow-Origin": permitida,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origem = req.headers.get("origin");
  const cors = cabecalhos(origem);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("método não permitido", { status: 405, headers: cors });

  if (ORIGENS.length > 0 && (!origem || !ORIGENS.includes(origem))) {
    return new Response("origem não permitida", { status: 403, headers: cors });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "desconhecido").split(",")[0].trim();
  if (excedeuLimite(ip)) return new Response("muitos pedidos", { status: 429, headers: cors });

  let corpo: Record<string, unknown>;
  try {
    const texto = await req.text();
    if (texto.length > TAMANHO_MAXIMO_BYTES) {
      return new Response("pedido grande demais", { status: 413, headers: cors });
    }
    corpo = JSON.parse(texto);
  } catch (_) {
    return new Response("json inválido", { status: 400, headers: cors });
  }

  const tipo = limpar(corpo?.tipo, 40);
  if (!TIPOS_PERMITIDOS.has(tipo)) {
    return new Response("tipo desconhecido", { status: 400, headers: cors });
  }
  if (!WEBHOOK) return new Response("webhook não configurado", { status: 500, headers: cors });

  const linhas = [`**${tipo}**`];
  for (const campo of ["nome", "email", "detalhe", "user_id"]) {
    if (corpo[campo] !== undefined && corpo[campo] !== null && corpo[campo] !== "") {
      linhas.push(`${campo}: ${limpar(corpo[campo])}`);
    }
  }

  const resposta = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: linhas.join("\n").slice(0, 1900),
      allowed_mentions: { parse: [] }, // nunca menciona ninguém
    }),
  });

  return new Response(resposta.ok ? "ok" : "falha ao enviar", {
    status: resposta.ok ? 200 : 502,
    headers: cors,
  });
});
