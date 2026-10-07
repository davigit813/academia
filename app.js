// ====== CONFIGURAÇÃO ======
const SUPABASE_URL = "https://pkplgjhfbybvhnfredhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_7K-Y-m8hWqJc_Lctm0ukWw_M5AreP-B";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ====== DATAS: sempre no horário local ======
// (toISOString() usa UTC: no Brasil, depois das 21h ele já devolve o dia seguinte)
function dataLocal(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// ====== SEGURANÇA: neutraliza < > & " ' antes de colocar texto dentro de HTML ======
function escaparHtml(texto) {
  const mapa = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(texto ?? "").replace(/[&<>"']/g, c => mapa[c]);
}

// ============================================================
// ============ TEMA CLARO / ESCURO ===========================
// ============================================================
// O escuro (vermelho/preto) é o padrão. O claro é ativado com data-tema="claro" no <html>.
// A escolha fica salva neste aparelho.
function temaAtual() {
  return document.documentElement.getAttribute("data-tema") === "claro" ? "claro" : "escuro";
}

function aplicarTema(tema, salvar = true) {
  const claro = tema === "claro";

  if (claro) document.documentElement.setAttribute("data-tema", "claro");
  else document.documentElement.removeAttribute("data-tema");

  document.querySelectorAll(".tema-toggle").forEach(btn => {
    btn.setAttribute("aria-checked", claro ? "true" : "false");
  });

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", claro ? "#f6f4f3" : "#14160f");

  if (salvar) {
    try { localStorage.setItem("tema", tema); } catch (_) { /* navegador bloqueou: tudo bem */ }
  }
}

document.querySelectorAll(".tema-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    aplicarTema(temaAtual() === "claro" ? "escuro" : "claro");
  });
});

aplicarTema(temaAtual(), false); // sincroniza botões e barra do navegador com o tema já aplicado

// ====== LOG DE EVENTOS (Discord) ======
// Não bloqueia o fluxo do usuário. Se falhar, ignora.
function logEvento(tipo, dados = {}) {
  supabaseClient.functions
    .invoke("log-evento", { body: { tipo, ...dados } })
    .catch(() => {});
}

// ====== TABELA DE TREINOS ======
const TREINOS = {
  1: "Peito, ombro e tríceps",
  2: "Costas, ombro e bíceps",
  3: "Perna",
  4: "Peito, ombro e tríceps",
  5: "Costas, ombro e bíceps",
  6: "Descanso",
  0: "Descanso"
};

const NOMES_DIAS = {
  0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
  4: "Quinta", 5: "Sexta", 6: "Sábado"
};

// ====== ELEMENTOS ======
const telaAuth = document.getElementById("tela-auth");
const telaApp = document.getElementById("tela-app");
const form = document.getElementById("form");
const nomeInput = document.getElementById("nome");
const campoNome = document.getElementById("campo-nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnAcao = document.getElementById("btn-acao");
const msg = document.getElementById("msg");
const abaLogin = document.getElementById("aba-login");
const abaCadastro = document.getElementById("aba-cadastro");
const btnSeta = document.getElementById("btn-seta");

const inputPeso = document.getElementById("input-peso");
const btnSalvarPeso = document.getElementById("btn-salvar-peso");
const msgPeso = document.getElementById("msg-peso");
const listaHistorico = document.getElementById("lista-historico");
const semHistorico = document.getElementById("sem-historico");

// Progresso
const inputNomeExercicio = document.getElementById("input-nome-exercicio");
const inputCarga = document.getElementById("input-carga");
const btnSalvarCarga = document.getElementById("btn-salvar-carga");
const msgProgresso = document.getElementById("msg-progresso");
const listaProgresso = document.getElementById("lista-progresso");
const semProgresso = document.getElementById("sem-progresso");
const formProgresso = document.getElementById("form-progresso");

let modo = "login";
let musculoProgressoAtivo = null;

// ====== CACHE DO USUÁRIO LOGADO (evita chamar getUser() toda hora) ======
let usuarioAtual = null;

supabaseClient.auth.onAuthStateChange((_event, session) => {
  usuarioAtual = session?.user ?? null;
});

campoNome.style.display = "none";

// ====== EFEITO RIPPLE NOS BOTÕES ======
const prefereMenosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("click", (e) => {
  if (prefereMenosMovimento) return;

  const btn = e.target.closest("button");
  if (!btn || btn.disabled) return;

  const rect = btn.getBoundingClientRect();
  const tamanho = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");

  ripple.className = "ripple-effect";
  ripple.style.width = ripple.style.height = `${tamanho}px`;
  ripple.style.left = `${e.clientX - rect.left - tamanho / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - tamanho / 2}px`;

  btn.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
});

// ====== TROCA DE ABAS (auth) ======
abaLogin.onclick = () => {
  modo = "login";
  abaLogin.classList.add("ativa");
  abaCadastro.classList.remove("ativa");
  btnAcao.textContent = "ENTRAR";
  msg.textContent = "";
  campoNome.style.display = "none";
  senhaInput.autocomplete = "current-password";
};

abaCadastro.onclick = () => {
  modo = "cadastro";
  abaCadastro.classList.add("ativa");
  abaLogin.classList.remove("ativa");
  btnAcao.textContent = "CRIAR CONTA";
  msg.textContent = "";
  campoNome.style.display = "block";
  senhaInput.autocomplete = "new-password";
};

// ====== ENVIO DO FORMULÁRIO ======
form.onsubmit = async (e) => {
  e.preventDefault();
  msg.textContent = "";
  msg.className = "msg";
  btnAcao.disabled = true;
  btnAcao.classList.add("carregando");

  const email = emailInput.value.trim();
  const senha = senhaInput.value;
  const nome = nomeInput.value.trim();

  try {
    if (modo === "cadastro") {
      if (!nome) throw new Error("Preencha o nome.");

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: senha,
        // O nome também fica guardado na conta: se o cadastro em "alunos" falhar,
        // o app refaz isso sozinho na próxima entrada.
        options: { data: { nome } }
      });

      if (error) throw error;

      // Se o Supabase estiver exigindo confirmação de email, ainda não existe sessão
      if (!data.session) {
        msg.className = "msg sucesso";
        msg.textContent = "CONTA CRIADA! CONFIRME SEU EMAIL PARA ENTRAR.";
        logEvento("cadastro_ok", { email, nome });
        return;
      }

      const { error: erroAluno } = await supabaseClient.from("alunos").insert({
        user_id: data.user.id,
        nome: nome
      });

      if (erroAluno) {
        logEvento("erro_supabase", { detalhe: `alunos: ${erroAluno.message}`, user_id: data.user.id });
      }

      // Usa o usuário que já veio do próprio signUp, sem esperar o onAuthStateChange
      usuarioAtual = data.user;

      msg.className = "msg sucesso";
      msg.textContent = "CONTA CRIADA! ENTRANDO...";
      logEvento("cadastro_ok", { email, nome });
      await entrarNoApp(usuarioAtual);

    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha
      });

      if (error) throw error;

      // Usa o usuário que já veio do próprio login, sem esperar o onAuthStateChange
      usuarioAtual = data.user;

      await entrarNoApp(usuarioAtual);
      logEvento("login_ok", { email });
    }

  } catch (err) {
    if (modo === "login") {
      logEvento("login_falhou", { email, detalhe: err.message });
    }
    if (modo === "cadastro" && err.message.includes("already registered")) {
      logEvento("cadastro_duplicado", { email });
    }
    msg.className = "msg erro";
    msg.textContent = traduzErro(err.message);
  } finally {
    btnAcao.disabled = false;
    btnAcao.classList.remove("carregando");
    btnAcao.textContent = modo === "login" ? "ENTRAR" : "CRIAR CONTA";
  }
};

// ====== ENTRAR NO APP ======
async function entrarNoApp(user) {
  user = user || usuarioAtual;
  if (!user) return;

  let { data: aluno } = await supabaseClient
    .from("alunos")
    .select("nome")
    .eq("user_id", user.id)
    .maybeSingle();

  // Se o cadastro em "alunos" tinha falhado antes, refaz agora com o nome guardado na conta
  if (!aluno && user.user_metadata?.nome) {
    const { error: erroCriar } = await supabaseClient
      .from("alunos")
      .insert({ user_id: user.id, nome: user.user_metadata.nome });
    if (!erroCriar) aluno = { nome: user.user_metadata.nome };
  }

  document.getElementById("nome-user").textContent =
    (aluno?.nome || user.email.split("@")[0]).toUpperCase();

  carregarAvatar(user);

  const hoje = new Date().getDay();
  document.getElementById("dia-semana").textContent = NOMES_DIAS[hoje];
  document.getElementById("treino-hoje").textContent = TREINOS[hoje];

  const lista = document.getElementById("lista-semana");
  lista.innerHTML = "";
  [1, 2, 3, 4, 5, 6, 0].forEach(dia => {
    const li = document.createElement("li");
    if (dia === hoje) li.classList.add("hoje");
    li.innerHTML = `
      <span class="dia-nome">${NOMES_DIAS[dia]}</span>
      <span class="dia-treino">${TREINOS[dia]}</span>
    `;
    lista.appendChild(li);
  });

  await atualizarResumoOntem(user.id);
  await atualizarStreak(user.id);
  trocarAba("treino");

  telaAuth.classList.add("escondido");
  telaApp.classList.remove("escondido");
  medirBotaoPeso(); // agora que o app está visível dá pra medir o botão "Meu peso"
}

