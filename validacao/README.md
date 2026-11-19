# Validação do Spekta

## 1. Comparação com o Spectroscopy Pro-Tools (dados reais)

Experimento de alface biofortificada (F2) em DBC: 39 tratamentos, 3 blocos, 3 plantas por parcela.
Os arquivos brutos (.SSM) foram processados pelo Spekta v1.0 e pelo Pro-Tools v1.2.16.1.

| Comparação | Resultado |
|---|---|
| Espectros por planta | 348 de 348 idênticos, caractere por caractere |
| Médias por parcela | 117 de 117 idênticas |
| Maior diferença numérica | 0 |

## 2. Implementação independente (Python/NumPy)

`referencia_independente.py` refaz o cálculo a partir da descrição do método, sem usar o código do Spekta,
em precisão dupla e sem arredondamento. Resultado nos mesmos 348 espectros e 117 médias:

| Comparação | Maior diferença |
|---|---|
| Comprimentos de onda (Spekta e Pro-Tools x referência) | 0 nm |
| Espectros por planta: referência x Spekta | 5,0 × 10⁻⁸ (relativa) |
| Espectros por planta: referência x Pro-Tools | 5,0 × 10⁻⁸ (relativa) |
| Médias: referência x Spekta | 9,3 × 10⁻⁵ (relativa) |
| Médias: referência x Pro-Tools | 9,3 × 10⁻⁵ (relativa) |

A diferença de 5 × 10⁻⁸ é o arredondamento para 8 algarismos significativos usado na gravação dos CSV.
A de 9,3 × 10⁻⁵ nas médias vem do procedimento do Pro-Tools, que calcula a média a partir dos valores já
arredondados e reamostrados; o Spekta reproduz esse procedimento de propósito, para dar o mesmo resultado.

Observação: o Pro-Tools (e o Spekta, por compatibilidade) reamostra cada espectro numa grade uniforme antes
da divisão. Em relação à divisão direta nos comprimentos de onda originais, isso muda a refletância em 0,1%
na mediana e em até 0,7% em 99% dos pontos; as maiores diferenças (até 2,5%) ficam na banda de absorção do
oxigênio, perto de 760 nm.

Como rodar:

```
node gera_spekta.js ../index.html <pasta .SSM> spekta_out <pairs.json>
python3 referencia_independente.py <pasta .SSM> <pairs.json> <pasta Pro-Tools> spekta_out
```

## 3. Conferência em R

`spekta_conferencia.R` recalcula a refletância em R básico (sem pacotes) e compara com os CSV do Spekta
(ou do Pro-Tools). Basta ajustar as duas pastas no início do script e rodar no RStudio.

## 4. Testes automáticos

A pasta `tests/` tem 15 testes que rodam sozinhos no GitHub a cada alteração (aba Actions): arredondamento
conferido com um oráculo decimal, grade e interpolação, leitura dos arquivos, refletância comparada com uma
implementação independente em dados sintéticos realistas, formato do CSV, médias, leitura dos nomes e
ausência de envio de dados pela internet.

Para rodar no computador: `node --test` na pasta do repositório.
