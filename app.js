// ====== CONFIGURAÇÃO ======
const SUPABASE_URL = "https://pkplgjhfbybvhnfredhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_7K-Y-m8hWqJc_Lctm0ukWw_M5AreP-B";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ====== TABELA DE TREINOS ======
const TREINOS = {
  1: "Peito, ombro e bíceps",
  2: "Costas, ombro e tríceps",
  3: "Perna",
  4: "Peito, ombro e bíceps",
  5: "Costas, ombro e tríceps",
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

  // Monta lista da semana
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

  // Mostra aba TREINO por padrão
  trocarAba("treino");

  telaAuth.classList.add("escondido");
  telaApp.classList.remove("escondido");
}

// ====== TROCA DE ABAS (app) ======
function trocarAba(nome) {
  const abaTreino = document.getElementById("aba-treino");
  const abaSemana = document.getElementById("aba-semana");
  const menuTreino = document.getElementById("menu-treino");
  const menuSemana = document.getElementById("menu-semana");
  const menuTreinoMob = document.getElementById("menu-treino-mob");
  const menuSemanaMob = document.getElementById("menu-semana-mob");

  if (nome === "treino") {
    abaTreino.classList.remove("escondido");
    abaSemana.classList.add("escondido");
    menuTreino.classList.add("ativo");
    menuSemana.classList.remove("ativo");
    menuTreinoMob?.classList.add("ativo");
    menuSemanaMob?.classList.remove("ativo");
  } else {
    abaTreino.classList.add("escondido");
    abaSemana.classList.remove("escondido");
    menuTreino.classList.remove("ativo");
    menuSemana.classList.add("ativo");
    menuTreinoMob?.classList.remove("ativo");
    menuSemanaMob?.classList.add("ativo");
  }

  // Fecha menu mobile
  document.getElementById("menu-mobile").classList.add("escondido");
}

document.getElementById("menu-treino").onclick = () => trocarAba("treino");
document.getElementById("menu-semana").onclick = () => trocarAba("semana");
document.getElementById("menu-treino-mob").onclick = () => trocarAba("treino");
document.getElementById("menu-semana-mob").onclick = () => trocarAba("semana");

// ====== HAMBÚRGUER ======
document.getElementById("btn-hamburguer").onclick = () => {
  document.getElementById("menu-mobile").classList.toggle("escondido");
};

// ====== ATUALIZA RESUMO DE ONTEM ======
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

// ====== MONTA RESUMO ======
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

// ====== DATA DE ONTEM ======
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

// ====== SETA = DESFAZER (sem confirmar) ======
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
}

document.getElementById("btn-sair").onclick = sair;
document.getElementById("btn-sair-mob").onclick = sair;

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

// ====== VERIFICA SE JÁ ESTÁ LOGADO ======
(async () => {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) entrarNoApp();
})();