// ====== TROCA DE ABAS ======
// ====== TROCA DE ABAS ======
async function trocarAba(nome) {
  // Item atual do MEU PESO fica marcado (desktop e mobile)
  document.querySelectorAll(".peso-item").forEach(el => el.classList.remove("ativo"));
  const ehPeso = nome === "addPeso" || nome === "historico" || nome === "grafico";
  if (nome === "addPeso") {
    document.getElementById("btn-add-peso")?.classList.add("ativo");
    document.getElementById("btn-add-peso-mob")?.classList.add("ativo");
  } else if (nome === "historico") {
    document.getElementById("btn-historico")?.classList.add("ativo");
    document.getElementById("btn-historico-mob")?.classList.add("ativo");
  } else if (nome === "grafico") {
    document.getElementById("btn-grafico")?.classList.add("ativo");
    document.getElementById("btn-grafico-mob")?.classList.add("ativo");
  }
  document.getElementById("dropdown-peso")?.classList.toggle("peso-ativo", ehPeso);
  document.getElementById("menu-peso-mob")?.classList.toggle("ativo", ehPeso);

  const abas = {
    treino: document.getElementById("aba-treino"),
    addPeso: document.getElementById("aba-add-peso"),
    historico: document.getElementById("aba-historico"),
    grafico: document.getElementById("aba-grafico"),
    progresso: document.getElementById("aba-progresso"),
    exercicios: document.getElementById("aba-exercicios"),
    semana: document.getElementById("aba-semana"),
    perfil: document.getElementById("aba-perfil")
  };
  const menus = {
    treino: document.getElementById("menu-treino"),
    exercicios: document.getElementById("menu-exercicios"),
    progresso: document.getElementById("menu-progresso"),
    semana: document.getElementById("menu-semana"),
    perfil: document.getElementById("menu-perfil")
  };
  const menusMob = {
    treino: document.getElementById("menu-treino-mob"),
    exercicios: document.getElementById("menu-exercicios-mob"),
    progresso: document.getElementById("menu-progresso-mob"),
    semana: document.getElementById("menu-semana-mob"),
    perfil: document.getElementById("menu-perfil-mob")
  };

  Object.values(abas).forEach(el => el.classList.add("escondido"));
  Object.values(menus).forEach(el => el.classList.remove("ativo"));
  Object.values(menusMob).forEach(el => el.classList.remove("ativo"));

  if (nome === "treino") {
    abas.treino.classList.remove("escondido");
    menus.treino.classList.add("ativo");
    menusMob.treino.classList.add("ativo");
  } else if (nome === "addPeso") {
    abas.addPeso.classList.remove("escondido");
  } else if (nome === "historico") {
    abas.historico.classList.remove("escondido");
  } else if (nome === "grafico") {
    abas.grafico.classList.remove("escondido");
    renderGrafico();
  } else if (nome === "progresso") {
    abas.progresso.classList.remove("escondido");
    menus.progresso.classList.add("ativo");
    menusMob.progresso.classList.add("ativo");
  } else if (nome === "exercicios") {
    abas.exercicios.classList.remove("escondido");
    menus.exercicios.classList.add("ativo");
    menusMob.exercicios.classList.add("ativo");
  } else if (nome === "semana") {
    abas.semana.classList.remove("escondido");
    menus.semana.classList.add("ativo");
    menusMob.semana.classList.add("ativo");
  } else if (nome === "perfil") {
    abas.perfil.classList.remove("escondido");
    menus.perfil.classList.add("ativo");
    menusMob.perfil.classList.add("ativo");
    await carregarPerfil();
  }

  // Botão "desfazer" (↩) só existe na aba Treino, e só depois de responder o check-in de ontem
  const jaRespondeu = document.getElementById("pergunta-ontem").classList.contains("escondido");
  btnSeta.classList.toggle("escondido", nome !== "treino" || !jaRespondeu);

  document.getElementById("menu-mobile").classList.add("escondido");
  document.getElementById("dropdown-peso").classList.remove("aberto");
  document.getElementById("submenu-peso-mob").classList.remove("aberto");
  document.getElementById("menu-peso-mob").classList.remove("aberto");
}

// ====== EVENTOS DOS MENUS ======
document.getElementById("menu-treino").onclick = () => trocarAba("treino");
document.getElementById("menu-semana").onclick = () => trocarAba("semana");
document.getElementById("menu-exercicios").onclick = () => trocarAba("exercicios");
document.getElementById("menu-progresso").onclick = () => trocarAba("progresso");
document.getElementById("menu-perfil").onclick = () => trocarAba("perfil");
document.getElementById("menu-treino-mob").onclick = () => trocarAba("treino");
document.getElementById("menu-semana-mob").onclick = () => trocarAba("semana");
document.getElementById("menu-exercicios-mob").onclick = () => trocarAba("exercicios");
document.getElementById("menu-progresso-mob").onclick = () => trocarAba("progresso");
document.getElementById("menu-perfil-mob").onclick = () => trocarAba("perfil");

// ====== DROPDOWN MEU PESO (desktop) ======
document.getElementById("menu-peso").onclick = () => {
  document.getElementById("dropdown-peso").classList.toggle("aberto");
};

// Mede o botão fechado: o dropdown "cresce" a partir dessa largura
function medirBotaoPeso() {
  const ghost = document.getElementById("peso-ghost");
  const caixa = document.getElementById("dropdown-peso");
  if (ghost && caixa && ghost.offsetWidth) {
    // Na primeira medição o botão já nasce com a largura certa (sem "encolher" animado)
    const primeira = !caixa.style.getPropertyValue("--w0");
    if (primeira) caixa.style.transition = "none";
    caixa.style.setProperty("--w0", ghost.offsetWidth + "px");
    if (primeira) {
      void caixa.offsetWidth;
      caixa.style.transition = "";
    }
  }
}
document.getElementById("menu-peso").addEventListener("pointerdown", medirBotaoPeso);
document.getElementById("menu-peso").addEventListener("focus", medirBotaoPeso);
window.addEventListener("resize", medirBotaoPeso);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirBotaoPeso); // refaz quando as fontes terminam de carregar

