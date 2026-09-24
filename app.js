// ====== CONFIGURAÇÃO ======
const SUPABASE_URL = "https://pkplgjhfbybvhnfredhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_7K-Y-m8hWqJc_Lctm0ukWw_M5AreP-B";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ⚠️ COLA SUA CHAVE DO RAPIDAPI AQUI
const RAPIDAPI_KEY = "78ea36a107msheff2853a9e2fc08p186b3fjsn82b279db6edb";

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
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const btnAcao = document.getElementById("btn-acao");
const msg = document.getElementById("msg");
const abaLogin = document.getElementById("aba-login");
const abaCadastro = document.getElementById("aba-cadastro");
const btnSeta = document.getElementById("btn-seta");

const modalPeso = document.getElementById("modal-peso");
const btnFecharModal = document.getElementById("btn-fechar-modal");
const inputPeso = document.getElementById("input-peso");
const btnSalvarPeso = document.getElementById("btn-salvar-peso");
const msgPeso = document.getElementById("msg-peso");
const listaHistorico = document.getElementById("lista-historico");
const semHistorico = document.getElementById("sem-historico");

let modo = "login";
nomeInput.style.display = "none";

// ====== TROCA DE ABAS (auth) ======
abaLogin.onclick = () => {
  modo = "login";
  abaLogin.classList.add("ativa");
  abaCadastro.classList.remove("ativa");
  btnAcao.textContent = "ENTRAR";
  msg.textContent = "";
  nomeInput.style.display = "none";
};

abaCadastro.onclick = () => {
  modo = "cadastro";
  abaCadastro.classList.add("ativa");
  abaLogin.classList.remove("ativa");
  btnAcao.textContent = "CRIAR CONTA";
  msg.textContent = "";
  nomeInput.style.display = "block";
};

// ====== ENVIO DO FORMULÁRIO ======
form.onsubmit = async (e) => {
  e.preventDefault();
  msg.textContent = "";
  msg.className = "msg";
  btnAcao.disabled = true;
  btnAcao.textContent = "CARREGANDO...";

  const email = emailInput.value.trim();
  const senha = senhaInput.value;
  const nome = nomeInput.value.trim();

  try {
    if (modo === "cadastro") {
      if (!nome) throw new Error("Preencha o nome.");

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: senha
      });

      if (error) throw error;

      await supabaseClient.from("alunos").insert({
        user_id: data.user.id,
        nome: nome
      });

      msg.className = "msg sucesso";
      msg.textContent = "CONTA CRIADA! ENTRANDO...";
      await entrarNoApp();

    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha
      });

      if (error) throw error;

      await entrarNoApp();
    }

  } catch (err) {
    msg.className = "msg erro";
    msg.textContent = traduzErro(err.message);
  } finally {
    btnAcao.disabled = false;
    btnAcao.textContent = modo === "login" ? "ENTRAR" : "CRIAR CONTA";
  }
};

// ====== ENTRAR NO APP ======
async function entrarNoApp() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: aluno } = await supabaseClient
    .from("alunos")
    .select("nome")
    .eq("user_id", user.id)
    .single();

  document.getElementById("nome-user").textContent =
    (aluno?.nome || user.email.split("@")[0]).toUpperCase();

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
  trocarAba("treino");

  telaAuth.classList.add("escondido");
  telaApp.classList.remove("escondido");
}

// ====== TROCA DE ABAS ======
function trocarAba(nome) {
  const abas = {
    treino: document.getElementById("aba-treino"),
    exercicios: document.getElementById("aba-exercicios"),
    historico: document.getElementById("aba-historico"),
    semana: document.getElementById("aba-semana")
  };
  const menus = {
    treino: document.getElementById("menu-treino"),
    exercicios: document.getElementById("menu-exercicios"),
    semana: document.getElementById("menu-semana")
  };
  const menusMob = {
    treino: document.getElementById("menu-treino-mob"),
    exercicios: document.getElementById("menu-exercicios-mob"),
    semana: document.getElementById("menu-semana-mob")
  };

  Object.values(abas).forEach(el => el.classList.add("escondido"));
  Object.values(menus).forEach(el => el.classList.remove("ativo"));
  Object.values(menusMob).forEach(el => el.classList.remove("ativo"));

  if (nome === "treino") {
    abas.treino.classList.remove("escondido");
    menus.treino.classList.add("ativo");
    menusMob.treino.classList.add("ativo");
  } else if (nome === "exercicios") {
    abas.exercicios.classList.remove("escondido");
    menus.exercicios.classList.add("ativo");
    menusMob.exercicios.classList.add("ativo");
  } else if (nome === "semana") {
    abas.semana.classList.remove("escondido");
    menus.semana.classList.add("ativo");
    menusMob.semana.classList.add("ativo");
  } else if (nome === "historico") {
    abas.historico.classList.remove("escondido");
  }

  document.getElementById("menu-mobile").classList.add("escondido");
}

