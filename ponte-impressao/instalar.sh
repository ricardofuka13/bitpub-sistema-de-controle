#!/usr/bin/env bash
# BitPub - instala a ponte de impressão no Linux (Ubuntu, Mint, Debian) em um passo.
# Uso:  curl -fsSL https://bitpub.app.br/ponte-impressao/instalar.sh | bash
set -u
BASE="https://bitpub.app.br/ponte-impressao"
DEST="$HOME/ponte-impressao"
# quando rodado por "curl | bash", a entrada do teclado vem do terminal
exec 3</dev/tty 2>/dev/null || exec 3<&0

echo "== 1/4  Conferindo o Python 3 =="
if ! command -v python3 >/dev/null 2>&1; then
  echo "Instalando o Python 3 (pede a senha do computador)..."
  sudo apt-get install -y python3 || { echo "Não consegui instalar o Python 3."; exit 1; }
fi
python3 --version

echo
echo "== 2/4  Baixando a ponte =="
mkdir -p "$DEST"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"
if [ -f "$AQUI/ponte.py" ] && [ "$AQUI" != "$DEST" ]; then
  cp "$AQUI/ponte.py" "$DEST/ponte.py"
else
  curl -fsSL "$BASE/ponte.py" -o "$DEST/ponte.py" || { echo "Não consegui baixar a ponte. Confira a internet."; exit 1; }
fi
echo "Pasta: $DEST"

echo
echo "== 3/4  Dados de ligação =="
echo "No sistema: Ajustes > Ponte de impressão > 'Copiar dados de ligação'."
echo "Cole aqui (botão direito > Colar ou Ctrl+Shift+V) e depois aperte Enter:"
URL=""; KEY=""; TOKEN=""
while IFS= read -r -u 3 linha; do
  linha="${linha%$'\r'}"
  case "$linha" in
    URL=*) URL="${linha#URL=}" ;;
    KEY=*) KEY="${linha#KEY=}" ;;
    TOKEN=*) TOKEN="${linha#TOKEN=}" ;;
  esac
  [ -n "$URL" ] && [ -n "$KEY" ] && [ -n "$TOKEN" ] && break
done
if [ -z "$URL" ] || [ -z "$KEY" ] || [ -z "$TOKEN" ]; then
  echo "Não recebi os 3 dados (URL, KEY e TOKEN). Rode de novo e cole o texto copiado."; exit 1
fi
echo "Dados recebidos."
# descarta o resto do texto colado (as linhas COMANDA_IP= e COZINHA_IP= vazias)
while IFS= read -r -u 3 -t 1 _resto; do :; done
echo
read -r -u 3 -p "IP da impressora de 80 mm (comanda), ex. 192.168.0.50: " IPC
read -r -u 3 -p "IP da impressora da cozinha (Enter se não for de rede): " IPK
IPC="${IPC//[^0-9.:]/}"; IPK="${IPK//[^0-9.:]/}"
cat > "$DEST/ponte.conf" <<CONF
URL=$URL
KEY=$KEY
TOKEN=$TOKEN
COMANDA_IP=$IPC
COZINHA_IP=$IPK
CONF
chmod 600 "$DEST/ponte.conf"

echo
echo "== 4/4  Ligando a ponte sozinha com o computador =="
if command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
  mkdir -p "$HOME/.config/systemd/user"
  cat > "$HOME/.config/systemd/user/bitpub-ponte.service" <<UNIT
[Unit]
Description=Ponte de impressao BitPub
After=network-online.target

[Service]
ExecStart=/usr/bin/env python3 $DEST/ponte.py
WorkingDirectory=$DEST
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable --now bitpub-ponte
  loginctl enable-linger "$USER" 2>/dev/null || sudo loginctl enable-linger "$USER" 2>/dev/null || true
  sleep 3
  echo
  echo "Pronto! Veja o que a ponte está dizendo:"
  journalctl --user -u bitpub-ponte -n 5 --no-pager 2>/dev/null || true
else
  echo "Não consegui configurar o início automático. Para rodar agora, use:"
  echo "  cd $DEST && python3 ponte.py"
fi
echo
echo "Agora, no sistema: Ajustes > escolha 'Impressora de rede (pela ponte)' para a comanda, salve e toque em 'Testar comanda (rede)'."