// Fecha o dropdown ao clicar fora ou apertar Esc
document.addEventListener("click", (e) => {
  if (!e.target.closest("#dropdown-peso")) {
    document.getElementById("dropdown-peso").classList.remove("aberto");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.getElementById("dropdown-peso").classList.remove("aberto");
});

document.getElementById("btn-add-peso").onclick = () => {
  trocarAba("addPeso");
};

document.getElementById("btn-historico").onclick = async () => {
  await carregarHistorico();
  trocarAba("historico");
};

// ====== DROPDOWN MEU PESO (mobile) ======
document.getElementById("menu-peso-mob").onclick = () => {
  const aberto = document.getElementById("submenu-peso-mob").classList.toggle("aberto");
  document.getElementById("menu-peso-mob").classList.toggle("aberto", aberto);
};

document.getElementById("btn-add-peso-mob").onclick = () => {
  trocarAba("addPeso");
};

document.getElementById("btn-historico-mob").onclick = async () => {
  await carregarHistorico();
  trocarAba("historico");
};

// ====== GRÁFICO (Meu peso) ======
document.getElementById("btn-grafico").onclick = abrirGrafico;
document.getElementById("btn-grafico-mob").onclick = abrirGrafico;

// ====== CARREGAR HISTÓRICO DE PESO ======
async function carregarHistorico() {
  if (!usuarioAtual) return;

  const { data: pesos, error } = await supabaseClient
    .from("pesos")
    .select("id, data, peso")
    .eq("user_id", usuarioAtual.id)
    .order("data", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pesos:", error);
    listaHistorico.innerHTML = "";
    semHistorico.textContent = "ERRO AO CARREGAR O HISTÓRICO: " + error.message;
    semHistorico.className = "sem-dados msg erro";
    semHistorico.classList.remove("escondido");
    return;
  }

  listaHistorico.innerHTML = "";

  if (!pesos || pesos.length === 0) {
    semHistorico.textContent = "NENHUM REGISTRO AINDA.";
    semHistorico.className = "sem-dados";
    semHistorico.classList.remove("escondido");
    return;
  }

  semHistorico.classList.add("escondido");

  pesos.forEach(p => {
    const [ano, mes, dia] = p.data.split("-");
    const li = document.createElement("li");
    li.className = "linha-historico";

    const dataEl = document.createElement("span");
    dataEl.textContent = `${dia}/${mes}/${ano}`;

    const direita = document.createElement("span");
    direita.className = "linha-direita";

    const valor = document.createElement("span");
    valor.className = "peso-valor";
    valor.textContent = `${p.peso} KG`;

    const acoes = document.createElement("span");
    acoes.className = "acoes-linha";
    acoes.append(
      criarBotaoAcao("editar", "Editar peso", () => editarPeso(p)),
      criarBotaoAcao("apagar", "Apagar peso", () => apagarPeso(p))
    );

    direita.append(valor, acoes);
    li.append(dataEl, direita);
    listaHistorico.appendChild(li);
  });
}

// ====== SALVAR PESO ======
async function salvarPeso() {
  const valor = parseFloat(inputPeso.value);

  msgPeso.textContent = "";
  msgPeso.className = "msg";

  if (!valor || valor <= 0 || valor > 200) {
    msgPeso.textContent = "DIGITE UM PESO VÁLIDO.";
    msgPeso.className = "msg erro";
    return;
  }

  btnSalvarPeso.disabled = true;

  if (!usuarioAtual) {
    btnSalvarPeso.disabled = false;
    return;
  }

  const hoje = dataLocal();

  const { data: existente } = await supabaseClient
    .from("pesos")
    .select("id")
    .eq("user_id", usuarioAtual.id)
    .eq("data", hoje)
    .maybeSingle();

  let error;

  if (existente) {
    const res = await supabaseClient
      .from("pesos")
      .update({ peso: valor })
      .eq("id", existente.id);
    error = res.error;
  } else {
    const res = await supabaseClient
      .from("pesos")
      .insert({ user_id: usuarioAtual.id, data: hoje, peso: valor });
    error = res.error;
  }

  btnSalvarPeso.disabled = false;

  if (error) {
    logEvento("erro_supabase", { detalhe: `pesos: ${error.message}`, user_id: usuarioAtual.id });
    msgPeso.textContent = "ERRO: " + error.message;
    msgPeso.className = "msg erro";
    return;
  }

  msgPeso.textContent = "PESO SALVO! 💪";
  logEvento("peso_salvo", { nome: valor + " kg", user_id: usuarioAtual.id });
  msgPeso.className = "msg sucesso";
  inputPeso.value = "";
}

btnSalvarPeso.onclick = salvarPeso;
inputPeso.addEventListener("keypress", (e) => {
  if (e.key === "Enter") salvarPeso();
});

// ============================================================
// ========== EDITAR / APAGAR REGISTROS (peso e carga) ========
// ============================================================
const ICONE_EDITAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
const ICONE_LIXO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

function criarBotaoAcao(tipo, rotulo, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "btn-acao-linha " + tipo;
  botao.title = rotulo;
  botao.setAttribute("aria-label", rotulo);
  botao.innerHTML = tipo === "editar" ? ICONE_EDITAR : ICONE_LIXO;
  botao.addEventListener("click", aoClicar);
  return botao;
}

// Aceita "78,5" ou "78.5"
function lerNumero(texto) {
  return parseFloat(String(texto).trim().replace(",", "."));
}

async function editarPeso(registro) {
  if (!usuarioAtual) return;

  const resposta = prompt("Novo peso em kg:", String(registro.peso));
  if (resposta === null) return;

  const valor = lerNumero(resposta);
  if (!valor || valor <= 0 || valor > 200) {
    alert("Digite um peso válido.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("pesos")
    .update({ peso: valor })
    .eq("id", registro.id)
    .eq("user_id", usuarioAtual.id)
    .select("id");

  if (error || !data || data.length === 0) {
    alert("Não consegui editar" + (error ? ": " + error.message : "."));
    return;
  }

  await carregarHistorico();
}

async function apagarPeso(registro) {
  if (!usuarioAtual) return;
  if (!confirm("Apagar este registro de peso?")) return;

  const { data, error } = await supabaseClient
    .from("pesos")
    .delete()
    .eq("id", registro.id)
    .eq("user_id", usuarioAtual.id)
    .select("id");

  if (error || !data || data.length === 0) {
    alert("Não consegui apagar" + (error ? ": " + error.message : "."));
    return;
  }

  await carregarHistorico();
}

async function editarCarga(registro) {
  if (!usuarioAtual) return;

  const resposta = prompt("Nova carga em kg:", String(registro.peso));
  if (resposta === null) return;

  const valor = lerNumero(resposta);
  if (!valor || valor <= 0 || valor > 1000) {
    alert("Digite uma carga válida.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("progresso")
    .update({ peso: valor })
    .eq("id", registro.id)
    .eq("user_id", usuarioAtual.id)
    .select("id");

  if (error || !data || data.length === 0) {
    alert("Não consegui editar" + (error ? ": " + error.message : "."));
    return;
  }

  if (musculoProgressoAtivo) await carregarProgresso(musculoProgressoAtivo);
}

async function apagarCarga(registro) {
  if (!usuarioAtual) return;
  if (!confirm("Apagar este registro de carga?")) return;

  const { data, error } = await supabaseClient
    .from("progresso")
    .delete()
    .eq("id", registro.id)
    .eq("user_id", usuarioAtual.id)
    .select("id");

  if (error || !data || data.length === 0) {
    alert("Não consegui apagar" + (error ? ": " + error.message : "."));
    return;
  }

  if (musculoProgressoAtivo) await carregarProgresso(musculoProgressoAtivo);
}

// ============================================================
// ======== GRÁFICO DE PESO (MEU PESO > GRÁFICO) ==============
// ============================================================
// Gráfico de linha com o valor em cima de cada ponto, desenhado em SVG puro
// (sem biblioteca). Passe o dedo/mouse por cima pra ver o dia e o peso.

const grafico = {
  dados: [],   // [{ data: "2026-10-01", peso: 78.5 }] em ordem de data
  erro: "",
  dias: 0,     // 0 = tudo, ou os últimos N dias
  info: null,  // posições do último desenho (usadas pelo tooltip)
  ativo: -1    // ponto selecionado
};

const SVG_TENDENCIA_BAIXA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>';
const SVG_TENDENCIA_ALTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>';

const formatarPesoGrafico = (v) => String(Number(v.toFixed(2)));
const formatarDataCurta = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const formatarDataLonga = (iso) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };

async function carregarGrafico() {
  if (!usuarioAtual) return;

  const { data: pesos, error } = await supabaseClient
    .from("pesos")
    .select("data, peso")
    .eq("user_id", usuarioAtual.id)
    .order("data", { ascending: true })
    .limit(2000);

  if (error) {
    grafico.erro = error.message;
    grafico.dados = [];
    return;
  }

  grafico.erro = "";
  grafico.dados = (pesos || [])
    .map(p => ({ data: String(p.data), peso: parseFloat(p.peso) }))
    .filter(p => Number.isFinite(p.peso));
}

async function abrirGrafico() {
  await carregarGrafico();
  trocarAba("grafico");
}

function pontosDoGrafico() {
  let pts = grafico.dados;
  if (grafico.dias > 0) {
    const corte = new Date();
    corte.setDate(corte.getDate() - grafico.dias);
    const corteStr = dataLocal(corte);
    pts = pts.filter(p => p.data >= corteStr);
  }
  return pts;
}

// Curva suave que não "estoura" acima/abaixo dos valores (interpolação monotônica)
function caminhoSuave(xs, ys) {
  const n = xs.length;
  const f = (v) => v.toFixed(1);
  if (n === 1) return `M${f(xs[0])},${f(ys[0])}`;
  if (n === 2) return `M${f(xs[0])},${f(ys[0])}L${f(xs[1])},${f(ys[1])}`;

  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    m[i] = (ys[i + 1] - ys[i]) / dx[i];
  }

  const sinal = (v) => (v < 0 ? -1 : 1);
  const t = new Array(n);
  for (let i = 1; i < n - 1; i++) {
    const s0 = m[i - 1];
    const s1 = m[i];
    const p = (s0 * dx[i] + s1 * dx[i - 1]) / (dx[i - 1] + dx[i]);
    t[i] = (sinal(s0) + sinal(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }
  t[0] = (3 * m[0] - t[1]) / 2;
  t[n - 1] = (3 * m[n - 2] - t[n - 2]) / 2;

  let d = `M${f(xs[0])},${f(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(xs[i] + h)},${f(ys[i] + t[i] * h)} ${f(xs[i + 1] - h)},${f(ys[i + 1] - t[i + 1] * h)} ${f(xs[i + 1])},${f(ys[i + 1])}`;
  }
  return d;
}

// Escolhe quais pontos ganham texto sem um ficar em cima do outro
function escolherPosicoes(xs, ordem, distMin) {
  const escolhidos = [];
  ordem.forEach(i => {
    if (escolhidos.every(j => Math.abs(xs[i] - xs[j]) >= distMin)) escolhidos.push(i);
  });
  return new Set(escolhidos);
}

function criarEl(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function renderGrafico() {
  const corpo = document.getElementById("pg-corpo");
  const svg = document.getElementById("pg-svg");
  const vazio = document.getElementById("pg-vazio");
  const desc = document.getElementById("pg-desc");
  const tendencia = document.getElementById("pg-tendencia");
  const nota = document.getElementById("pg-nota");
  const tip = document.getElementById("pg-tooltip");
  if (!corpo || !svg || !vazio || !desc || !tendencia || !nota || !tip) return;

  tip.classList.remove("visivel");
  grafico.ativo = -1;

  const pts = pontosDoGrafico();

  // ----- sem dados (ou erro) -----
  if (grafico.erro || pts.length === 0) {
    svg.innerHTML = "";
    corpo.classList.add("escondido");
    vazio.classList.remove("escondido");
    vazio.textContent = grafico.erro
      ? "ERRO AO CARREGAR O GRÁFICO: " + grafico.erro
      : (grafico.dados.length === 0 ? "NENHUM REGISTRO AINDA." : "SEM REGISTROS NESSE PERÍODO.");
    desc.textContent = "—";
    tendencia.textContent = "";
    nota.textContent = "";
    grafico.info = null;
    return;
  }

  vazio.classList.add("escondido");
  corpo.classList.remove("escondido");

  const W = Math.floor(corpo.clientWidth);
  if (W < 120) return; // aba escondida: desenha quando ela aparecer

  const H = W < 420 ? 230 : 270;
  const ml = 24, mr = 24, mt = 30, mb = 32;
  const iw = W - ml - mr;
  const ih = H - mt - mb;
  const n = pts.length;
  const vals = pts.map(p => p.peso);

  // ----- posição horizontal (proporcional às datas) -----
  const tempo = pts.map(p => new Date(p.data + "T00:00:00").getTime());
  const span = tempo[n - 1] - tempo[0];
  let xs;
  if (n === 1) {
    xs = [ml + iw / 2];
  } else {
    xs = tempo.map(t => ml + ((t - tempo[0]) / span) * iw);
    const invalido = !(span > 0) || xs.some((x, i) => i > 0 && !(x - xs[i - 1] > 0.01));
    if (invalido) xs = pts.map((_, i) => ml + (i / (n - 1)) * iw); // plano B: espaçamento igual
  }

  // ----- posição vertical -----
  const vmin = Math.min(...vals);
  const vmax = Math.max(...vals);
  const folga = Math.max((vmax - vmin) * 0.25, 0.5);
  const bruto = (vmax - vmin + 2 * folga) / 4;
  const passos = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  const passo = passos.find(s => s >= bruto) || 100;
  const gMin = Math.floor((vmin - folga) / passo) * passo;
  const gMax = Math.ceil((vmax + folga) / passo) * passo;
  const yDe = (v) => mt + ((gMax - v) / (gMax - gMin)) * ih;
  const ys = vals.map(yDe);
  const nLinhas = Math.round((gMax - gMin) / passo);

  // ----- quais textos aparecem -----
  const iMax = vals.indexOf(vmax);
  const iMin = vals.indexOf(vmin);
  const ordemRotulos = [n - 1, 0, iMax, iMin];
  for (let i = 0; i < n; i++) ordemRotulos.push(i);
  const rotulos = escolherPosicoes(xs, ordemRotulos, 36);

  const ordemEixo = [n - 1, 0];
  for (let i = 1; i < n - 1; i++) ordemEixo.push(i);
  const marcasEixo = escolherPosicoes(xs, ordemEixo, 54);

  const raio = n <= 30 ? 4 : (n <= 80 ? 3 : 2);

  // ----- monta o SVG -----
  let s = "";
  for (let k = 0; k <= nLinhas; k++) {
    const y = yDe(gMin + k * passo).toFixed(1);
    s += `<line class="pg-grade" x1="${ml}" x2="${W - mr}" y1="${y}" y2="${y}"/>`;
  }

  if (n >= 2) s += `<path class="pg-linha" d="${caminhoSuave(xs, ys)}"/>`;

  for (let i = 0; i < n; i++) {
    s += `<circle class="pg-ponto" cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${raio}"/>`;
  }

  rotulos.forEach(i => {
    s += `<text class="pg-rotulo" x="${xs[i].toFixed(1)}" y="${(ys[i] - 12).toFixed(1)}" text-anchor="middle">${formatarPesoGrafico(vals[i])}</text>`;
  });

  marcasEixo.forEach(i => {
    s += `<text class="pg-eixo" x="${xs[i].toFixed(1)}" y="${H - 10}" text-anchor="middle">${formatarDataCurta(pts[i].data)}</text>`;
  });

  s += '<g id="pg-ativo" class="pg-ativo" style="display:none"><circle class="pg-halo" r="12"/><circle class="pg-ponto-ativo" r="6"/></g>';

  const primeiro = pts[0];
  const ultimo = pts[n - 1];
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);
  svg.setAttribute(
    "aria-label",
    `Gráfico de linha do peso. ${n} ${n === 1 ? "registro" : "registros"}, ` +
    `de ${formatarPesoGrafico(primeiro.peso)} kg em ${formatarDataLonga(primeiro.data)} ` +
    `a ${formatarPesoGrafico(ultimo.peso)} kg em ${formatarDataLonga(ultimo.data)}.`
  );
  svg.innerHTML = s;

  grafico.info = { W, H, xs, ys, pts };

  // ----- cabeçalho -----
  desc.textContent = n === 1
    ? formatarDataLonga(primeiro.data)
    : `${formatarDataLonga(primeiro.data)} — ${formatarDataLonga(ultimo.data)}`;

  // ----- rodapé -----
  tendencia.textContent = "";
  tendencia.className = "pg-tendencia";
  if (n < 2) {
    tendencia.textContent = "REGISTRE MAIS PESOS PARA VER A TENDÊNCIA";
    tendencia.classList.add("neutra");
  } else {
    const diff = ultimo.peso - primeiro.peso;
    if (Math.abs(diff) < 0.1) {
      tendencia.textContent = "SEM MUDANÇA NO PERÍODO";
      tendencia.classList.add("neutra");
    } else {
      const baixou = diff < 0;
      tendencia.classList.add(baixou ? "baixou" : "subiu");
      tendencia.appendChild(criarEl("span", "", `${baixou ? "PERDEU" : "GANHOU"} ${Math.abs(diff).toFixed(1)} KG NO PERÍODO`));
      const icone = criarEl("span", "pg-tendencia-icone");
      icone.innerHTML = baixou ? SVG_TENDENCIA_BAIXA : SVG_TENDENCIA_ALTA;
      tendencia.appendChild(icone);
    }
  }
  nota.textContent = `MOSTRANDO ${n} ${n === 1 ? "REGISTRO" : "REGISTROS"}`;
}

function ativarPontoGrafico(i) {
  const info = grafico.info;
  const tip = document.getElementById("pg-tooltip");
  const g = document.getElementById("pg-ativo");
  if (!info || !tip || !g || i < 0 || i >= info.pts.length) return;

  grafico.ativo = i;
  const p = info.pts[i];
  const x = info.xs[i];
  const y = info.ys[i];

  g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  g.style.display = "";

  tip.textContent = "";
  tip.appendChild(criarEl("div", "pg-tip-data", formatarDataLonga(p.data)));
  const linha = criarEl("div", "pg-tip-linha");
  linha.appendChild(criarEl("span", "pg-tip-marca"));
  linha.appendChild(criarEl("span", "pg-tip-rotulo", "PESO"));
  linha.appendChild(criarEl("span", "pg-tip-valor", `${formatarPesoGrafico(p.peso)} KG`));
  tip.appendChild(linha);
  tip.classList.add("visivel");

  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const esq = Math.min(Math.max(x, tw / 2 + 4), info.W - tw / 2 - 4);
  let topo = y + 18;
  if (topo + th > info.H) topo = y - th - 18;
  tip.style.left = esq.toFixed(0) + "px";
  tip.style.top = Math.max(0, topo).toFixed(0) + "px";
}

function desativarPontoGrafico() {
  const tip = document.getElementById("pg-tooltip");
  const g = document.getElementById("pg-ativo");
  if (tip) tip.classList.remove("visivel");
  if (g) g.style.display = "none";
  grafico.ativo = -1;
}

(function iniciarGrafico() {
  const svg = document.getElementById("pg-svg");
  const corpo = document.getElementById("pg-corpo");
  if (!svg || !corpo) return;

  const maisProximo = (e) => {
    const info = grafico.info;
    if (!info) return -1;
    const r = svg.getBoundingClientRect();
    if (!r.width) return -1;
    const x = (e.clientX - r.left) * (info.W / r.width);
    let melhor = 0;
    let dist = Infinity;
    info.xs.forEach((px, i) => {
      const d = Math.abs(px - x);
      if (d < dist) { dist = d; melhor = i; }
    });
    return melhor;
  };

  const aoMover = (e) => {
    const i = maisProximo(e);
    if (i >= 0 && i !== grafico.ativo) ativarPontoGrafico(i);
  };
  svg.addEventListener("pointermove", aoMover);
  svg.addEventListener("pointerdown", aoMover);
  svg.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") desativarPontoGrafico();
  });

  // Teclado: setas andam entre os pontos, Esc fecha
  svg.addEventListener("keydown", (e) => {
    const info = grafico.info;
    if (!info) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const passo = e.key === "ArrowRight" ? 1 : -1;
      const atual = grafico.ativo < 0 ? (passo > 0 ? -1 : info.pts.length) : grafico.ativo;
      const prox = Math.min(Math.max(atual + passo, 0), info.pts.length - 1);
      ativarPontoGrafico(prox);
    } else if (e.key === "Escape") {
      desativarPontoGrafico();
    }
  });
  svg.addEventListener("blur", desativarPontoGrafico);

  // Filtros de período
  const botoes = document.querySelectorAll(".pg-filtro");
  botoes.forEach(btn => {
    btn.addEventListener("click", () => {
      grafico.dias = parseInt(btn.dataset.dias, 10) || 0;
      botoes.forEach(b => {
        const ligado = b === btn;
        b.classList.toggle("ativo", ligado);
        b.setAttribute("aria-pressed", ligado ? "true" : "false");
      });
      renderGrafico();
    });
  });

  // Redesenha quando a largura muda (girar o celular, redimensionar a janela)
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      const w = Math.floor(corpo.clientWidth);
      if (w >= 120 && (!grafico.info || grafico.info.W !== w)) renderGrafico();
    }).observe(corpo);
  }
})();

