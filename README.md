# academia ☯️

Logbook de treino pessoal (PWA). HTML + CSS + JavaScript puros, com Supabase (login e banco de dados).

## Estrutura

| Arquivo | Para quê |
|---|---|
| `index.html`, `style.css`, `app.js` | O site |
| `sw.js`, `manifest.json` | Instalação no celular e uso offline (PWA) |
| `exercicios/` | Imagens e JSONs dos exercícios |
| `gerar_indice.py` | Gera `exercicios/indice.json` (índice leve) |
| `atualizar_versao.py` | Troca o número de versão do site (cache) de uma vez |
| `supabase/seguranca.sql` | Regras de segurança do banco (rodar uma vez) |
| `supabase/functions/log-evento/index.ts` | Exemplo reforçado da função que manda eventos pro Discord |
| `_headers` | Cabeçalhos de segurança (Netlify / Cloudflare Pages) |

## Rodar no seu computador

Abra a pasta no VS Code e use a extensão **Live Server**, ou, no terminal:

```
python -m http.server 8000
```

e acesse `http://localhost:8000`.

## Publicar uma mudança

1. `python atualizar_versao.py` (troca `?v=` do `index.html` e o cache do `sw.js` juntos)
2. Envie os arquivos para o site / `git push`

Se você mexeu nos exercícios: `python gerar_indice.py` antes.

## Segurança — checklist

- [ ] Rodar `supabase/seguranca.sql` no SQL Editor do Supabase (liga o RLS: cada aluno só vê os próprios dados)
- [ ] Authentication > Providers > Email: ver se a confirmação de email está como você quer
- [ ] Depois que os amigos criarem conta, considerar desligar novos cadastros (Authentication > Sign In / Providers)
- [ ] Se usar Netlify ou Cloudflare Pages, manter o arquivo `_headers` na raiz
- [ ] A função `log-evento`: conferir o exemplo em `supabase/functions/log-evento/index.ts`
- [ ] Nunca colocar a chave `service_role` no código do site (só a chave `publishable`, que já está no `app.js`)
- [ ] Nunca subir arquivos `.env` (o `.gitignore` já bloqueia)
