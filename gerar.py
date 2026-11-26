"""Gera as páginas do site nos 4 idiomas.

Edite os modelos em _modelos/ e os textos em _textos/<idioma>.json, depois rode:
    python gerar.py
Francês sai na raiz; nl/, de/ e en/ em subpastas. Não edite os .html gerados à mão.
"""
import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).parent
# Por enquanto só francês (decisão de 19/11). Para publicar os outros idiomas,
# volte para ["fr", "nl", "de", "en"]: os textos estão em _textos/ (desatualizados a partir daqui).
IDIOMAS = ["fr"]  # o primeiro fica na raiz
PAGINAS = ["index.html", "kit-fraises.html", "accessoires.html", "panier.html", "merci.html", "legal.html"]
CHAVE = re.compile(r"\{\{(\w+)\}\}")


def pasta(lang):
    return "" if lang == IDIOMAS[0] else lang + "/"


def seletor(lang, pagina, textos):
    """Lista de idiomas no cabeçalho (sem JavaScript). Some com um idioma só."""
    if len(IDIOMAS) < 2:
        return ""
    volta = "" if lang == IDIOMAS[0] else "../"
    itens = []
    for outro in IDIOMAS:
        atual = ' aria-current="page"' if outro == lang else ""
        href = volta + pasta(outro) + pagina
        itens.append(
            f'<li><a href="{href}" hreflang="{outro}" lang="{outro}"{atual}>{textos[outro]["_nome"]}</a></li>'
        )
    return (
        '<details class="langues">'
        f'<summary aria-label="{textos[lang]["langue_aria"]}">{lang.upper()}</summary>'
        f'<ul>{"".join(itens)}</ul></details>'
    )


def alternativas(pagina):
    if len(IDIOMAS) < 2:
        return ""
    linhas = [f'<link rel="alternate" hreflang="{l}" href="/{pasta(l)}{pagina}">' for l in IDIOMAS]
    linhas.append(f'<link rel="alternate" hreflang="x-default" href="/{pagina}">')
    return "\n".join(linhas)


def main():
    textos = {l: json.loads((RAIZ / "_textos" / f"{l}.json").read_text(encoding="utf-8")) for l in IDIOMAS}

    # Toda chave precisa existir em todos os idiomas.
    base = set(textos[IDIOMAS[0]])
    for l in IDIOMAS[1:]:
        falta, sobra = base - set(textos[l]), set(textos[l]) - base
        if falta or sobra:
            raise SystemExit(f"{l}.json: faltam {sorted(falta)}, sobram {sorted(sobra)}")

    for pagina in PAGINAS:
        modelo = (RAIZ / "_modelos" / pagina).read_text(encoding="utf-8")
        for lang in IDIOMAS:
            t = textos[lang]
            extras = {
                "lang": lang,
                "r": "" if lang == IDIOMAS[0] else "../",
                "langues": seletor(lang, pagina, textos),
                "hreflang": alternativas(pagina),
            }

            def troca(m):
                k = m.group(1)
                if k in extras:
                    return extras[k]
                if k not in t:
                    raise SystemExit(f"{pagina}: chave {{{{{k}}}}} não existe em {lang}.json")
                return html.escape(t[k], quote=True)

            saida = RAIZ / pasta(lang) / pagina
            saida.parent.mkdir(exist_ok=True)
            saida.write_text(CHAVE.sub(troca, modelo), encoding="utf-8", newline="\n")
            print("ok", saida.relative_to(RAIZ))


if __name__ == "__main__":
    main()