// ============================================================
// ============ ACESSIBILIDADE: aria-expanded dos menus =======
// ============================================================
(function sincronizarAriaDosMenus() {
  const ligar = (alvoId, botaoId, estaAberto) => {
    const alvo = document.getElementById(alvoId);
    const botao = document.getElementById(botaoId);
    if (!alvo || !botao) return;
    const atualizar = () => botao.setAttribute("aria-expanded", estaAberto(alvo) ? "true" : "false");
    atualizar();
    new MutationObserver(atualizar).observe(alvo, { attributes: true, attributeFilter: ["class"] });
  };
  ligar("dropdown-peso", "menu-peso", el => el.classList.contains("aberto"));
  ligar("menu-peso-mob", "menu-peso-mob", el => el.classList.contains("aberto"));
  ligar("menu-mobile", "btn-hamburguer", el => !el.classList.contains("escondido"));
})();

// ====== ABA PROGRESSO ======
const MUSCULOS_PROGRESSO = [
  { label: "PEITO",   musculo: "peito" },
  { label: "COSTAS",  musculo: "costas" },
  { label: "PERNA",   musculo: "perna" },
  { label: "OMBRO",   musculo: "ombro" },
  { label: "BÍCEPS",  musculo: "biceps" },
  { label: "TRÍCEPS", musculo: "triceps" }
];

function montarFiltrosProgresso() {
  const container = document.getElementById("filtros-progresso");
  container.innerHTML = "";

  MUSCULOS_PROGRESSO.forEach(m => {
    const btn = document.createElement("button");
    btn.className = "filtro-btn";
    btn.textContent = m.label;
    btn.onclick = () => selecionarMusculoProgresso(m, btn);
    container.appendChild(btn);
  });
}

async function selecionarMusculoProgresso(musculo, btnClicado) {
  document.querySelectorAll("#filtros-progresso .filtro-btn").forEach(b => b.classList.remove("ativo"));
  btnClicado.classList.add("ativo");

  musculoProgressoAtivo = musculo.musculo;

  // Mostra o form
  formProgresso.classList.remove("escondido");

  // Limpa mensagem
  msgProgresso.textContent = "";
  msgProgresso.className = "msg";

  // Carrega o histórico
  await carregarProgresso(musculo.musculo);
}

async function carregarProgresso(musculo) {
  if (!usuarioAtual) return;

  const { data: registros, error } = await supabaseClient
    .from("progresso")
    .select("id, nome, peso, data")
    .eq("user_id", usuarioAtual.id)
    .eq("musculo", musculo)
    .order("data", { ascending: false });

  if (error) {
    console.error("Erro ao carregar progresso:", error);
    msgProgresso.textContent = "ERRO: " + error.message;
    msgProgresso.className = "msg erro";

    listaProgresso.innerHTML = "";
    semProgresso.textContent = "ERRO AO CARREGAR O PROGRESSO: " + error.message;
    semProgresso.className = "sem-dados msg erro";
    semProgresso.classList.remove("escondido");
    return;
  }

  listaProgresso.innerHTML = "";

  if (!registros || registros.length === 0) {
    semProgresso.textContent = "NENHUM REGISTRO AINDA.";
    semProgresso.className = "sem-dados";
    semProgresso.classList.remove("escondido");
    return;
  }

  semProgresso.classList.add("escondido");

  registros.forEach(r => {
    const [ano, mes, dia] = r.data.split("-");
    const li = document.createElement("li");
    li.className = "linha-historico linha-progresso";

    const topo = document.createElement("div");
    topo.className = "info-topo";

    const nomeEl = document.createElement("span");
    nomeEl.className = "nome-prog";
    nomeEl.textContent = r.nome;

    const pesoEl = document.createElement("span");
    pesoEl.className = "peso-prog";
    pesoEl.textContent = `${r.peso} KG`;

    topo.append(nomeEl, pesoEl);

    const rodape = document.createElement("div");
    rodape.className = "rodape-prog";

    const dataEl = document.createElement("span");
    dataEl.className = "data-prog";
    dataEl.textContent = `${dia}/${mes}/${ano}`;

    const acoes = document.createElement("span");
    acoes.className = "acoes-linha";
    acoes.append(
      criarBotaoAcao("editar", "Editar carga", () => editarCarga(r)),
      criarBotaoAcao("apagar", "Apagar carga", () => apagarCarga(r))
    );

    rodape.append(dataEl, acoes);
    li.append(topo, rodape);
    listaProgresso.appendChild(li);
  });
}

// ====== ABA PERFIL ======
async function carregarPerfil() {
  if (!usuarioAtual) return;

  // 1) Nome e data de criação
  const { data: aluno } = await supabaseClient
    .from("alunos")
    .select("nome, created_at")
    .eq("user_id", usuarioAtual.id)
    .maybeSingle();

  document.getElementById("perfil-nome").textContent =
    (aluno?.nome || usuarioAtual.email.split("@")[0]).toUpperCase();

  // 2) Membro desde
  if (aluno?.created_at) {
    const d = new Date(aluno.created_at);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    document.getElementById("perfil-membro").textContent = `${dia}/${mes}/${ano}`;
  } else {
    document.getElementById("perfil-membro").textContent = "—";
  }

  // 3) Treinos totais
  const { count: treinosTotais } = await supabaseClient
    .from("checkins")
    .select("*", { count: "exact", head: true })
    .eq("user_id", usuarioAtual.id)
    .eq("treinou", true);

  document.getElementById("perfil-treinos").textContent =
    (treinosTotais || 0) + " " + (treinosTotais === 1 ? "TREINO" : "TREINOS");

  // 4) Streak atual
  const streakAtual = await calcularStreak(usuarioAtual.id);
  document.getElementById("perfil-streak").textContent =
    streakAtual + " " + (streakAtual === 1 ? "DIA" : "DIAS");

  // 5) Melhor streak
  const melhorStreak = await calcularMelhorStreak(usuarioAtual.id);
  document.getElementById("perfil-melhor-streak").textContent =
    melhorStreak + " " + (melhorStreak === 1 ? "DIA" : "DIAS");

  // 6) Peso atual e diferença
  const { data: pesos } = await supabaseClient
    .from("pesos")
    .select("peso, data")
    .eq("user_id", usuarioAtual.id)
    .order("data", { ascending: true });

  if (pesos && pesos.length > 0) {
    const pesoInicial = parseFloat(pesos[0].peso);
    const pesoAtual = parseFloat(pesos[pesos.length - 1].peso);
    const diff = pesoAtual - pesoInicial;

    document.getElementById("perfil-peso").textContent = pesoAtual + " KG";

    const el = document.getElementById("perfil-diferenca");

    if (Math.abs(diff) < 0.1) {
  el.textContent = "SEM MUDANÇA";
  el.style.color = "";
  el.dataset.tendencia = "neutra";
} else if (diff < 0) {
  el.textContent = `${diff.toFixed(1)} KG (PERDEU)`;
  el.style.color = "";
  el.dataset.tendencia = "baixou";
} else {
  el.textContent = `+${diff.toFixed(1)} KG (GANHOU)`;
  el.style.color = "";
  el.dataset.tendencia = "subiu";
}
  } else {
    document.getElementById("perfil-peso").textContent = "—";
    document.getElementById("perfil-diferenca").textContent = "—";
    document.getElementById("perfil-diferenca").removeAttribute("data-tendencia");
  }
}

