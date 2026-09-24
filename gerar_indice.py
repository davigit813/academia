import os
import json

# Caminho da pasta de exercícios
PASTA = "exercicios"
SAIDA = os.path.join(PASTA, "indice.json")

exercicios = []
erros = []

# Lista todos os .json da pasta (ignora o indice.json se já existir)
arquivos = [f for f in os.listdir(PASTA) if f.endswith(".json") and f != "indice.json"]

print(f"Encontrados {len(arquivos)} arquivos .json")

for i, arquivo in enumerate(arquivos, 1):
    caminho = os.path.join(PASTA, arquivo)
    try:
        with open(caminho, "r", encoding="utf-8") as f:
            dados = json.load(f)
            exercicios.append(dados)
    except Exception as e:
        erros.append((arquivo, str(e)))
    
    # Mostra progresso a cada 100
    if i % 100 == 0:
        print(f"  Processados {i}...")

# Salva o índice
with open(SAIDA, "w", encoding="utf-8") as f:
    json.dump(exercicios, f, ensure_ascii=False, indent=2)

print()
print(f"✅ Pronto! {len(exercicios)} exercícios salvos em {SAIDA}")
if erros:
    print(f"⚠️  {len(erros)} erros:")
    for arq, err in erros[:10]:
        print(f"   - {arq}: {err}")