document.getElementById("menu-treino").onclick = () => trocarAba("treino");
document.getElementById("menu-semana").onclick = () => trocarAba("semana");
document.getElementById("menu-exercicios").onclick = () => trocarAba("exercicios");
document.getElementById("menu-treino-mob").onclick = () => trocarAba("treino");
document.getElementById("menu-semana-mob").onclick = () => trocarAba("semana");
document.getElementById("menu-exercicios-mob").onclick = () => trocarAba("exercicios");

// ====== MODAL MEU PESO ======
function abrirModalPeso() {
  modalPeso.classList.remove("escondido");
  msgPeso.textContent = "";
  msgPeso.className = "msg";
  inputPeso.value = "";
  document.getElementById("menu-mobile").classList.add("escondido");
  setTimeout(() => inputPeso.focus(), 200);
}

function fecharModalPeso() {
  modalPeso.classList.add("escondido");
}

document.getElementById("menu-peso").onclick = abrirModalPeso;
document.getElementById("menu-peso-mob").onclick = abrirModalPeso;

modalPeso.onclick = (e) => {
  if (e.target === modalPeso) fecharModalPeso();
};

btnFecharModal.onclick = async () => {
  fecharModalPeso();
  await carregarHistorico();
  trocarAba("historico");
};

// ====== CARREGAR HISTÓRICO ======
async function carregarHistorico() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: pesos, error } = await supabaseClient
    .from("pesos")
    .select("id, data, peso")
    .eq("user_id", user.id)
    .order("data", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pesos:", error);
    return;
  }

  listaHistorico.innerHTML = "";

  if (!pesos || pesos.length === 0) {
    semHistorico.classList.remove("escondido");
    return;
  }

  semHistorico.classList.add("escondido");

  pesos.forEach(p => {
    const [ano, mes, dia] = p.data.split("-");
    const li = document.createElement("li");
    li.className = "linha-historico";
    li.innerHTML = `
      <span>${dia}/${mes}/${ano}</span>
      <span class="peso-valor">${p.peso} KG</span>
    `;
    listaHistorico.appendChild(li);
  });
}

// ====== SALVAR PESO ======
async function salvarPeso() {
  const valor = parseFloat(inputPeso.value);

  msgPeso.textContent = "";
  msgPeso.className = "msg";

  if (!valor || valor <= 0 || valor > 500) {
    msgPeso.textContent = "DIGITE UM PESO VÁLIDO.";
    msgPeso.className = "msg erro";
    return;
  }

  btnSalvarPeso.disabled = true;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    btnSalvarPeso.disabled = false;
    return;
  }

  const hoje = new Date().toISOString().split("T")[0];

  const { data: existente } = await supabaseClient
    .from("pesos")
    .select("id")
    .eq("user_id", user.id)
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
      .insert({ user_id: user.id, data: hoje, peso: valor });
    error = res.error;
  }

  btnSalvarPeso.disabled = false;

  if (error) {
    msgPeso.textContent = "ERRO: " + error.message;
    msgPeso.className = "msg erro";
    return;
  }

  msgPeso.textContent = "PESO SALVO! 💪";
  msgPeso.className = "msg sucesso";
  inputPeso.value = "";
}

btnSalvarPeso.onclick = salvarPeso;
inputPeso.addEventListener("keypress", (e) => {
  if (e.key === "Enter") salvarPeso();
});