// ====== MELHOR STREAK (maior sequência histórica de dias úteis) ======
async function calcularMelhorStreak(userId) {
  const { data: checkins, error } = await supabaseClient
    .from("checkins")
    .select("data, treinou")
    .eq("user_id", userId)
    .order("data", { ascending: true })
    .limit(400);

  if (error || !checkins || checkins.length === 0) return 0;

  function ehDiaUtil(dataStr) {
    const dow = new Date(dataStr + "T00:00:00").getDay();
    return dow >= 1 && dow <= 5;
  }

  function diaUtilAnterior(dataStr) {
    const d = new Date(dataStr + "T00:00:00");
    do {
      d.setDate(d.getDate() - 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
    return dataLocal(d);
  }

  // Pega só os dias úteis com treinou=true, ordenados
  const diasTreinados = checkins
    .filter(c => c.treinou && ehDiaUtil(c.data))
    .map(c => c.data)
    .sort();

  if (diasTreinados.length === 0) return 0;

  let melhor = 1;
  let atual = 1;

  for (let i = 1; i < diasTreinados.length; i++) {
    const anteriorEsperado = diaUtilAnterior(diasTreinados[i]);
    if (anteriorEsperado === diasTreinados[i - 1]) {
      atual++;
      if (atual > melhor) melhor = atual;
    } else {
      atual = 1;
    }
  }

  return melhor;
}

async function salvarCarga() {
  const nome = inputNomeExercicio.value.trim();
  const peso = parseFloat(inputCarga.value);

  msgProgresso.textContent = "";
  msgProgresso.className = "msg";

  if (!musculoProgressoAtivo) {
    msgProgresso.textContent = "SELECIONE UM MÚSCULO PRIMEIRO.";
    msgProgresso.className = "msg erro";
    return;
  }

  if (!nome) {
    msgProgresso.textContent = "DIGITE O NOME DO EXERCÍCIO.";
    msgProgresso.className = "msg erro";
    return;
  }

  if (!peso || peso <= 0 || peso > 1000) {
    msgProgresso.textContent = "DIGITE UM PESO VÁLIDO.";
    msgProgresso.className = "msg erro";
    return;
  }

  btnSalvarCarga.disabled = true;

  if (!usuarioAtual) {
    btnSalvarCarga.disabled = false;
    return;
  }

  const hoje = dataLocal();

  const { error } = await supabaseClient.from("progresso").insert({
    user_id: usuarioAtual.id,
    musculo: musculoProgressoAtivo,
    nome: nome.toUpperCase(),
    peso: peso,
    data: hoje
  });

  btnSalvarCarga.disabled = false;

  if (error) {
    msgProgresso.textContent = "ERRO: " + error.message;
    msgProgresso.className = "msg erro";
    return;
  }

  msgProgresso.textContent = "CARGA SALVA! 💪";
  logEvento("carga_salva", {
    nome: nome,
    detalhe: `${peso} kg (${musculoProgressoAtivo})`,
    user_id: usuarioAtual.id,
  });
  msgProgresso.className = "msg sucesso";

  inputNomeExercicio.value = "";
  inputCarga.value = "";

  await carregarProgresso(musculoProgressoAtivo);
}

btnSalvarCarga.onclick = salvarCarga;
inputCarga.addEventListener("keypress", (e) => {
  if (e.key === "Enter") salvarCarga();
});
inputNomeExercicio.addEventListener("keypress", (e) => {
  if (e.key === "Enter") inputCarga.focus();
});

montarFiltrosProgresso();

// ====== RESUMO DE ONTEM ======
async function atualizarResumoOntem(userId) {
  const hoje = new Date().getDay();
  const resumo = await montarResumoOntem(hoje, userId);

  document.getElementById("resumo-ontem").innerHTML = resumo.texto;

  const pergunta = document.getElementById("pergunta-ontem");
  const treinoBox = document.querySelector(".treino-box");

  if (resumo.precisaPerguntar) {
    // Não respondeu ainda → mostra a pergunta, esconde o treino
    pergunta.classList.remove("escondido");
    pergunta.dataset.dataOntem = obterDataOntem();
    btnSeta.classList.add("escondido");
    treinoBox.classList.add("escondido");
  } else {
    // Já respondeu → esconde a pergunta, mostra o treino
    pergunta.classList.add("escondido");
    btnSeta.classList.remove("escondido");
    treinoBox.classList.remove("escondido");
  }
}

async function montarResumoOntem(hoje, userId) {
  const ontem = (hoje + 6) % 7;
  const nomeOntem = NOMES_DIAS[ontem];
  const nomeHoje = NOMES_DIAS[hoje];
  const treinoHoje = TREINOS[hoje];
  const dataOntem = obterDataOntem();

  const { data: checkin } = await supabaseClient
    .from("checkins")
    .select("treinou")
    .eq("user_id", userId)
    .eq("data", dataOntem)
    .maybeSingle();

  if (!checkin) {
    return {
      texto: `Ainda não sei o que você fez <strong>${nomeOntem}</strong>. Me conta aí embaixo 👇`,
      precisaPerguntar: true
    };
  }

  if (checkin.treinou) {
    return {
      texto: `Ontem (<strong>${nomeOntem}</strong>) você treinou <strong>${TREINOS[ontem]}</strong>. Hoje é <strong>${nomeHoje}</strong>, bora de <strong>${treinoHoje}</strong>! 💪`,
      precisaPerguntar: false
    };
  }

  return {
    texto: `Ontem (<strong>${nomeOntem}</strong>) você faltou. Hoje é <strong>${nomeHoje}</strong>, bora recuperar com <strong>${treinoHoje}</strong>! 🔥`,
    precisaPerguntar: false
  };
}

function obterDataOntem() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dataLocal(d);
}

// ====== STREAK (SEQUÊNCIA DE DIAS TREINANDO) ======

// Conta quantos dias seguidos (de trás pra frente, a partir do check-in
// mais recente) o usuário marcou "treinei", sem nenhum buraco no meio.
// Conta quantos dias ÚTEIS seguidos (segunda a sexta) o usuário marcou
// "treinei", sem nenhum buraco no meio. Sábado e domingo não contam
// (pausa, não quebra a sequência).
// Conta quantos dias ÚTEIS seguidos (segunda a sexta) o usuário marcou
// "treinei", sem nenhum buraco no meio. Sábado e domingo não contam
// (pausa, não quebra a sequência).
async function calcularStreak(userId) {
  const { data: checkins, error } = await supabaseClient
    .from("checkins")
    .select("data, treinou")
    .eq("user_id", userId)
    .order("data", { ascending: false })
    .limit(400);

  if (error || !checkins || checkins.length === 0) return 0;

  // Monta um mapa { "2026-09-25": true/false } pra busca rápida
  const mapa = {};
  checkins.forEach(c => {
    mapa[c.data] = c.treinou;
  });

  // Helpers
  function ehDiaUtil(dataStr) {
    const dow = new Date(dataStr + "T00:00:00").getDay();
    return dow >= 1 && dow <= 5; // 1=seg, 5=sex
  }

  function diaUtilAnterior(dataStr) {
    const d = new Date(dataStr + "T00:00:00");
    do {
      d.setDate(d.getDate() - 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
    return dataLocal(d);
  }

  function ehMesmoDiaOuDepois(dataA, dataB) {
    return new Date(dataA + "T00:00:00") >= new Date(dataB + "T00:00:00");
  }

  // ====== 1) Descobre o último dia útil esperado (com base em hoje) ======
  const hojeStr = dataLocal();
  const dowHoje = new Date(hojeStr + "T00:00:00").getDay();

  let ultimoDiaUtilEsperado;

  if (dowHoje === 0) {
    // Domingo → último dia útil foi sexta
    const d = new Date(hojeStr + "T00:00:00");
    d.setDate(d.getDate() - 2);
    ultimoDiaUtilEsperado = dataLocal(d);
  } else if (dowHoje === 6) {
    // Sábado → último dia útil foi sexta
    const d = new Date(hojeStr + "T00:00:00");
    d.setDate(d.getDate() - 1);
    ultimoDiaUtilEsperado = dataLocal(d);
  } else {
    // Dia útil
    if (mapa[hojeStr] !== undefined) {
      // Já respondeu hoje
      ultimoDiaUtilEsperado = hojeStr;
    } else {
      // Não respondeu hoje ainda → espera o dia útil anterior
      ultimoDiaUtilEsperado = diaUtilAnterior(hojeStr);
    }
  }

  // ====== 2) Pega o checkin mais recente EM DIA ÚTIL ======
  let dataInicial = null;
  for (const c of checkins) {
    if (ehDiaUtil(c.data)) {
      dataInicial = c.data;
      break;
    }
  }

  if (!dataInicial) return 0;

  // ====== 3) Se o checkin mais recente é mais antigo que o esperado, esfriou ======
  // (Aceita também se for o próprio dia esperado ou mais recente)
  if (!ehMesmoDiaOuDepois(dataInicial, ultimoDiaUtilEsperado)) {
    return 0;
  }

  // ====== 4) Se o checkin mais recente for "não treinei", streak = 0 ======
  if (mapa[dataInicial] !== true) return 0;

  // ====== 5) Conta pra trás ======
  let streak = 0;
  let cursor = dataInicial;

  while (mapa[cursor] === true) {
    streak++;
    cursor = diaUtilAnterior(cursor);

    // Se o dia útil anterior não tem checkin registrado, para
    if (mapa[cursor] === undefined) break;
  }

  return streak;
}

async function atualizarStreak(userId) {
  const badge = document.getElementById("streak-treino");
  if (!badge) return;

  const streak = await calcularStreak(userId);

  if (streak <= 0) {
    badge.classList.add("escondido");
    return;
  }

  const numero = badge.querySelector(".streak-numero");
  if (numero) {
    numero.textContent = `${streak} ${streak === 1 ? "DIA" : "DIAS"}`;
  }
  badge.classList.remove("escondido");
}

// ====== SALVAR CHECKIN ======
async function salvarCheckin(treinou) {
  const pergunta = document.getElementById("pergunta-ontem");
  const dataOntem = pergunta.dataset.dataOntem || obterDataOntem();

  if (!usuarioAtual) return;

  const { error } = await supabaseClient.from("checkins").insert({
    user_id: usuarioAtual.id,
    data: dataOntem,
    treinou: treinou
  });

  if (error) {
    alert("Erro ao salvar: " + error.message);
    return;
  }

  await atualizarResumoOntem(usuarioAtual.id);
  await atualizarStreak(usuarioAtual.id);
  logEvento("checkin", {
    nome: treinou ? "Treinou" : "Faltou",
    user_id: usuarioAtual.id,
  });
}

document.getElementById("btn-treinei").onclick = () => salvarCheckin(true);
document.getElementById("btn-faltei").onclick = () => salvarCheckin(false);

// ====== SETA = DESFAZER ======
btnSeta.onclick = async () => {
  if (!usuarioAtual) return;

  const dataOntem = obterDataOntem();

  const { error } = await supabaseClient
    .from("checkins")
    .delete()
    .eq("user_id", usuarioAtual.id)
    .eq("data", dataOntem);

  if (error) {
    alert("Erro ao desfazer: " + error.message);
    return;
  }

  await atualizarResumoOntem(usuarioAtual.id);
  await atualizarStreak(usuarioAtual.id);
};

// ====== AVATAR (foto de perfil) ======
const btnAvatar = document.getElementById("btn-avatar");
const btnAvatarEditar = document.getElementById("btn-avatar-editar");
const inputAvatar = document.getElementById("input-avatar");
const avatarImg = document.getElementById("avatar-img");
const perfilFotoBtn = document.getElementById("perfil-foto-btn");
const perfilFotoImg = document.getElementById("perfil-foto-img");
const fotoModal = document.getElementById("foto-modal");
const fotoGrandeImg = document.getElementById("foto-grande-img");

function mostrarAvatar(src) {
  [avatarImg, perfilFotoImg, fotoGrandeImg].forEach(img => {
    if (!img) return;
    if (src) img.src = src;
    else img.removeAttribute("src");
  });
  [btnAvatar, perfilFotoBtn].forEach(b => b?.classList.toggle("tem-foto", !!src));
}

function temFoto() {
  return !!btnAvatar?.classList.contains("tem-foto");
}

function abrirModalFoto() {
  fotoModal?.classList.remove("escondido");
}

function fecharModalFoto() {
  fotoModal?.classList.add("escondido");
}

// Corta a foto em quadrado e diminui pra 512px (fica leve e rápida)
function redimensionarFoto(arquivo, tamanho) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = tamanho;
      canvas.getContext("2d").drawImage(img, sx, sy, lado, lado, 0, 0, tamanho, tamanho);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagem inválida"));
    };
    img.src = url;
  });
}

