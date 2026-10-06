"""
Gera exercicios/indice.json — um índice LEVE com só o que o site usa.

Como usar (de qualquer pasta):
    python gerar_indice.py

O site só precisa de: nome, equipamento, músculos principais e imagens.
Guardar só isso deixa o arquivo bem menor (carrega mais rápido no celular).
Se um dia o site precisar de mais campos (ex.: "instructions"), é só
acrescentar o nome do campo na lista CAMPOS abaixo.
"""
import os
import json

BASE = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.join(BASE, "exercicios")
SAIDA = os.path.join(PASTA, "indice.json")

CAMPOS = ["id", "name", "equipment", "primaryMuscles", "images"]

if not os.path.isdir(PASTA):
    raise SystemExit(f"Pasta não encontrada: {PASTA}")

exercicios = []
erros = []

# Lista todos os .json da pasta (ignora o indice.json se já existir)
arquivos = sorted(f for f in os.listdir(PASTA) if f.endswith(".json") and f != "indice.json")
print(f"Encontrados {len(arquivos)} arquivos .json")

for i, arquivo in enumerate(arquivos, 1):
    caminho = os.path.join(PASTA, arquivo)
    try:
        with open(caminho, "r", encoding="utf-8") as f:
            dados = json.load(f)
        if not isinstance(dados, dict):
            raise ValueError("o arquivo não é um exercício (esperava um objeto JSON)")
        exercicios.append({campo: dados[campo] for campo in CAMPOS if campo in dados})
    except Exception as e:
        erros.append((arquivo, str(e)))

    # Mostra progresso a cada 100
    if i % 100 == 0:
        print(f"  Processados {i}...")

# Ordem estável (facilita comparar versões)
exercicios.sort(key=lambda ex: str(ex.get("name", "")).lower())

# Salva compacto (sem espaços sobrando)
with open(SAIDA, "w", encoding="utf-8") as f:
    json.dump(exercicios, f, ensure_ascii=False, separators=(",", ":"))

tamanho_kb = os.path.getsize(SAIDA) / 1024
print()
print(f"✅ Pronto! {len(exercicios)} exercícios salvos em {SAIDA} ({tamanho_kb:.0f} KB)")
if erros:
    print(f"⚠️  {len(erros)} erros:")
    for arq, err in erros[:10]:
        print(f"   - {arq}: {err}")
