# =====================================================================
# Spekta - conferência independente em R
#
# Recalcula a refletância a partir dos arquivos brutos (.SSM) e compara,
# valor a valor, com os CSV gerados pelo Spekta (aba "Por planta").
# Usa apenas o R básico (nenhum pacote precisa ser instalado).
#
# Como usar:
#   1. Ajuste as duas pastas e a faixa logo abaixo.
#   2. No RStudio, clique em "Source" (ou rode: source("spekta_conferencia.R")).
#   3. O resultado aparece no console e é salvo em "conferencia_R.csv".
#
# Cada CSV do Spekta traz na 1ª linha "Part of: <planta> divided by: <placa>",
# então o script sabe sozinho qual leitura e qual placa usar.
# =====================================================================

pasta_ssm    <- "C:/caminho/para/leituras_brutas"        # arquivos .SSM
pasta_spekta <- "C:/caminho/para/Resultados/Por planta"  # CSV por planta do Spekta
# (pode ser também a pasta de CSV do Pro-Tools: o formato é o mesmo)
faixa        <- c(450, 1100)                              # nm, a mesma usada no Spekta
tolerancia   <- 5e-8   # diferença relativa aceita (o Spekta grava 8 algarismos)

# ---------------------------------------------------------------------
ler_ssm <- function(arquivo) {
  txt <- readLines(arquivo, warn = FALSE, encoding = "latin1")
  txt <- unlist(strsplit(txt, "\r", fixed = TRUE))
  partes <- strsplit(trimws(txt), "[[:space:]]+")
  ok <- vapply(partes, function(p) length(p) == 2 &&
                 !any(is.na(suppressWarnings(as.numeric(p)))), logical(1))
  m <- do.call(rbind, lapply(partes[ok], as.numeric))
  list(wl = m[, 1], val = m[, 2])
}

ler_csv_spekta <- function(arquivo) {
  txt <- readLines(arquivo, warn = FALSE, encoding = "UTF-8")
  titulo <- sub("^;(.*);$", "\\1", txt[1])
  corpo <- txt[-(1:2)]
  corpo <- corpo[nzchar(corpo)]
  m <- do.call(rbind, lapply(strsplit(corpo, ";", fixed = TRUE),
                             function(p) as.numeric(sub(",", ".", p[1:2], fixed = TRUE))))
  list(titulo = titulo, wl = m[, 1], val = m[, 2])
}

refletancia <- function(planta, placa, faixa) {
  n <- length(planta$wl)
  g <- seq(planta$wl[1], planta$wl[n], length.out = n)       # grade uniforme
  yp <- approx(planta$wl, planta$val, xout = g, rule = 2)$y   # interpolação linear
  yr <- approx(placa$wl,  placa$val,  xout = g, rule = 2)$y
  sel <- g >= faixa[1] & g <= faixa[2]
  list(wl = g[sel], val = (yp / yr)[sel])
}

# ---------------------------------------------------------------------
arquivos <- list.files(pasta_spekta, pattern = "\\.csv$", full.names = TRUE,
                       recursive = TRUE, ignore.case = TRUE)
if (length(arquivos) == 0) stop("Nenhum CSV encontrado em pasta_spekta.")

# Índice das leituras brutas pelo nome sem extensão (aceita .SSM, .ssm, .TRM...)
brutos <- list.files(pasta_ssm, full.names = TRUE, recursive = TRUE)
names(brutos) <- sub("\\.[^.]+$", "", basename(brutos))
achar <- function(nome) {
  if (!nome %in% names(brutos)) stop("Leitura não encontrada em pasta_ssm: ", nome)
  brutos[[nome]]
}

linhas <- lapply(arquivos, function(arq) {
  s <- ler_csv_spekta(arq)
  nomes <- regmatches(s$titulo, regexec("^Part of: (.*) divided by: (.*)$", s$titulo))[[1]]
  if (length(nomes) != 3) {
    return(data.frame(arquivo = basename(arq), pontos = NA, dif_comprimento_nm = NA,
                      dif_relativa_max = NA, situacao = "título sem planta/placa"))
  }
  planta <- ler_ssm(achar(nomes[2]))
  placa  <- ler_ssm(achar(nomes[3]))
  r <- refletancia(planta, placa, faixa)
  if (length(r$wl) != length(s$wl)) {
    return(data.frame(arquivo = basename(arq), pontos = length(s$wl), dif_comprimento_nm = NA,
                      dif_relativa_max = NA, situacao = "número de pontos diferente"))
  }
  dwl <- max(abs(r$wl - s$wl))   # o Spekta grava 3 casas: diferença até 0,0005 nm
  drel <- max(abs(r$val - s$val) / abs(r$val))
  data.frame(arquivo = basename(arq), pontos = length(s$wl),
             dif_comprimento_nm = dwl, dif_relativa_max = drel,
             situacao = ifelse(dwl <= 0.0005 + 1e-9 && drel <= tolerancia, "confere", "DIFERENTE"))
})
resultado <- do.call(rbind, linhas)

cat("\nConferência Spekta x R\n")
cat("Arquivos conferidos:", nrow(resultado), "\n")
cat("Conferem:", sum(resultado$situacao == "confere"), "\n")
cat("Maior diferença relativa:", format(max(resultado$dif_relativa_max, na.rm = TRUE), digits = 3), "\n")
if (any(resultado$situacao != "confere")) {
  cat("\nArquivos com problema:\n")
  print(resultado[resultado$situacao != "confere", ], row.names = FALSE)
}
write.csv2(resultado, "conferencia_R.csv", row.names = FALSE)
cat("\nDetalhes salvos em conferencia_R.csv\n")
