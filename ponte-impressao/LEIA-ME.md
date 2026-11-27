# Ponte de impressão BitPub (Mac e Linux)

O sistema, aberto em qualquer celular ou computador, manda as fichas para uma fila.
Este programinha fica ligado no **computador da loja** e leva cada ficha até a impressora de rede.

- **Comanda e conta**: impressora de 80 mm (rede/LAN)
- **Ficha da cozinha e pedidos do site**: impressora de 58 mm (se for de rede, preencha também `COZINHA_IP`; se for Bluetooth/USB, deixe em branco e escolha "Este aparelho" nos Ajustes)

## Jeito mais fácil no Linux (um comando)

No sistema, em **Ajustes > Ponte de impressão**, toque em **Copiar dados de ligação**. Depois abra o Terminal e rode:

    curl -fsSL https://bitpub.app.br/ponte-impressao/instalar.sh | bash

O programa pede para colar os dados (botão direito > Colar) e o IP da impressora, e deixa a ponte ligando sozinha com o computador. Se preferir fazer à mão, siga os passos abaixo.

## Trocar ou arrumar o IP da impressora (um comando)

    curl -fsSL https://bitpub.app.br/ponte-impressao/configurar-ip.sh | bash

Ele procura as impressoras na rede, você escolhe pelo número, e ele arruma o `ponte.conf` e reinicia a ponte.

## Instalar à mão (uma vez)

1. Ligue a impressora de 80 mm com cabo de rede no roteador e imprima o **teste de autoimpressão** (segurar o botão FEED ao ligar). Anote o **IP** que sai no papel. Dica: peça ao técnico do roteador (ou pelo painel do roteador) para deixar esse IP **fixo** para a impressora.
2. Confira que o computador tem Python 3: abra o Terminal e digite `python3 --version`. No Mac, se não tiver, o próprio Mac oferece instalar.
3. Copie esta pasta (`ponte-impressao`) para o computador, por exemplo na Mesa.
4. No sistema: **Ajustes > Ponte de impressão > Copiar dados de ligação**.
5. Na pasta, copie `ponte.conf.exemplo` para `ponte.conf`, abra no editor de texto, **cole** os dados no lugar das 3 primeiras linhas e preencha `COMANDA_IP` (e `COZINHA_IP`, se for o caso).
6. No Terminal: `cd ~/Desktop/ponte-impressao && python3 ponte.py`
   Deve aparecer "Ponte de impressão ligada".
7. No sistema, em **Ajustes**, escolha **Impressora de rede (pela ponte)** para a comanda (e para a cozinha, se for de rede), salve, e toque em **Testar comanda (rede)**.

Enquanto a janela do Terminal estiver aberta, a ponte funciona. O status "Ponte conectada" aparece em Ajustes.

## Ligar sozinha com o computador

**Mac:** edite `com.bitpub.ponte.plist` trocando `CAMINHO` pela pasta completa (ex.: `/Users/seunome/Desktop/ponte-impressao`), copie para `~/Library/LaunchAgents/` e rode `launchctl load ~/Library/LaunchAgents/com.bitpub.ponte.plist`.

**Linux:** edite `bitpub-ponte.service` trocando `CAMINHO`, copie para `~/.config/systemd/user/` e rode `systemctl --user enable --now bitpub-ponte`.

## Se der problema

- **"Ponte desligada" no sistema:** o programa não está rodando ou o computador está sem internet.
- **"O sistema recusou o TOKEN":** copie os dados de ligação de novo e cole no `ponte.conf`.
- **"ERRO ao imprimir ... Connection refused/timed out":** impressora desligada, cabo solto ou IP errado. Imprima o teste de autoimpressão e confira o IP.
- Fichas que ficam mais de 15 minutos na fila (ponte desligada) são descartadas para não saírem atrasadas.
