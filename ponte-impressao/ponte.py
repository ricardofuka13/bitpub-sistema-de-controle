#!/usr/bin/env python3
"""Ponte de impressão da BitPub.

Fica ligada no computador da loja. A cada 2 segundos pergunta ao sistema se há
fichas para imprimir e manda cada uma para a impressora de rede (porta 9100).
Só usa o Python 3 que já vem no computador (nenhum pacote para instalar).
"""
import base64
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request

PASTA = os.path.dirname(os.path.abspath(__file__))
CONF = os.path.join(PASTA, "ponte.conf")


def ler_conf():
    if not os.path.exists(CONF):
        sys.exit("Não achei o arquivo ponte.conf ao lado do ponte.py. Veja o LEIA-ME.")
    d = {}
    with open(CONF, encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            k, v = linha.split("=", 1)
            d[k.strip().upper()] = v.strip()
    for k in ("URL", "KEY", "TOKEN"):
        if not d.get(k):
            sys.exit("Falta a linha %s no ponte.conf." % k)
    d["URL"] = d["URL"].rstrip("/")
    return d


def chamar(conf, rpc, corpo):
    req = urllib.request.Request(
        "%s/rest/v1/rpc/%s" % (conf["URL"], rpc),
        data=json.dumps(corpo).encode(),
        headers={
            "apikey": conf["KEY"],
            "Authorization": "Bearer " + conf["KEY"],
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        txt = r.read().decode()
        return json.loads(txt) if txt else None


def enviar(ip_porta, dados):
    host, _, porta = ip_porta.partition(":")
    with socket.create_connection((host, int(porta or 9100)), timeout=6) as s:
        s.sendall(dados)
        time.sleep(0.3)  # deixa o último pedaço sair antes de fechar


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def main():
    conf = ler_conf()
    log("Ponte de impressão ligada. Comanda: %s | Cozinha: %s"
        % (conf.get("COMANDA_IP") or "sem IP", conf.get("COZINHA_IP") or "sem IP"))
    avisou = False
    while True:
        try:
            jobs = chamar(conf, "ponte_pegar", {"p_token": conf["TOKEN"]}) or []
            if avisou:
                log("Conexão com o sistema voltou.")
                avisou = False
            for j in jobs:
                ip = conf.get(j["destino"].upper() + "_IP", "")
                if not ip:
                    chamar(conf, "ponte_concluir", {"p_token": conf["TOKEN"], "p_id": j["id"], "p_ok": False,
                                                    "p_erro": "sem IP no ponte.conf para " + j["destino"]})
                    log("Ficha %s ignorada: falta %s_IP no ponte.conf" % (j["id"], j["destino"].upper()))
                    continue
                try:
                    enviar(ip, base64.b64decode(j["dados"]))
                    chamar(conf, "ponte_concluir", {"p_token": conf["TOKEN"], "p_id": j["id"], "p_ok": True})
                    log("Ficha %s impressa (%s)" % (j["id"], j["destino"]))
                except Exception as e:  # impressora desligada, IP errado...
                    chamar(conf, "ponte_concluir", {"p_token": conf["TOKEN"], "p_id": j["id"], "p_ok": False,
                                                    "p_erro": str(e)[:200]})
                    log("ERRO ao imprimir a ficha %s em %s: %s" % (j["id"], ip, e))
            if jobs:
                continue  # pode haver mais fichas na fila
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403):
                log("O sistema recusou o TOKEN. Copie os dados de ligação de novo (Ajustes > Ponte de impressão).")
            else:
                log("Erro do sistema (%s). Tentando de novo..." % e.code)
            avisou = True
        except Exception as e:
            if not avisou:
                log("Sem conexão com o sistema (%s). Tentando de novo..." % e)
            avisou = True
        time.sleep(2)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