// ====== RESUMO DE ONTEM ======
async function atualizarResumoOntem(userId) {
  const hoje = new Date().getDay();
  const resumo = await montarResumoOntem(hoje, userId);

  document.getElementById("resumo-ontem").innerHTML = resumo.texto;

  const pergunta = document.getElementById("pergunta-ontem");

  if (resumo.precisaPerguntar) {
    pergunta.classList.remove("escondido");
    pergunta.dataset.dataOntem = obterDataOntem();
    btnSeta.classList.add("escondido");
  } else {
    pergunta.classList.add("escondido");
    btnSeta.classList.remove("escondido");
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
  return d.toISOString().split("T")[0];
}

// ====== SALVAR CHECKIN ======
async function salvarCheckin(treinou) {
  const pergunta = document.getElementById("pergunta-ontem");
  const dataOntem = pergunta.dataset.dataOntem || obterDataOntem();

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { error } = await supabaseClient.from("checkins").insert({
    user_id: user.id,
    data: dataOntem,
    treinou: treinou
  });

  if (error) {
    alert("Erro ao salvar: " + error.message);
    return;
  }

  await atualizarResumoOntem(user.id);
}

document.getElementById("btn-treinei").onclick = () => salvarCheckin(true);
document.getElementById("btn-faltei").onclick = () => salvarCheckin(false);

// ====== SETA = DESFAZER ======
btnSeta.onclick = async () => {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const dataOntem = obterDataOntem();

  const { error } = await supabaseClient
    .from("checkins")
    .delete()
    .eq("user_id", user.id)
    .eq("data", dataOntem);

  if (error) {
    alert("Erro ao desfazer: " + error.message);
    return;
  }

  await atualizarResumoOntem(user.id);
};

// ====== SAIR ======
async function sair() {
  await supabaseClient.auth.signOut();
  telaApp.classList.add("escondido");
  telaAuth.classList.remove("escondido");
  form.reset();
  msg.textContent = "";
  nomeInput.style.display = "none";
  document.getElementById("menu-mobile").classList.add("escondido");
  fecharModalPeso();
}

document.getElementById("btn-sair").onclick = sair;
document.getElementById("btn-sair-mob").onclick = sair;

// ====== HAMBÚRGUER ======
document.getElementById("btn-hamburguer").onclick = () => {
  document.getElementById("menu-mobile").classList.toggle("escondido");
};

// ====== TRADUZIR ERROS ======
function traduzErro(m) {
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
  { api: "chest",       label: "PEITO" },
  { api: "back",        label: "COSTAS" },
  { api: "upper legs",  label: "PERNA" },
  { api: "lower legs",  label: "PANTURRILHA" },
  { api: "shoulders",   label: "OMBRO" },
  { api: "upper arms",  label: "BRAÇO" },
  { api: "lower arms",  label: "ANTEBRAÇO" },
  { api: "waist",       label: "ABDÔMEN" }
];

// ============================================================
// DICIONÁRIO DE TRADUÇÃO
// ============================================================

const TRADUCOES_EXATAS = {
  "barbell bench press": "SUPINO RETO COM BARRA",
  "dumbbell bench press": "SUPINO RETO COM HALTERES",
  "barbell incline bench press": "SUPINO INCLINADO COM BARRA",
  "dumbbell incline bench press": "SUPINO INCLINADO COM HALTERES",
  "barbell decline bench press": "SUPINO DECLINADO COM BARRA",
  "dumbbell decline bench press": "SUPINO DECLINADO COM HALTERES",
  "barbell wide bench press": "SUPINO RETO ABERTO",
  "barbell close grip bench press": "SUPINO PEGADA FECHADA",
  "barbell guillotine bench press": "SUPINO GUILLOTINA",
  "barbell reverse grip bench press": "SUPINO PEGADA INVERSA",
  "dumbbell fly": "CRUCIFIXO COM HALTERES",
  "dumbbell flyes": "CRUCIFIXO COM HALTERES",
  "cable crossover": "CRUCIFIXO NA POLIA ALTA",
  "low cable crossover": "CRUCIFIXO NA POLIA BAIXA",
  "push-up": "FLEXÃO",
  "push up": "FLEXÃO",
  "pull-up": "BARRA FIXA PRONADA",
  "pull up": "BARRA FIXA PRONADA",
  "chin-up": "BARRA FIXA SUPINADA",
  "chin up": "BARRA FIXA SUPINADA",
  "barbell deadlift": "LEVANTAMENTO TERRA",
  "deadlift": "LEVANTAMENTO TERRA",
  "romanian deadlift": "STIFF",
  "barbell romanian deadlift": "STIFF COM BARRA",
  "dumbbell romanian deadlift": "STIFF COM HALTERES",
  "barbell row": "REMADA CURVADA",
  "barbell bent over row": "REMADA CURVADA",
  "dumbbell row": "REMADA COM HALTERE",
  "one arm dumbbell row": "REMADA UNILATERAL",
  "seated cable row": "REMADA SENTADO NA POLIA",
  "lat pulldown": "PUXADA FRENTE",
  "wide grip lat pulldown": "PUXADA FRENTE ABERTA",
  "close grip lat pulldown": "PUXADA FRENTE FECHADA",
  "pull down": "PUXADA",
  "t-bar row": "REMADA CAVALINHO",
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
  "walking lunge": "AFUNDO CAMINHANDO",
  "hack squat": "AGACHAMENTO HACK",
  "hip thrust": "ELEVAÇÃO DE QUADRIL",
  "calf raise": "ELEVAÇÃO DE GÊMEOS",
  "standing calf raise": "ELEVAÇÃO DE GÊMEOS EM PÉ",
  "seated calf raise": "ELEVAÇÃO DE GÊMEOS SENTADO",
  "barbell shoulder press": "DESENVOLVIMENTO MILITAR COM BARRA",
  "dumbbell shoulder press": "DESENVOLVIMENTO COM HALTERES",
  "overhead press": "DESENVOLVIMENTO",
  "military press": "DESENVOLVIMENTO MILITAR",
  "arnold press": "DESENVOLVIMENTO ARNOLD",
  "lateral raise": "ELEVAÇÃO LATERAL",
  "side lateral raise": "ELEVAÇÃO LATERAL",
  "front raise": "ELEVAÇÃO FRONTAL",
  "rear delt fly": "CRUCIFIXO INVERSO",
  "face pull": "FACE PULL",
  "shrug": "ENCOLHIMENTO",
  "barbell shrug": "ENCOLHIMENTO COM BARRA",
  "dumbbell shrug": "ENCOLHIMENTO COM HALTERES",
  "barbell curl": "ROSCA DIRETA COM BARRA",
  "dumbbell curl": "ROSCA DIRETA COM HALTERES",
  "hammer curl": "ROSCA MARTELO",
  "preacher curl": "ROSCA SCOTT",
  "concentration curl": "ROSCA CONCENTRADA",
  "cable curl": "ROSCA NA POLIA",
  "incline dumbbell curl": "ROSCA INCLINADA",
  "triceps pushdown": "TRÍCEPS NA POLIA",
  "triceps extension": "TRÍCEPS TESTA",
  "skull crusher": "TRÍCEPS TESTA",
  "overhead triceps extension": "TRÍCEPS FRANCÊS",
  "bench dip": "MERGULHO NO BANCO",
  "dip": "MERGULHO NAS PARALELAS",
  "triceps dip": "MERGULHO NAS PARALELAS",
  "crunch": "ABDOMINAL",
  "sit-up": "ABDOMINAL COMPLETO",
  "sit up": "ABDOMINAL COMPLETO",
  "plank": "PRANCHA",
  "side plank": "PRANCHA LATERAL",
  "leg raise": "ELEVAÇÃO DE PERNAS",
  "hanging leg raise": "ELEVAÇÃO DE PERNAS SUSPENSO",
  "russian twist": "ABDOMINAL RUSSO",
  "bicycle crunch": "ABDOMINAL BICICLETA",
  "mountain climber": "ESCALADOR",
  "dead bug": "DEAD BUG",
  "cable crunch": "ABDOMINAL NA POLIA",
  "wrist curl": "ROSCA DE PUNHO",
  "reverse wrist curl": "ROSCA DE PUNHO INVERSA",
  "farmer walk": "CAMINHADA DO FAZENDEIRO",
  "step up": "SUBIDA NO BANCO",
  "box jump": "SALTO NA CAIXA",
  "burpee": "BURPEE",
  "jumping jack": "POLICHINELO",
  "good morning": "GOOD MORNING",
  "hyperextension": "EXTENSÃO LOMBAR",
  "back extension": "EXTENSÃO LOMBAR",
  "reverse fly": "CRUCIFIXO INVERSO",
  "pec deck": "VOADOR PEITORAL",
  "chest press": "SUPINO NA MÁQUINA",
  "shoulder press machine": "DESENVOLVIMENTO NA MÁQUINA",
  "assisted pull-up": "BARRA FIXA ASSISTIDA",
  "assisted dip": "MERGULHO ASSISTIDO",
  "cable fly": "CRUCIFIXO NA POLIA"
};

const DICIONARIO_PALAVRAS = {
  "barbell": "BARRA",
  "dumbbell": "HALTERES",
  "ez barbell": "BARRA W",
  "ez-bar": "BARRA W",
  "ez bar": "BARRA W",
  "cable": "POLIA",
  "machine": "MÁQUINA",
  "smith": "SMITH",
  "kettlebell": "KETTLEBELL",
  "band": "ELÁSTICO",
  "resistance band": "ELÁSTICO",
  "bodyweight": "PESO CORPORAL",
  "body weight": "PESO CORPORAL",
  "stability ball": "BOLA SUÍÇA",
  "medicine ball": "BOLA MEDICINAL",
  "bosu ball": "BOSU",
  "trap bar": "TRAP BAR",
  "leverage machine": "MÁQUINA ARTICULADA",
  "sled": "SLED",
  "roller": "ROLO",
  "wheel": "RODA",
  "rope": "CORDA",
  "bench": "BANCO",
  "incline": "INCLINADO",
  "decline": "DECLINADO",
  "flat": "RETO",
  "seated": "SENTADO",
  "standing": "EM PÉ",
  "lying": "DEITADO",
  "prone": "PRONADO",
  "supine": "SUPINO",
  "kneeling": "AJOELHADO",
  "hanging": "SUSPENSO",
  "wide": "ABERTO",
  "narrow": "FECHADO",
  "close": "FECHADO",
  "wide grip": "PEGADA ABERTA",
  "close grip": "PEGADA FECHADA",
  "reverse grip": "PEGADA INVERSA",
  "neutral grip": "PEGADA NEUTRA",
  "overhand grip": "PEGADA PRONADA",
  "underhand grip": "PEGADA SUPINADA",
  "one arm": "UNILATERAL",
  "single arm": "UNILATERAL",
  "two arm": "BILATERAL",
  "one leg": "UMA PERNA",
  "single leg": "UMA PERNA",
  "alternate": "ALTERNADO",
  "alternating": "ALTERNADO",
  "twisting": "COM ROTAÇÃO",
  "twist": "ROTAÇÃO",
  "reverse": "INVERSO",
  "assisted": "ASSISTIDO",
  "weighted": "COM PESO",
  "front": "FRONTAL",
  "back": "POSTERIOR",
  "rear": "POSTERIOR",
  "side": "LATERAL",
  "lateral": "LATERAL",
  "overhead": "ACIMA DA CABEÇA",
  "behind neck": "ATRÁS DA NUCA",
  "behind head": "ATRÁS DA CABEÇA",
  "behind back": "ATRÁS DAS COSTAS",
  "bench press": "SUPINO",
  "chest press": "SUPINO",
  "shoulder press": "DESENVOLVIMENTO",
  "overhead press": "DESENVOLVIMENTO",
  "military press": "DESENVOLVIMENTO MILITAR",
  "push press": "DESENVOLVIMENTO COM IMPULSO",
  "leg press": "LEG PRESS",
  "press": "PRESS",
  "squat": "AGACHAMENTO",
  "deadlift": "LEVANTAMENTO TERRA",
  "row": "REMADA",
  "pulldown": "PUXADA",
  "pull down": "PUXADA",
  "pull-up": "BARRA FIXA",
  "pull up": "BARRA FIXA",
  "chin-up": "BARRA FIXA SUPINADA",
  "chin up": "BARRA FIXA SUPINADA",
  "push-up": "FLEXÃO",
  "push up": "FLEXÃO",
  "curl": "ROSCA",
  "extension": "EXTENSÃO",
  "flexion": "FLEXÃO",
  "fly": "CRUCIFIXO",
  "flyes": "CRUCIFIXO",
  "raise": "ELEVAÇÃO",
  "shrug": "ENCOLHIMENTO",
  "crunch": "ABDOMINAL",
  "lunge": "AFUNDO",
  "step up": "SUBIDA",
  "dip": "MERGULHO",
  "kickback": "COICE",
  "pushdown": "PULLEY",
  "pulley": "PULLEY",
  "skull crusher": "TRÍCEPS TESTA",
  "clean": "CLEAN",
  "jerk": "ARRANCO",
  "snatch": "ARRANCO",
  "thruster": "THRUSTER",
  "swing": "SWING",
  "hip thrust": "ELEVAÇÃO DE QUADRIL",
  "glute bridge": "PONTE DE GLÚTEO",
  "calf raise": "ELEVAÇÃO DE GÊMEOS",
  "calf": "GÊMEOS",
  "wrist": "PUNHO",
  "forearm": "ANTEBRAÇO",
  "biceps": "BÍCEPS",
  "triceps": "TRÍCEPS",
  "chest": "PEITO",
  "shoulder": "OMBRO",
  "shoulders": "OMBROS",
  "leg": "PERNA",
  "legs": "PERNAS",
  "upper": "SUPERIOR",
  "lower": "INFERIOR",
  "arm": "BRAÇO",
  "arms": "BRAÇOS",
  "hand": "MÃO",
  "knee": "JOELHO",
  "head": "CABEÇA",
  "neck": "PESCOÇO",
  "waist": "CINTURA",
  "abs": "ABDÔMEN",
  "core": "CORE",
  "glute": "GLÚTEO",
  "glutes": "GLÚTEOS",
  "hamstring": "POSTERIOR DE COXA",
  "quad": "QUADRÍCEPS",
  "quadriceps": "QUADRÍCEPS",
  "adductor": "ADUTOR",
  "abductor": "ABDUTOR",
  "hip": "QUADRIL",
  "bar": "BARRA",
  "plate": "ANILHA",
  "bent": "CURVADO",
  "bent over": "CURVADO",
  "low": "BAIXO",
  "high": "ALTO",
  "up": "PARA CIMA",
  "down": "PARA BAIXO",
  "out": "PARA FORA",
  "in": "PARA DENTRO",
  "to": "ATÉ",
  "on": "EM",
  "and": "E",
  "with": "COM",
  "the": "",
  "a": "",
  "an": ""
};

function traduzirNome(nome) {
  if (!nome) return "";

  const lower = nome.toLowerCase().trim();

  if (TRADUCOES_EXATAS[lower]) {
    return TRADUCOES_EXATAS[lower];
  }

  const chaves = Object.keys(DICIONARIO_PALAVRAS).sort((a, b) => b.length - a.length);
  let restante = " " + lower + " ";

  chaves.forEach(chave => {
    const regex = new RegExp(`\\b${chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (regex.test(restante)) {
      restante = restante.replace(regex, ` ${DICIONARIO_PALAVRAS[chave]} `);
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

function montarFiltros() {
  const container = document.getElementById("filtros-musculo");
  container.innerHTML = "";

  MUSCULOS.forEach(m => {
    const btn = document.createElement("button");
    btn.className = "filtro-btn";
    btn.textContent = m.label;
    btn.onclick = () => selecionarMusculo(m.api, m.label, btn);
    container.appendChild(btn);
  });
}

async function selecionarMusculo(apiNome, label, btnClicado) {
  document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("ativo"));
  btnClicado.classList.add("ativo");

  const lista = document.getElementById("lista-exercicios");
  const loading = document.getElementById("exercicios-loading");
  const semEx = document.getElementById("sem-exercicios");

  lista.innerHTML = "";
  semEx.classList.add("escondido");
  loading.classList.remove("escondido");

  const cacheKey = `exercicios_v3_${apiNome}`;
  let exercicios = null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      exercicios = JSON.parse(cached);
    }
  } catch (e) {}

  if (!exercicios) {
    try {
      const resposta = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(apiNome)}?limit=20`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "exercisedb.p.rapidapi.com"
          }
        }
      );

      if (!resposta.ok) {
        throw new Error(`Erro ${resposta.status}`);
      }

      exercicios = await resposta.json();

      try {
        localStorage.setItem(cacheKey, JSON.stringify(exercicios));
      } catch (e) {}

    } catch (err) {
      loading.classList.add("escondido");
      semEx.textContent = "ERRO AO CARREGAR: " + err.message;
      semEx.classList.remove("escondido");
      return;
    }
  }

  loading.classList.add("escondido");

  if (!exercicios || exercicios.length === 0) {
    semEx.textContent = "NENHUM EXERCÍCIO ENCONTRADO. TENTE OUTRO MÚSCULO.";
    semEx.classList.remove("escondido");
    return;
  }

  exercicios.forEach(ex => {
    const gif = ex.gifUrl || "";
    const nome = traduzirNome(ex.name || "");
    const equip = traduzirNome(ex.equipment || "");

    const li = document.createElement("li");
    li.className = "card-exercicio";
    li.innerHTML = `
      <div class="gif-wrapper">
        <img src="${gif}" alt="${nome}" loading="lazy">
      </div>
      <div class="info-exercicio">
        <p class="nome-exercicio">${nome}</p>
        <p class="equip-exercicio">EQUIPAMENTO: ${equip}</p>
      </div>
    `;

    li.querySelector("img").onerror = (e) => {
      e.target.parentElement.style.display = "none";
    };

    lista.appendChild(li);
  });
}

montarFiltros();

// ====== VERIFICA SE JÁ ESTÁ LOGADO ======
(async () => {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) entrarNoApp();
})();