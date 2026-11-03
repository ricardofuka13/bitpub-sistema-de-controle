#!/usr/bin/env bash
# BitPub - configura o Linux (Ubuntu, Mint, Debian) para imprimir comandas por cabo USB.
# Como usar: ligue a impressora no USB e LIGADA, abra o Terminal e rode:
#   bash configurar-impressora-usb.sh
set -u

URL="https://bitpub.app.br/sistema/"

if [ "$(id -u)" -eq 0 ]; then
  echo "Rode como usuário normal (sem sudo). O script pede a senha quando precisar."
  exit 1
fi

echo "== 1/4  Navegador =="
if command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1; then
  echo "Chrome/Chromium já instalado."
else
  echo "Instalando o Google Chrome (o Firefox não imprime direto na impressora)..."
  TMP="$(mktemp -d)"
  if wget -q --show-progress -O "$TMP/chrome.deb" https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb; then
    sudo apt-get install -y "$TMP/chrome.deb" || echo "Não consegui instalar o Chrome. Instale pelo site google.com/chrome e rode este script de novo."
  else
    echo "Não consegui baixar o Chrome. Instale pelo site google.com/chrome e rode este script de novo."
  fi
  rm -rf "$TMP"
fi

echo
echo "== 2/4  Procurando a impressora USB =="
IDS=()
for d in /sys/bus/usb/devices/*; do
  [ -f "$d/idVendor" ] || continue
  is_printer=0
  for i in "$d":*; do
    [ -f "$i/bInterfaceClass" ] && [ "$(cat "$i/bInterfaceClass")" = "07" ] && is_printer=1
  done
  if [ "$is_printer" = "1" ]; then
    IDS+=("$(cat "$d/idVendor"):$(cat "$d/idProduct")")
  fi
done

if [ "${#IDS[@]}" -eq 0 ]; then
  echo "Não achei uma impressora automaticamente. Dispositivos USB conectados:"
  lsusb
  echo
  read -r -p "Digite o ID da impressora (formato 0416:5011) ou deixe em branco para cancelar: " ID
  [ -z "$ID" ] && { echo "Cancelado."; exit 1; }
  IDS=("$ID")
fi

echo "Impressora(s) encontrada(s): ${IDS[*]}"

echo
echo "== 3/4  Permissões (pede a senha do computador) =="
RULES=""
for id in "${IDS[@]}"; do
  v="${id%%:*}"; p="${id##*:}"
  RULES="${RULES}SUBSYSTEM==\"usb\", ATTR{idVendor}==\"${v}\", ATTR{idProduct}==\"${p}\", MODE=\"0666\"\n"
done
printf "%b" "$RULES" | sudo tee /etc/udev/rules.d/99-bitpub-impressora.rules >/dev/null
# o driver padrão "usblp" prende a impressora e impede o navegador de usar
echo "blacklist usblp" | sudo tee /etc/modprobe.d/bitpub-usblp.conf >/dev/null
sudo rmmod usblp 2>/dev/null || true
sudo udevadm control --reload-rules
sudo udevadm trigger

echo
echo "== 4/4  Pronto =="
echo "1) Desligue a impressora e tire o cabo USB, espere 5 segundos, ligue e conecte de novo."
echo "2) Abra o Google Chrome em: $URL"
echo "3) Entre em Ajustes > Impressora > toque em 'USB (computador)' e depois em 'Testar impressão'."
echo "4) Na primeira vez o Chrome mostra uma lista: escolha a impressora e toque em Conectar."
echo
echo "Observação: depois disto, a impressora só imprime pelo BitPub no Chrome (outros programas do Linux deixam de usá-la)."
