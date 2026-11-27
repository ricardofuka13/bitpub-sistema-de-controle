#!/usr/bin/env bash
# BitPub - acha a impressora de rede sozinho e arruma o ponte.conf.
# Uso:  curl -fsSL https://bitpub.app.br/ponte-impressao/configurar-ip.sh | bash
set -u
BASE="https://bitpub.app.br/ponte-impressao"
DEST="$HOME/ponte-impressao"
exec 3</dev/tty 2>/dev/null || exec 3<&0

[ -f "$DEST/ponte.conf" ] || { echo "Não achei $DEST/ponte.conf. Rode antes o instalador (instalar.sh)."; exit 1; }

echo "== 1/3  Atualizando a ponte =="
curl -fsSL "$BASE/ponte.py" -o "$DEST/ponte.py.novo" && mv "$DEST/ponte.py.novo" "$DEST/ponte.py" && echo "Ponte atualizada." || echo "(não consegui baixar a atualização, sigo com a atual)"

echo
echo "== 2/3  Procurando impressoras na rede (leva uns 10 segundos) =="
ACHADAS="$(python3 - <<'PY'
import os, socket, concurrent.futures as cf
prefix = os.environ.get("SCAN_PREFIX")
if not prefix:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close()
        prefix = ".".join(ip.split(".")[:3])
    except Exception:
        prefix = ""
def testa(i):
    h = "%s.%d" % (prefix, i)
    try:
        socket.create_connection((h, 9100), timeout=0.6).close()
        return h
    except Exception:
        return None
if prefix:
    with cf.ThreadPoolExecutor(64) as ex:
        for h in ex.map(testa, range(1, 255)):
            if h: print(h)
PY
)"
LISTA=($ACHADAS)
if [ "${#LISTA[@]}" -gt 0 ]; then
  echo "Achei estes aparelhos com porta de impressora aberta:"
  n=1; for ip in "${LISTA[@]}"; do echo "  $n) $ip"; n=$((n+1)); done
else
  echo "Não achei nenhuma impressora na rede. Confira se ela está ligada, com o cabo de rede no roteador."
fi

echo
if [ "${#LISTA[@]}" -gt 0 ]; then
  read -r -u 3 -p "Digite o NÚMERO da impressora de 80 mm (comanda), ou o IP se preferir: " R
else
  read -r -u 3 -p "Digite o IP da impressora de 80 mm (ou Enter para cancelar): " R
fi
[ -z "$R" ] && { echo "Cancelado. Nada foi mudado."; exit 1; }
case "$R" in
  *.*) IPC="$R" ;;
  *)   IPC="${LISTA[$((R-1))]:-}" ;;
esac
IPC="${IPC//[^0-9.:]/}"
[ -z "$IPC" ] && { echo "Não entendi. Rode de novo."; exit 1; }
read -r -u 3 -p "A impressora da COZINHA (58 mm) também é de rede? Digite o número/IP, ou Enter se NÃO: " K
case "$K" in
  "") IPK="" ;;
  *.*) IPK="$K" ;;
  *)   IPK="${LISTA[$((K-1))]:-}" ;;
esac
IPK="${IPK//[^0-9.:]/}"

echo
echo "== 3/3  Salvando e reiniciando a ponte =="
grep -v '^COMANDA_IP=\|^COZINHA_IP=' "$DEST/ponte.conf" > "$DEST/ponte.conf.novo"
printf 'COMANDA_IP=%s\nCOZINHA_IP=%s\n' "$IPC" "$IPK" >> "$DEST/ponte.conf.novo"
mv "$DEST/ponte.conf.novo" "$DEST/ponte.conf"; chmod 600 "$DEST/ponte.conf"
echo "Comanda: ${IPC:-vazio} | Cozinha: ${IPK:-vazio}"
if systemctl --user restart bitpub-ponte 2>/dev/null; then
  sleep 3
  journalctl --user -u bitpub-ponte -n 4 --no-pager 2>/dev/null || true
else
  echo "Para ligar a ponte agora: cd $DEST && python3 ponte.py"
fi
echo
echo "Pronto! No celular, em Ajustes, toque em 'Testar comanda (rede)'."
