"""
Troca o número de versão em UM comando só:
  - index.html  ->  style.css?v=N  e  app.js?v=N
  - sw.js       ->  const CACHE = "academia-vN"

Use antes de publicar uma mudança:
    python atualizar_versao.py          (sobe +1 automaticamente)
    python atualizar_versao.py 20       (ou escolhe o número)
"""
import os
import re
import sys

PASTA = os.path.dirname(os.path.abspath(__file__))


def ler(nome):
    with open(os.path.join(PASTA, nome), encoding="utf-8", newline="") as f:
        return f.read()


def gravar(nome, texto):
    with open(os.path.join(PASTA, nome), "w", encoding="utf-8", newline="") as f:
        f.write(texto)


html = ler("index.html")
sw = ler("sw.js")

padrao_html = re.compile(r"((?:style\.css|app\.js)\?v=)(\d+)")
padrao_sw = re.compile(r'(const CACHE = "academia-v)(\d+)(")')

atuais = [int(m.group(2)) for m in padrao_html.finditer(html)]
atuais += [int(m.group(2)) for m in padrao_sw.finditer(sw)]
if not atuais:
    raise SystemExit("Não achei nenhum número de versão para trocar.")

if len(sys.argv) > 1:
    try:
        nova = int(sys.argv[1])
    except ValueError:
        raise SystemExit("Use um número inteiro. Exemplo: python atualizar_versao.py 20")
else:
    nova = max(atuais) + 1

html, n_html = padrao_html.subn(lambda m: f"{m.group(1)}{nova}", html)
sw, n_sw = padrao_sw.subn(lambda m: f"{m.group(1)}{nova}{m.group(3)}", sw)

if n_html != 2 or n_sw != 1:
    raise SystemExit(f"Algo estranho (index.html: {n_html} trocas, sw.js: {n_sw}). Nada foi alterado.")

gravar("index.html", html)
gravar("sw.js", sw)
print(f"✅ Versão atualizada para {nova} (index.html e sw.js).")