async function carregarAvatar(user) {
  let salva = null;
  try { salva = localStorage.getItem("avatar_" + user.id); } catch (_) {}
  mostrarAvatar(salva);

  // Se existir a coluna "avatar" no Supabase, a foto de lá vale em qualquer aparelho
  try {
    const { data, error } = await supabaseClient
      .from("alunos")
      .select("avatar")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data?.avatar) {
      mostrarAvatar(data.avatar);
      try { localStorage.setItem("avatar_" + user.id, data.avatar); } catch (_) {}
    }
  } catch (_) {}
}

// Com foto: abre a foto grande. Sem foto: já abre a escolha da imagem.
function abrirFotoOuEscolher() {
  if (temFoto()) abrirModalFoto();
  else inputAvatar?.click();
}

// (cada ligação é protegida: se algum elemento faltar no index.html, o resto do site continua funcionando)
const ligarClique = (el, fn) => { if (el) el.onclick = fn; };

ligarClique(btnAvatar, abrirFotoOuEscolher);
ligarClique(perfilFotoBtn, abrirFotoOuEscolher);
ligarClique(btnAvatarEditar, () => inputAvatar?.click());

ligarClique(document.getElementById("foto-trocar"), () => {
  fecharModalFoto();
  inputAvatar?.click();
});
ligarClique(document.getElementById("foto-fechar"), fecharModalFoto);
fotoModal?.addEventListener("click", (e) => {
  if (e.target === fotoModal) fecharModalFoto();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModalFoto();
});

if (inputAvatar) inputAvatar.onchange = async () => {
  const arquivo = inputAvatar.files[0];
  inputAvatar.value = "";
  if (!arquivo || !usuarioAtual) return;

  if (!arquivo.type.startsWith("image/")) {
    alert("Escolha uma imagem.");
    return;
  }

  try {
    const foto = await redimensionarFoto(arquivo, 512);
    mostrarAvatar(foto);

    try { localStorage.setItem("avatar_" + usuarioAtual.id, foto); } catch (_) {}

    // Tenta guardar no Supabase também (só funciona se a coluna "avatar" existir)
    await supabaseClient.from("alunos").update({ avatar: foto }).eq("user_id", usuarioAtual.id);
  } catch (_) {
    alert("Não consegui usar essa foto. Tente outra.");
  }
};

// ====== SAIR ======
async function sair() {
  await supabaseClient.auth.signOut();
  usuarioAtual = null;
  telaApp.classList.add("escondido");
  telaAuth.classList.remove("escondido");
  form.reset();
  msg.textContent = "";
  campoNome.style.display = "none";
  document.getElementById("menu-mobile").classList.add("escondido");
  fecharModalFoto();
  mostrarAvatar(null);
}

document.getElementById("btn-sair").onclick = sair;
document.getElementById("btn-sair-mob").onclick = sair;

// ====== HAMBÚRGUER ======
document.getElementById("btn-hamburguer").onclick = () => {
  document.getElementById("menu-mobile").classList.toggle("escondido");
};

