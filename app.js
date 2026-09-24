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

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

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

const inputPeso = document.getElementById("input-peso");
const btnSalvarPeso = document.getElementById("btn-salvar-peso");
const msgPeso = document.getElementById("msg-peso");
const listaHistorico = document.getElementById("lista-historico");
const semHistorico = document.getElementById("sem-historico");

let modo = "login";
let graficoPeso = null;
let dadosPesosCache = [];

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
async function trocarAba(nome) {
  const abas = {
    treino: document.getElementById("aba-treino"),
    addPeso: document.getElementById("aba-add-peso"),
    historico: document.getElementById("aba-historico"),
    grafico: document.getElementById("aba-grafico"),
    exercicios: document.getElementById("aba-exercicios"),
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
  } else if (nome === "addPeso") {
    abas.addPeso.classList.remove("escondido");
  } else if (nome === "historico") {
    abas.historico.classList.remove("escondido");
  } else if (nome === "grafico") {
    abas.grafico.classList.remove("escondido");
    await carregarGrafico();
  } else if (nome === "exercicios") {
    abas.exercicios.classList.remove("escondido");
    menus.exercicios.classList.add("ativo");
    menusMob.exercicios.classList.add("ativo");
  } else if (nome === "semana") {
    abas.semana.classList.remove("escondido");
    menus.semana.classList.add("ativo");
    menusMob.semana.classList.add("ativo");
  }

  document.getElementById("menu-mobile").classList.add("escondido");
  document.getElementById("dropdown-peso").classList.remove("aberto");
  document.getElementById("submenu-peso-mob").classList.remove("aberto");
}

document.getElementById("menu-treino").onclick = () => trocarAba("treino");
document.getElementById("menu-semana").onclick = () => trocarAba("semana");
document.getElementById("menu-exercicios").onclick = () => trocarAba("exercicios");
document.getElementById("menu-treino-mob").onclick = () => trocarAba("treino");
document.getElementById("menu-semana-mob").onclick = () => trocarAba("semana");
document.getElementById("menu-exercicios-mob").onclick = () => trocarAba("exercicios");

// ====== DROPDOWN MEU PESO (desktop) ======
document.getElementById("menu-peso").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("dropdown-peso").classList.toggle("aberto");
};

document.getElementById("dropdown-peso").onclick = (e) => {
  e.stopPropagation();
};

// Fecha dropdown ao clicar fora
document.addEventListener("click", () => {
  document.getElementById("dropdown-peso").classList.remove("aberto");
});

document.getElementById("btn-add-peso").onclick = () => {
  document.getElementById("dropdown-peso").classList.remove("aberto");
  trocarAba("addPeso");
};

document.getElementById("btn-historico").onclick = async () => {
  document.getElementById("dropdown-peso").classList.remove("aberto");
  await carregarHistorico();
  trocarAba("historico");
};

document.getElementById("btn-grafico").onclick = () => {
  document.getElementById("dropdown-peso").classList.remove("aberto");
  trocarAba("grafico");
};

// ====== DROPDOWN MEU PESO (mobile) ======
document.getElementById("menu-peso-mob").onclick = () => {
  document.getElementById("submenu-peso-mob").classList.toggle("aberto");
};

document.getElementById("btn-add-peso-mob").onclick = () => {
  trocarAba("addPeso");
};

document.getElementById("btn-historico-mob").onclick = async () => {
  await carregarHistorico();
  trocarAba("historico");
};

document.getElementById("btn-grafico-mob").onclick = () => {
  trocarAba("grafico");
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

// ====== GRÁFICO ======
async function carregarGrafico() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: pesos, error } = await supabaseClient
    .from("pesos")
    .select("id, data, peso")
    .eq("user_id", user.id)
    .order("data", { ascending: true });

  if (error) {
    console.error("Erro:", error);
    return;
  }

  dadosPesosCache = pesos || [];

  // Popula o select de meses
  popularSelectMeses();

  // Renderiza o gráfico com filtro padrão (últimos 30 dias)
  renderizarGrafico("30dias");
}

function popularSelectMeses() {
  const select = document.getElementById("select-mes");
  const meses = new Set();

  dadosPesosCache.forEach(p => {
    const [ano, mes] = p.data.split("-");
    meses.add(`${ano}-${mes}`);
  });

  select.innerHTML = '<option value="">SELECIONE O MÊS</option>';

  [...meses].sort().reverse().forEach(m => {
    const [ano, mes] = m.split("-");
    const option = document.createElement("option");
    option.value = m;
    option.textContent = `${NOMES_MESES[parseInt(mes) - 1]} / ${ano}`;
    select.appendChild(option);
  });
}

document.getElementById("filtro-30dias").onclick = () => {
  document.getElementById("filtro-30dias").classList.add("ativo");
  document.getElementById("select-mes").value = "";
  renderizarGrafico("30dias");
};

document.getElementById("select-mes").onchange = (e) => {
  const valor = e.target.value;
  document.getElementById("filtro-30dias").classList.remove("ativo");

  if (valor) {
    renderizarGrafico("mes", valor);
  }
};

