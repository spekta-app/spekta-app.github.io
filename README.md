# Espectroprocessamento

Aplicativo para processar em lote as leituras de espectrorradiômetro (arquivos `.SSM` do SpectraWiz/StellarNet). Ele roda direto no navegador, não precisa de instalação e não envia nenhum arquivo para a internet.

**Acesse:** https://gabriel-rodrigues-silva.github.io/espectroprocessamento/

## O que ele faz

- Divide cada leitura pela placa branca de referência (refletância).
- Recorta a faixa espectral escolhida (padrão: 450–1100 nm).
- Faz as médias que o experimento pede: plantas por parcela, leituras por repetição, folhas por planta…
- Organiza os resultados em pastas (por bloco, dia, talhão…).
- Gera uma tabela única pronta para R/Excel e um relatório de conferência.

Funciona para qualquer cultura e delineamento (DBC, DIC, fatorial, avaliações no tempo, pontos de amostragem no campo). O usuário descreve como nomeou os arquivos, por exemplo `P{planta} {tratamento} B{bloco}`, e o aplicativo organiza o resto.

## Validação

O cálculo foi comparado com o Spectroscopy Pro-Tools (v1.2.16.1) num experimento de alface biofortificada (F2) em DBC, com 39 tratamentos, 3 blocos e 3 plantas por parcela:

| Comparação | Resultado |
|---|---|
| Espectros por planta, a partir dos .SSM brutos | 348 de 348 idênticos, caractere por caractere |
| Médias por parcela | 117 de 117 idênticas |
| Maior diferença numérica | 0 |

Detalhes do método na aba **Validação** do aplicativo.

## Como usar

Veja a aba **Como usar** no próprio aplicativo.

## Autoria

Gabriel Rodrigues Silva.

O código foi desenvolvido com auxílio de inteligência artificial (Claude, da Anthropic), sob direção e validação do autor.

Contato: gabriel.rodrigues@ufu.br