// ====== TRADUZIR ERROS ======
function traduzErro(m) {
  if (m.includes("Email not confirmed")) return "Confirme seu email antes de entrar.";
  if (m.includes("Invalid login")) return "Email ou senha incorretos.";
  if (m.includes("already registered")) return "Esse email já está cadastrado.";
  if (m.includes("Password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("email rate")) {
    return "Limite de emails atingido. Espere 1 hora.";
  }
  return m;
}

// ============================================================
// ==================== ABA EXERCÍCIOS ========================
// ============================================================

const MUSCULOS = [
  { label: "PEITO",       musculos: ["chest"] },
  { label: "COSTAS",      musculos: ["lats", "middle back", "lower back", "traps"] },
  { label: "PERNA",       musculos: ["quadriceps", "hamstrings", "glutes", "adductors", "abductors"] },
  { label: "PANTURRILHA", musculos: ["calves"] },
  { label: "OMBRO",       musculos: ["shoulders"] },
  { label: "BRAÇO",       musculos: ["biceps", "triceps"] },
  { label: "ANTEBRAÇO",   musculos: ["forearms"] },
  { label: "ABDÔMEN",     musculos: ["abdominals"] }
];

const TRADUCOES_EXATAS = {
  "barbell bench press": "SUPINO RETO COM BARRA",
  "barbell bench press - medium grip": "SUPINO RETO COM BARRA (PEGADA MÉDIA)",
  "dumbbell bench press": "SUPINO RETO COM HALTERES",
  "barbell incline bench press": "SUPINO INCLINADO COM BARRA",
  "dumbbell incline bench press": "SUPINO INCLINADO COM HALTERES",
  "barbell decline bench press": "SUPINO DECLINADO COM BARRA",
  "dumbbell decline bench press": "SUPINO DECLINADO COM HALTERES",
  "barbell wide bench press": "SUPINO RETO ABERTO",
  "barbell close-grip bench press": "SUPINO PEGADA FECHADA",
  "barbell guillotine bench press": "SUPINO GUILLOTINA",
  "dumbbell flyes": "CRUCIFIXO COM HALTERES",
  "dumbbell fly": "CRUCIFIXO COM HALTERES",
  "cable crossover": "CRUCIFIXO NA POLIA ALTA",
  "pushups": "FLEXÃO",
  "push-up": "FLEXÃO",
  "push up": "FLEXÃO",
  "push-up wide": "FLEXÃO ABERTA",
  "chest dip": "MERGULHO DE PEITO",
  "assisted chest dip (kneeling)": "MERGULHO DE PEITO ASSISTIDO (AJOELHADO)",
  "butterfly": "VOADOR PEITORAL",
  "pec deck": "VOADOR PEITORAL",
  "dumbbell incline fly": "CRUCIFIXO INCLINADO COM HALTERES",
  "dumbbell flyes with bands": "CRUCIFIXO COM HALTERES E ELÁSTICO",
  "smith machine bench press": "SUPINO NA MÁQUINA SMITH",
  "smith machine incline bench press": "SUPINO INCLINADO NA MÁQUINA SMITH",
  "lever chest press": "SUPINO NA MÁQUINA",
  "machine bench press": "SUPINO NA MÁQUINA",
  "decline dumbbell flyes": "CRUCIFIXO DECLINADO COM HALTERES",
  "dumbbell bench press with neutral grip": "SUPINO COM PEGADA NEUTRA",

  "pullups": "BARRA FIXA PRONADA",
  "pull-up": "BARRA FIXA PRONADA",
  "chin-up": "BARRA FIXA SUPINADA",
  "chinup": "BARRA FIXA SUPINADA",
  "barbell deadlift": "LEVANTAMENTO TERRA",
  "deadlift": "LEVANTAMENTO TERRA",
  "romanian deadlift": "STIFF",
  "barbell romanian deadlift": "STIFF COM BARRA",
  "dumbbell romanian deadlift": "STIFF COM HALTERES",
  "bent over barbell row": "REMADA CURVADA COM BARRA",
  "barbell bent over row": "REMADA CURVADA COM BARRA",
  "bent over dumbbell row": "REMADA CURVADA COM HALTERES",
  "one-arm dumbbell row": "REMADA UNILATERAL COM HALTERE",
  "seated cable rows": "REMADA SENTADO NA POLIA",
  "seated cable row": "REMADA SENTADO NA POLIA",
  "wide-grip lat pulldown": "PUXADA FRENTE ABERTA",
  "close-grip front lat pulldown": "PUXADA FRENTE FECHADA",
  "lat pulldown": "PUXADA FRENTE",
  "pull down": "PUXADA",
  "t-bar row": "REMADA CAVALINHO",
  "t-bar row with handle": "REMADA CAVALINHO COM PEGADOR",
  "reverse grip bent over row": "REMADA CURVADA PEGADA INVERSA",
  "straight-arm pulldown": "PUXADA BRAÇO RETO",
  "hyperextension": "EXTENSÃO LOMBAR",
  "back extension": "EXTENSÃO LOMBAR",
  "good morning": "GOOD MORNING",
  "barbell good morning": "GOOD MORNING COM BARRA",
  "shrug": "ENCOLHIMENTO",
  "barbell shrug": "ENCOLHIMENTO COM BARRA",
  "dumbbell shrug": "ENCOLHIMENTO COM HALTERES",
  "face pull": "FACE PULL",
  "reverse flyes": "CRUCIFIXO INVERSO",
  "bent over dumbbell reverse fly": "CRUCIFIXO INVERSO COM HALTERES",
  "rack pull": "RACK PULL",

  "barbell squat": "AGACHAMENTO COM BARRA",
  "dumbbell squat": "AGACHAMENTO COM HALTERES",
  "front squat": "AGACHAMENTO FRONTAL",
  "back squat": "AGACHAMENTO LIVRE",
  "goblet squat": "AGACHAMENTO GOBLET",
  "bulgarian split squat": "AGACHAMENTO BÚLGARO",
  "leg press": "LEG PRESS 45°",
  "leg extension": "CADEIRA EXTENSORA",
  "leg curl": "CADEIRA FLEXORA",
  "lying leg curl": "MESA FLEXORA",
  "seated leg curl": "CADEIRA FLEXORA SENTADO",
  "lunge": "AFUNDO",
  "dumbbell lunge": "AFUNDO COM HALTERES",
  "walking lunge": "AFUNDO CAMINHANDO",
  "barbell lunge": "AFUNDO COM BARRA",
  "hack squat": "AGACHAMENTO HACK",
  "hip thrust": "ELEVAÇÃO DE QUADRIL",
  "glute bridge": "PONTE DE GLÚTEO",
  "step up": "SUBIDA NO BANCO",
  "box jump": "SALTO NA CAIXA",
  "sumo deadlift": "LEVANTAMENTO TERRA SUMÔ",

  "standing calf raises": "ELEVAÇÃO DE GÊMEOS EM PÉ",
  "seated calf raise": "ELEVAÇÃO DE GÊMEOS SENTADO",
  "calf press on the leg press machine": "ELEVAÇÃO DE GÊMEOS NO LEG PRESS",
  "calf raise": "ELEVAÇÃO DE GÊMEOS",
  "standing dumbbell calf raise": "ELEVAÇÃO DE GÊMEOS COM HALTERES",
  "donkey calf raises": "ELEVAÇÃO DE GÊMEOS BURRO",

  "barbell shoulder press": "DESENVOLVIMENTO MILITAR COM BARRA",
  "dumbbell shoulder press": "DESENVOLVIMENTO COM HALTERES",
  "overhead press": "DESENVOLVIMENTO",
  "military press": "DESENVOLVIMENTO MILITAR",
  "arnold dumbbell press": "DESENVOLVIMENTO ARNOLD",
  "arnold press": "DESENVOLVIMENTO ARNOLD",
  "lateral raise": "ELEVAÇÃO LATERAL",
  "side lateral raise": "ELEVAÇÃO LATERAL",
  "dumbbell lateral raise": "ELEVAÇÃO LATERAL COM HALTERES",
  "seated side lateral raise": "ELEVAÇÃO LATERAL SENTADO",
  "front dumbbell raise": "ELEVAÇÃO FRONTAL COM HALTERES",
  "front raise": "ELEVAÇÃO FRONTAL",
  "rear delt fly": "CRUCIFIXO INVERSO",
  "reverse machine flyes": "CRUCIFIXO INVERSO NA MÁQUINA",
  "upright barbell row": "REMADA ALTA COM BARRA",
  "upright row": "REMADA ALTA",

  "barbell curl": "ROSCA DIRETA COM BARRA",
  "dumbbell curl": "ROSCA DIRETA COM HALTERES",
  "hammer curl": "ROSCA MARTELO",
  "preacher curl": "ROSCA SCOTT",
  "concentration curl": "ROSCA CONCENTRADA",
  "cable curl": "ROSCA NA POLIA",
  "incline dumbbell curl": "ROSCA INCLINADA COM HALTERES",
  "alternate hammer curl": "ROSCA MARTELO ALTERNADA",
  "alternate incline dumbbell curl": "ROSCA INCLINADA ALTERNADA",
  "zottman preacher curl": "ROSCA SCOTT ZOTTMAN",
  "barbell preacher curl": "ROSCA SCOTT COM BARRA",
  "dumbbell bicep curl": "ROSCA DIRETA COM HALTERES",
  "close-grip barbell curl": "ROSCA DIRETA PEGADA FECHADA",
  "reverse barbell curl": "ROSCA DIRETA INVERSA COM BARRA",
  "spider curl": "ROSCA ARANHA",
  "triceps pushdown": "TRÍCEPS NA POLIA",
  "tricep pushdown": "TRÍCEPS NA POLIA",
  "triceps extension": "TRÍCEPS TESTA",
  "skull crusher": "TRÍCEPS TESTA",
  "overhead triceps extension": "TRÍCEPS FRANCÊS",
  "dumbbell triceps extension": "TRÍCEPS FRANCÊS COM HALTERE",
  "close-grip bench press": "SUPINO FECHADO (TRÍCEPS)",
  "bench dip": "MERGULHO NO BANCO",
  "dips - triceps version": "MERGULHO NAS PARALELAS (TRÍCEPS)",
  "dip": "MERGULHO NAS PARALELAS",
  "triceps dip": "MERGULHO NAS PARALELAS",
  "cable rope overhead triceps extension": "TRÍCEPS FRANCÊS NA CORDA",
  "standing dumbbell triceps extension": "TRÍCEPS FRANCÊS EM PÉ",
  "lying triceps press": "TRÍCEPS TESTA DEITADO",
  "tricep dumbbell kickback": "COICE DE TRÍCEPS COM HALTERE",

  "wrist curl": "ROSCA DE PUNHO",
  "reverse wrist curl": "ROSCA DE PUNHO INVERSA",
  "seated palm-up barbell wrist curl": "ROSCA DE PUNHO SENTADO (PALMA PRA CIMA)",
  "seated palm-down barbell wrist curl": "ROSCA DE PUNHO SENTADO (PALMA PRA BAIXO)",
  "palms-down dumbbell wrist curl over a bench": "ROSCA DE PUNHO INVERSA COM HALTERES",
  "palms-up barbell wrist curl over a bench": "ROSCA DE PUNHO COM BARRA",
  "palms-up dumbbell wrist curl over a bench": "ROSCA DE PUNHO COM HALTERES",
  "farmer's walk": "CAMINHADA DO FAZENDEIRO",
  "farmers walk": "CAMINHADA DO FAZENDEIRO",

  "crunch": "ABDOMINAL",
  "crunches": "ABDOMINAL",
  "sit-up": "ABDOMINAL COMPLETO",
  "3/4 sit-up": "ABDOMINAL 3/4",
  "plank": "PRANCHA",
  "side plank": "PRANCHA LATERAL",
  "leg raise": "ELEVAÇÃO DE PERNAS",
  "hanging leg raise": "ELEVAÇÃO DE PERNAS SUSPENSO",
  "russian twist": "ABDOMINAL RUSSO",
  "bicycle crunch": "ABDOMINAL BICICLETA",
  "mountain climber": "ESCALADOR",
  "dead bug": "DEAD BUG",
  "cable crunch": "ABDOMINAL NA POLIA",
  "ab crunch machine": "ABDOMINAL NA MÁQUINA",
  "ab roller": "RODA ABDOMINAL",
  "air bike": "BICICLETA NO AR",
  "alternate heel touchers": "TOQUE DE CALCANHAR ALTERNADO",
  "bent-knee hip raise": "ELEVAÇÃO DE QUADRIL COM JOELHOS FLEXIONADOS",
  "cross-body crunch": "ABDOMINAL CRUZADO",
  "decline crunch": "ABDOMINAL DECLINADO",
  "flat bench lying leg raise": "ELEVAÇÃO DE PERNAS NO BANCO",
  "flat bench leg pull-in": "PUXADA DE PERNAS NO BANCO",
  "hanging pike": "CANIVETE SUSPENSO",
  "oblique crunches": "ABDOMINAL OBLÍQUO",
  "reverse crunch": "ABDOMINAL INVERSO",
  "tuck crunch": "ABDOMINAL RECOLHIDO",
  "vertical leg crunch": "ABDOMINAL PERNA VERTICAL",

  "behind head chest stretch": "ALONGAMENTO DE PEITO ATRÁS DA CABEÇA",
  "chest stretch": "ALONGAMENTO DE PEITO",
  "chest and front of shoulder stretch": "ALONGAMENTO DE PEITO E OMBRO FRONTAL",
  "stability ball chest stretch": "ALONGAMENTO DE PEITO NA BOLA SUÍÇA",
  "stability ball": "BOLA SUÍÇA",
  "chair upper body stretch": "ALONGAMENTO DE SUPERIORES NA CADEIRA"
};

const DICIONARIO_PALAVRAS = {
  "barbell": "BARRA", "dumbbell": "HALTERES", "ez barbell": "BARRA W",
  "ez-bar": "BARRA W", "ez bar": "BARRA W", "cable": "POLIA", "machine": "MÁQUINA",
  "smith": "SMITH", "kettlebell": "KETTLEBELL", "band": "ELÁSTICO", "bands": "ELÁSTICOS",
  "resistance band": "ELÁSTICO", "body only": "PESO CORPORAL", "bodyweight": "PESO CORPORAL",
  "body weight": "PESO CORPORAL", "stability ball": "BOLA SUÍÇA", "medicine ball": "BOLA MEDICINAL",
  "bosu ball": "BOSU", "trap bar": "TRAP BAR", "leverage machine": "MÁQUINA ARTICULADA",
  "sled": "SLED", "roller": "ROLO", "wheel": "RODA", "rope": "CORDA", "bench": "BANCO",
  "incline": "INCLINADO", "decline": "DECLINADO", "flat": "RETO", "seated": "SENTADO",
  "standing": "EM PÉ", "lying": "DEITADO", "prone": "PRONADO", "supine": "SUPINO",
  "kneeling": "AJOELHADO", "hanging": "SUSPENSO", "wide": "ABERTO", "narrow": "FECHADO",
  "close": "FECHADO", "wide-grip": "PEGADA ABERTA", "close-grip": "PEGADA FECHADA",
  "reverse grip": "PEGADA INVERSA", "neutral grip": "PEGADA NEUTRA",
  "overhand grip": "PEGADA PRONADA", "underhand grip": "PEGADA SUPINADA",
  "one arm": "UNILATERAL", "one-arm": "UNILATERAL", "single arm": "UNILATERAL",
  "single-arm": "UNILATERAL", "two arm": "BILATERAL", "two-arm": "BILATERAL",
  "one leg": "UMA PERNA", "single leg": "UMA PERNA", "single-leg": "UMA PERNA",
  "alternate": "ALTERNADO", "alternating": "ALTERNADO", "twisting": "COM ROTAÇÃO",
  "twist": "ROTAÇÃO", "reverse": "INVERSO", "assisted": "ASSISTIDO", "weighted": "COM PESO",
  "front": "FRONTAL", "back": "POSTERIOR", "rear": "POSTERIOR", "side": "LATERAL",
  "lateral": "LATERAL", "overhead": "ACIMA DA CABEÇA", "behind neck": "ATRÁS DA NUCA",
  "behind head": "ATRÁS DA CABEÇA", "behind back": "ATRÁS DAS COSTAS",
  "bench press": "SUPINO", "chest press": "SUPINO", "shoulder press": "DESENVOLVIMENTO",
  "overhead press": "DESENVOLVIMENTO", "military press": "DESENVOLVIMENTO MILITAR",
  "push press": "DESENVOLVIMENTO COM IMPULSO", "leg press": "LEG PRESS", "press": "PRESS",
  "squat": "AGACHAMENTO", "deadlift": "LEVANTAMENTO TERRA", "row": "REMADA", "rows": "REMADA",
  "pulldown": "PUXADA", "pull down": "PUXADA", "pull-up": "BARRA FIXA", "pull up": "BARRA FIXA",
  "pullups": "BARRA FIXA", "chin-up": "BARRA FIXA SUPINADA", "chin up": "BARRA FIXA SUPINADA",
  "chinup": "BARRA FIXA SUPINADA", "push-up": "FLEXÃO", "push up": "FLEXÃO",
  "pushups": "FLEXÃO", "curl": "ROSCA", "extension": "EXTENSÃO", "flexion": "FLEXÃO",
  "fly": "CRUCIFIXO", "flye": "CRUCIFIXO", "flyes": "CRUCIFIXO", "raise": "ELEVAÇÃO",
  "raises": "ELEVAÇÃO", "shrug": "ENCOLHIMENTO", "crunch": "ABDOMINAL", "crunches": "ABDOMINAL",
  "lunge": "AFUNDO", "lunges": "AFUNDO", "step up": "SUBIDA", "step-up": "SUBIDA",
  "dip": "MERGULHO", "dips": "MERGULHO", "kickback": "COICE", "pushdown": "PULLEY",
  "pulley": "POLIA", "skull crusher": "TRÍCEPS TESTA", "skullcrusher": "TRÍCEPS TESTA",
  "clean": "CLEAN", "jerk": "ARRANCO", "snatch": "ARRANCO", "thruster": "THRUSTER",
  "swing": "SWING", "hip thrust": "ELEVAÇÃO DE QUADRIL", "glute bridge": "PONTE DE GLÚTEO",
  "calf raise": "ELEVAÇÃO DE GÊMEOS", "calf raises": "ELEVAÇÃO DE GÊMEOS", "calf": "GÊMEOS",
  "calves": "GÊMEOS", "wrist": "PUNHO", "forearm": "ANTEBRAÇO", "biceps": "BÍCEPS",
  "triceps": "TRÍCEPS", "chest": "PEITO", "shoulder": "OMBRO", "shoulders": "OMBROS",
  "leg": "PERNA", "legs": "PERNAS", "upper": "SUPERIOR", "lower": "INFERIOR",
  "arm": "BRAÇO", "arms": "BRAÇOS", "hand": "MÃO", "knee": "JOELHO", "head": "CABEÇA",
  "neck": "PESCOÇO", "waist": "CINTURA", "abs": "ABDÔMEN", "ab": "ABDÔMEN",
  "abdominal": "ABDOMINAL", "abdominals": "ABDÔMEN", "core": "CORE", "glute": "GLÚTEO",
  "glutes": "GLÚTEOS", "hamstring": "POSTERIOR DE COXA", "hamstrings": "POSTERIOR DE COXA",
  "quad": "QUADRÍCEPS", "quadriceps": "QUADRÍCEPS", "adductor": "ADUTOR",
  "abductor": "ABDUTOR", "hip": "QUADRIL", "bar": "BARRA", "plate": "ANILHA",
  "bent": "CURVADO", "bent over": "CURVADO", "low": "BAIXO", "high": "ALTO",
  "up": "PARA CIMA", "down": "PARA BAIXO", "out": "PARA FORA", "in": "PARA DENTRO",
  "to": "ATÉ", "on": "EM", "and": "E", "with": "COM",
  "medium": "MÉDIA", "grip": "PEGADA", "position": "POSIÇÃO", "version": "VERSÃO",
  "style": "ESTILO", "handle": "PEGADOR", "parallel": "PARALELA", "v-bar": "V-BAR",
  "v bar": "V-BAR", "over": "SOBRE", "under": "SOB"
};

// Calculado UMA ÚNICA VEZ (fora da função), em vez de a cada chamada de traduzirNome.
// Chaves de 1 letra são filtradas, igual já era feito antes.
const CHAVES_DICIONARIO_ORDENADAS = Object.keys(DICIONARIO_PALAVRAS)
  .filter(chave => chave.length > 1)
  .sort((a, b) => b.length - a.length);

// Regex já pré-compiladas uma única vez, pareadas com a tradução correspondente.
const REGEX_DICIONARIO = CHAVES_DICIONARIO_ORDENADAS.map(chave => ({
  regex: new RegExp(`\\b${chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
  traducao: DICIONARIO_PALAVRAS[chave]
}));

function traduzirNome(nome) {
  if (!nome) return "";

  const lower = nome.toLowerCase().trim();

  if (TRADUCOES_EXATAS[lower]) {
    return TRADUCOES_EXATAS[lower];
  }

  let restante = " " + lower + " ";

  REGEX_DICIONARIO.forEach(({ regex, traducao }) => {
    // Regex com flag "g" guardam posição em lastIndex entre usos;
    // como reaproveitamos a mesma regex em várias chamadas, é preciso
    // resetar antes de cada teste, senão o resultado fica errado.
    regex.lastIndex = 0;
    if (regex.test(restante)) {
      regex.lastIndex = 0;
      restante = restante.replace(regex, ` ${traducao} `);
    }
  });

  const palavras = restante
    .split(/\s+/)
    .filter(p => p.length > 0)
    .map(p => p.toUpperCase());

  if (palavras.length === 0) {
    return nome.toUpperCase();
  }

  return palavras.join(" ");
}

let indiceExercicios = null;
let intervaloGifs = null;

async function carregarIndice() {
  if (indiceExercicios) return indiceExercicios;

  const loading = document.getElementById("exercicios-loading");
  loading.classList.remove("escondido");

  try {
    const resposta = await fetch("exercicios/indice.json");
    if (!resposta.ok) throw new Error(`Erro ${resposta.status}`);
    indiceExercicios = await resposta.json();
    loading.classList.add("escondido");
    return indiceExercicios;
  } catch (err) {
    logEvento("erro_fetch", { detalhe: `indice.json: ${err.message}` });
    loading.classList.add("escondido");
    document.getElementById("sem-exercicios").textContent =
      "ERRO AO CARREGAR OS EXERCÍCIOS: " + err.message;
    document.getElementById("sem-exercicios").classList.remove("escondido");
    return null;
  }
}

function montarFiltros() {
  const container = document.getElementById("filtros-musculo");
  container.innerHTML = "";

  MUSCULOS.forEach(m => {
    const btn = document.createElement("button");
    btn.className = "filtro-btn";
    btn.textContent = m.label;
    btn.onclick = () => selecionarMusculo(m, btn);
    container.appendChild(btn);
  });
}

async function selecionarMusculo(musculo, btnClicado) {
  document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("ativo"));
  btnClicado.classList.add("ativo");

  const lista = document.getElementById("lista-exercicios");
  const semEx = document.getElementById("sem-exercicios");

  lista.innerHTML = "";
  semEx.classList.add("escondido");

  if (intervaloGifs) {
    clearInterval(intervaloGifs);
    intervaloGifs = null;
  }

  const indice = await carregarIndice();
  if (!indice) return;

  const filtrados = indice.filter(ex => {
    const musculos = ex.primaryMuscles || [];
    return musculos.some(m => musculo.musculos.includes(m));
  });

  if (filtrados.length === 0) {
    semEx.textContent = "NENHUM EXERCÍCIO ENCONTRADO. TENTE OUTRO MÚSCULO.";
    semEx.classList.remove("escondido");
    return;
  }

  filtrados.forEach(ex => {
    const imagens = ex.images || [];
    const img0 = imagens[0] ? `exercicios/${imagens[0]}` : "";
    const img1 = imagens[1] ? `exercicios/${imagens[1]}` : "";

    const nome = traduzirNome(ex.name || "");
    const equip = traduzirNome(ex.equipment || "");

    const li = document.createElement("li");
    li.className = "card-exercicio";
    li.innerHTML = `
      <div class="gif-wrapper">
        <img src="${escaparHtml(img0)}" alt="${escaparHtml(nome)}" loading="lazy"
             data-img0="${escaparHtml(img0)}" data-img1="${escaparHtml(img1)}" data-estado="0">
      </div>
      <div class="info-exercicio">
        <p class="nome-exercicio">${escaparHtml(nome)}</p>
        <p class="equip-exercicio">EQUIPAMENTO: ${escaparHtml(equip)}</p>
      </div>
    `;

    li.querySelector("img").onerror = (e) => {
      e.target.parentElement.style.display = "none";
    };

    lista.appendChild(li);
  });

  iniciarIntervaloGifs();
}

// Extraída pra fora de selecionarMusculo() pra poder ser chamada de novo
// quando a aba volta a ficar visível (ver visibilitychange mais abaixo).
function iniciarIntervaloGifs() {
  if (intervaloGifs) {
    clearInterval(intervaloGifs);
  }

  intervaloGifs = setInterval(() => {
    document.querySelectorAll(".card-exercicio img").forEach(img => {
      const img0 = img.dataset.img0;
      const img1 = img.dataset.img1;
      if (!img0 || !img1) return;

      const estado = img.dataset.estado;
      if (estado === "0") {
        img.src = img1;
        img.dataset.estado = "1";
      } else {
        img.src = img0;
        img.dataset.estado = "0";
      }
    });
  }, 600);
}

montarFiltros();

// ====== PAUSAR/RETOMAR GIFS QUANDO A ABA FICA OCULTA ======
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (intervaloGifs) {
      clearInterval(intervaloGifs);
      intervaloGifs = null;
    }
  } else {
    // Só reinicia se ainda houver cards de exercício na tela
    if (document.querySelector(".card-exercicio img")) {
      iniciarIntervaloGifs();
    }
  }
});

// ====== VERIFICA SE JÁ ESTÁ LOGADO ======
// Única chamada de inicialização: getSession() só lê a sessão local (sem round-trip
// de validação ao servidor como getUser()), e popula usuarioAtual antes de tudo.
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  usuarioAtual = session?.user ?? null;
  if (usuarioAtual) {
    await entrarNoApp(usuarioAtual);
    logEvento("sessao_restaurada", {
      email: usuarioAtual.email,
      user_id: usuarioAtual.id,
      nome: usuarioAtual.email.split("@")[0]
    });
  }
})();