function renderizarGrafico(tipo, valor) {
  const canvas = document.getElementById("grafico-peso");
  const semGrafico = document.getElementById("sem-grafico");

  if (!dadosPesosCache || dadosPesosCache.length === 0) {
    canvas.classList.add("escondido");
    semGrafico.classList.remove("escondido");
    if (graficoPeso) {
      graficoPeso.destroy();
      graficoPeso = null;
    }
    return;
  }

  canvas.classList.remove("escondido");
  semGrafico.classList.add("escondido");

  // Filtra os dados
  let filtrados = [];
  const hoje = new Date();

  if (tipo === "30dias") {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);

    filtrados = dadosPesosCache.filter(p => {
      const d = new Date(p.data + "T00:00:00");
      return d >= limite && d <= hoje;
    });

  } else if (tipo === "mes" && valor) {
    const [ano, mes] = valor.split("-");
    filtrados = dadosPesosCache.filter(p => {
      const [a, m] = p.data.split("-");
      return a === ano && m === mes;
    });
  }

  if (filtrados.length === 0) {
    canvas.classList.add("escondido");
    semGrafico.classList.remove("escondido");
    if (graficoPeso) {
      graficoPeso.destroy();
      graficoPeso = null;
    }
    return;
  }

  // Descobre o mês/ano pra montar o eixo X fixo
  let anoRef, mesRef;
  if (tipo === "mes" && valor) {
    [anoRef, mesRef] = valor.split("-");
  } else {
    // Pega o mês do último registro
    const ultimo = filtrados[filtrados.length - 1];
    [anoRef, mesRef] = ultimo.data.split("-");
  }

  const diasNoMes = new Date(parseInt(anoRef), parseInt(mesRef), 0).getDate();

  // Monta labels com TODOS os dias do mês
  const labels = [];
  for (let d = 1; d <= diasNoMes; d++) {
    labels.push(String(d).padStart(2, "0"));
  }

  // Mapeia os pesos nos dias certos (resto fica null)
  const valores = new Array(diasNoMes).fill(null);
  const cores = new Array(diasNoMes).fill(null);

  filtrados.forEach(p => {
    const [a, m, dia] = p.data.split("-");
    if (a === anoRef && m === mesRef) {
      const index = parseInt(dia) - 1;
      valores[index] = parseFloat(p.peso);
    }
  });

  // Calcula min/max reais (só dos valores não nulos)
  const numeros = valores.filter(v => v !== null);
  const minReal = Math.min(...numeros);
  const maxReal = Math.max(...numeros);
  const range = maxReal - minReal;

  // Margem: 30% do range (pra dar respiro visual)
  const margem = range === 0 ? 2 : range * 0.4;
  const minY = Math.max(0, minReal - margem);
  const maxY = maxReal + margem;

  // Cor dos pontos: azul se subiu, vermelho se desceu (comparado ao ponto ANTERIOR com valor)
  const pontoCores = valores.map((v, i) => {
    if (v === null) return null;

    // Procura o valor anterior não nulo
    for (let j = i - 1; j >= 0; j--) {
      if (valores[j] !== null) {
        return v >= valores[j] ? "#4a9eff" : "#e30613";
      }
    }
    return "#4a9eff"; // primeiro ponto é azul
  });

  // Cor dos segmentos
  const segmentCores = valores.map((v, i) => {
    if (v === null) return null;

    for (let j = i - 1; j >= 0; j--) {
      if (valores[j] !== null) {
        return v >= valores[j] ? "#4a9eff" : "#e30613";
      }
    }
    return "#4a9eff";
  });

  if (graficoPeso) {
    graficoPeso.destroy();
  }

  graficoPeso = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Peso (kg)",
        data: valores,
        borderColor: "#4a9eff",
        borderWidth: 3,
        tension: 0.3,
        fill: false,
        spanGaps: true, // conecta pontos mesmo com dias vazios no meio
        pointBackgroundColor: pontoCores,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: (ctx) => {
          // Só mostra bolinha nos dias com registro
          return valores[ctx.dataIndex] !== null ? 7 : 0;
        },
        pointHoverRadius: 9,
        segment: {
          borderColor: ctx => {
            const i = ctx.p1DataIndex;
            if (segmentCores[i] === null) return "#4a9eff";
            return segmentCores[i];
          },
          borderDash: ctx => {
            const i = ctx.p1DataIndex;
            const j = ctx.p0DataIndex;
            // Tracejado se tem dias vazios no meio
            for (let k = j + 1; k < i; k++) {
              if (valores[k] === null) return [5, 5];
            }
            return undefined;
          }
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1a1a1a",
          titleColor: "#e30613",
          bodyColor: "#fff",
          borderColor: "#e30613",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "Anton", size: 14 },
          bodyFont: { family: "Inter", size: 13, weight: "bold" },
          callbacks: {
            title: (items) => {
              const dia = items[0].label;
              return `DIA ${dia}/${mesRef}`;
            },
            label: (ctx) => `${ctx.parsed.y} kg`
          }
        }
      },
      scales: {
        y: {
          min: minY,
          max: maxY,
          ticks: {
            color: "#888",
            font: { family: "Inter", size: 11, weight: "600" },
            callback: (v) => v.toFixed(1) + " kg",
            maxTicksLimit: 6
          },
          grid: { color: "#222" }
        },
        x: {
          ticks: {
            color: "#888",
            font: { family: "Inter", size: 10, weight: "600" },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 15
          },
          grid: { color: "#1a1a1a" }
        }
      }
    }
  });
}

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

function traduzirNome(nome) {
  if (!nome) return "";

  const lower = nome.toLowerCase().trim();

  if (TRADUCOES_EXATAS[lower]) {
    return TRADUCOES_EXATAS[lower];
  }

  const chaves = Object.keys(DICIONARIO_PALAVRAS).sort((a, b) => b.length - a.length);
  let restante = " " + lower + " ";

  chaves.forEach(chave => {
    if (chave.length <= 1) return;

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
        <img src="${img0}" alt="${nome}" loading="lazy"
             data-img0="${img0}" data-img1="${img1}" data-estado="0">
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

// ====== VERIFICA SE JÁ ESTÁ LOGADO ======
(async () => {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) entrarNoApp();
})();