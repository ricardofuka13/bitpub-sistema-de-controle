#!/usr/bin/env python3
"""Atualiza site/noticias.json com manchetes recentes sobre Bitcoin.

Lê feeds RSS públicos, guarda só título, fonte, data e link da matéria
original (nada do texto das matérias) e escolhe as mais recentes.
Se nenhum feed responder, mantém o arquivo atual sem mexer.
"""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

FEEDS = [
    ("Livecoins", "https://livecoins.com.br/feed/"),
    ("Portal do Bitcoin", "https://portaldobitcoin.com/feed/"),
    ("Cointelegraph Brasil", "https://br.cointelegraph.com/rss"),
]
MAXIMO = 6
SAIDA = Path(__file__).resolve().parent.parent / "site" / "noticias.json"
BITCOIN = re.compile(r"bitcoin|btc|satoshi|lightning|halving", re.I)


def baixar(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (BitPub noticias)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def ler_feed(fonte, url):
    itens = []
    for it in ET.fromstring(baixar(url)).iter("item"):
        titulo = " ".join((it.findtext("title") or "").split())
        link = (it.findtext("link") or "").strip()
        if not titulo or not link.startswith(("http://", "https://")):
            continue
        try:
            data = parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc)
        except Exception:
            continue
        cats = " ".join((c.text or "") for c in it.findall("category"))
        itens.append({
            "fonte": fonte, "titulo": titulo, "link": link,
            "data": data.isoformat(), "_bitcoin": bool(BITCOIN.search(titulo + " " + cats)),
        })
    return itens


def escolher(todas):
    vistos, unicas = set(), []
    for n in sorted(todas, key=lambda n: n["data"], reverse=True):
        if n["link"] not in vistos:
            vistos.add(n["link"])
            unicas.append(n)
    esp = [n for n in unicas if n["_bitcoin"]][:MAXIMO]
    resto = [n for n in unicas if not n["_bitcoin"]][: MAXIMO - len(esp)]
    final = sorted(esp + resto, key=lambda n: n["data"], reverse=True)
    return [{k: v for k, v in n.items() if not k.startswith("_")} for n in final]


def main():
    todas = []
    for fonte, url in FEEDS:
        try:
            todas += ler_feed(fonte, url)
        except Exception as e:
            print(f"Aviso: {fonte} não respondeu ({e})", file=sys.stderr)
    noticias = escolher(todas)
    if not noticias:
        print("Nenhuma notícia obtida; arquivo mantido.", file=sys.stderr)
        return 1
    antigas = None
    if SAIDA.exists():
        try:
            antigas = json.loads(SAIDA.read_text(encoding="utf-8")).get("noticias")
        except Exception:
            pass
    if antigas == noticias:
        print("Sem novidades.")
        return 0
    agora = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    SAIDA.write_text(json.dumps({"atualizado": agora, "noticias": noticias}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(noticias)} notícias salvas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
