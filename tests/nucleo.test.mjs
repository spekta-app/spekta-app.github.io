// Testes automáticos do Spekta
// Rodar: node --test tests/
// O núcleo de cálculo é lido direto do index.html publicado, sem cópias.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const ini = html.indexOf("const Core = (() =>");
const fim = html.indexOf("})();", ini) + 5;
assert.ok(ini > 0 && fim > ini, "núcleo de cálculo não encontrado no index.html");
const Core = new Function(html.slice(ini, fim) + "; return Core;")();

/* ---------- Dados sintéticos realistas (reprodutíveis) ---------- */
// Calibração de comprimento de onda ajustada a um aparelho StellarNet real (2048 pontos)
const CAL = [-3.57652003e-09, 4.05597569e-05, 3.40022751e-01, 3.37539986e02];
const comprimento = (i) => ((CAL[0] * i + CAL[1]) * i + CAL[2]) * i + CAL[3];
function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const oxigenio = (w) => 1 - 0.35 * Math.exp(-(((w - 760.5) / 1.8) ** 2)); // banda O2-A
function espectroPlaca(semente) {
  const r = aleatorio(semente);
  return Array.from({ length: 2048 }, (_, i) => {
    const w = comprimento(i);
    return (30000 * Math.exp(-(((w - 650) / 260) ** 2)) + 1500) * oxigenio(w) * (1 + 0.004 * (r() - 0.5));
  });
}
function refletanciaFolha(w, k) {
  const borda = 0.42 + 0.03 * k;
  return 0.04 + borda / (1 + Math.exp(-(w - (712 + k)) / 11)) + 0.06 * Math.exp(-(((w - 550) / 28) ** 2));
}
function textoSSM(valores, titulo) {
  const linhas = ['"' + titulo + '"', "SpectraWiz sintetico", "Inttime 100", ""];
  valores.forEach((v, i) => linhas.push(`  ${comprimento(i).toFixed(2)}    ${v.toFixed(2)}`));
  return linhas.join("\r") + "\r"; // o SpectraWiz grava com CR
}
function conjuntoSintetico() {
  const placas = [espectroPlaca(1), espectroPlaca(2)];
  const plantas = [];
  for (let k = 0; k < 6; k++) {
    const placa = placas[k % 2];
    const r = aleatorio(100 + k);
    const v = placa.map((p, i) => p * refletanciaFolha(comprimento(i), k) * (1 + 0.006 * (r() - 0.5)));
    plantas.push({ planta: Core.parseSSM(textoSSM(v, "P" + k)), placa: Core.parseSSM(textoSSM(placa, "placa")) });
  }
  return plantas;
}

/* ---------- Implementação independente (só para conferir) ---------- */
function referencia(planta, placa, lo, hi) {
  const n = planta.wl.length, a = planta.wl[0], b = planta.wl[n - 1];
  const lin = (x, y, v) => {
    if (v <= x[0]) return y[0];
    if (v >= x[x.length - 1]) return y[y.length - 1];
    let e = 0, d = x.length - 1;
    while (d - e > 1) { const m = (e + d) >> 1; if (x[m] <= v) e = m; else d = m; }
    return y[e] + ((y[d] - y[e]) * (v - x[e])) / (x[d] - x[e]);
  };
  const wl = [], val = [];
  for (let i = 0; i < n; i++) {
    const g = a + ((b - a) * i) / (n - 1);
    if (g >= lo && g <= hi) { wl.push(g); val.push(lin(planta.wl, planta.val, g) / lin(placa.wl, placa.val, g)); }
  }
  return { wl, val };
}
const lerCSV = (t) =>
  t.split("\r\n").slice(2).filter(Boolean).map((l) => l.split(";").slice(0, 2).map((x) => Number(x.replace(",", "."))));

/* ---------------------------- Testes ---------------------------- */

test("arredondamento com 8 algarismos confere com oráculo decimal", () => {
  // Esperados calculados com Decimal (Python), arredondamento .5 para cima
  const casos = [["0.5","0.5"],["1","1"],["2.5","2.5"],["0.123456785","0.12345679"],["0.1234567849999","0.12345678"],["123456785","123456790"],["99999999.5","100000000"],["0.999999995","1"],["1.23456785e-05","0.000012345679"],["-0.123456785","-0.12345679"],["0.000123456785","0.00012345679"],["1234.56785","1234.5679"],["0.499999995","0.5"],["7.00000005","7.0000001"],["0.3333333333333333","0.33333333"],["0.6666666666666666","0.66666667"],["0.1","0.1"],["0.30000000000000004","0.3"],["1.05","1.05"],["0.770917890165","0.77091789"],["0.039762798715","0.039762799"],["0.337284888859","0.33728489"],["0.275620778397","0.27562078"],["0.886400744855","0.88640074"],["0.815272390033","0.81527239"],["1.071693685569","1.0716937"],["0.113457210829","0.11345721"],["0.512086965425","0.51208697"],["0.045458691131","0.045458691"],["0.270179190016","0.27017919"],["0.611372792843","0.61137279"],["0.041577803924","0.041577804"],["0.246616804317","0.2466168"],["0.783362480958","0.78336248"],["32741.99468813268","32741.995"],["13304.393260237732","13304.393"],["35397.01446416693","35397.014"],["48584.884355001814","48584.884"],["489.2757047158549","489.2757"],["48368.57318478519","48368.573"]];
  for (const [v, esperado] of casos) assert.equal(Core.g8(Number(v)), esperado, `g8(${v})`);
  assert.equal(Core.g8(0), "0");
});

test("grade uniforme: extremos exatos, mesmo número de pontos, passo constante", () => {
  const g = Core.grid(337.54, 1172.843, 2048);
  assert.equal(g.length, 2048);
  assert.equal(g[0], 337.54);
  assert.equal(g[2047], 1172.843);
  const passo = (1172.843 - 337.54) / 2047;
  for (let i = 1; i < g.length; i++) assert.ok(Math.abs(g[i] - g[i - 1] - passo) < 1e-9);
});

test("interpolação linear: pontos exatos, meio do intervalo e extremos", () => {
  const x = Float64Array.from([0, 1, 3]), y = Float64Array.from([0, 10, 30]);
  const r = Core.interp(Float64Array.from([-1, 0, 0.5, 1, 2, 3, 5]), x, y);
  assert.deepEqual(Array.from(r), [0, 0, 5, 10, 20, 30, 30]);
});

test("leitura do .SSM aceita cabeçalho e finais de linha CR, LF e CRLF", () => {
  const corpo = ["Titulo qualquer", "Data 12/03", "  400.10    100.5", "  400.50    101", "  401.00    99.25"];
  for (const quebra of ["\r", "\n", "\r\n"]) {
    const s = Core.parseSSM(corpo.join(quebra));
    assert.deepEqual(Array.from(s.wl), [400.1, 400.5, 401]);
    assert.deepEqual(Array.from(s.val), [100.5, 101, 99.25]);
  }
});

test("refletância: leitura igual à placa dá 1; metade da placa dá 0,5; faixa respeitada", () => {
  const placa = Core.parseSSM(textoSSM(espectroPlaca(7), "placa"));
  const igual = Core.ratio(placa, placa, 450, 1100);
  assert.ok(igual.val.every((v) => Math.abs(v - 1) < 1e-12));
  assert.ok(igual.wl[0] >= 450 && igual.wl[igual.wl.length - 1] <= 1100);
  const metade = { wl: placa.wl, val: placa.val.map((v) => v / 2) };
  assert.ok(Core.ratio(metade, placa, 500, 900).val.every((v) => Math.abs(v - 0.5) < 1e-12));
});

test("cálculo confere com implementação independente (6 plantas sintéticas)", () => {
  for (const { planta, placa } of conjuntoSintetico()) {
    const s = Core.ratio(planta, placa, 450, 1100);
    const ref = referencia(planta, placa, 450, 1100);
    assert.equal(s.wl.length, ref.wl.length);
    for (let i = 0; i < ref.wl.length; i++) {
      assert.ok(Math.abs(s.wl[i] - ref.wl[i]) < 1e-9);
      assert.ok(Math.abs(s.val[i] - ref.val[i]) / ref.val[i] < 1e-12);
    }
    // depois de gravado em CSV (8 algarismos), a diferença fica abaixo de 5e-8
    const gravado = lerCSV(Core.toCSV("x", s.wl, s.val));
    gravado.forEach(([w, v], i) => {
      assert.ok(Math.abs(w - ref.wl[i]) <= 0.0005 + 1e-9);
      assert.ok(Math.abs(v - ref.val[i]) / ref.val[i] <= 5e-8);
    });
  }
});

test("formato do CSV igual ao do Pro-Tools", () => {
  const t = Core.toCSV("P1 1 B1", Float64Array.from([450.0004, 450.4]), Float64Array.from([0.123456785, 1.5]));
  assert.equal(t, ";P1 1 B1;\r\nWavelength [nm];Intensity;\r\n450,000;0,12345679;\r\n450,400;1,5;\r\n");
});

test("média: espectros iguais devolvem o próprio espectro; duas constantes dão a média", () => {
  const wl = Core.grid(450, 1100, 1500);
  const a = { wl, val: wl.map(() => 0.2) }, b = { wl, val: wl.map(() => 0.4) };
  assert.ok(Core.average([a, a, a]).val.every((v) => Math.abs(v - 0.2) < 1e-15));
  assert.ok(Core.average([a, b]).val.every((v) => Math.abs(v - 0.3) < 1e-12));
});

test("regressão: saída sintética idêntica à da versão 1.0", () => {
  const conj = conjuntoSintetico();
  const specs = conj.map(({ planta, placa }) => Core.ratio(planta, placa, 450, 1100));
  let tudo = specs.map((s, k) => Core.toCSV("P" + k, s.wl, s.val)).join("");
  const m = Core.average(specs.slice(0, 3)), m2 = Core.average(specs.slice(3));
  tudo += Core.toCSV("media1", m.wl, m.val) + Core.toCSV("media2", m2.wl, m2.val);
  const hash = createHash("sha256").update(tudo).digest("hex");
  assert.equal(hash, "7162fcc45a4bfb2743a739b3be15137d0ee7671112e88a717cff6df3de55f88a");
});

/* ---------- Leitura dos nomes ---------- */
const DBC = "P{planta} {tratamento} B{bloco}";
const ler = (modelo, nomes) => Core.makeParser(modelo, ["-", "(-)"]).parseAll(nomes);

test("nomes DBC: plantas, placas com '-' e '(-)', tratamentos com letras", () => {
  const r = ler(DBC, ["P1 1 B1.SSM", "P1 1 B1-.SSM", "P2 1 B1.SSM", "P3 BIOF 04 B1(-).SSM", "P3 BIOF 04 B1.SSM", "P1 07 B2.SSM"]);
  assert.deepEqual(r[0].vals, { planta: "1", tratamento: "1", bloco: "1" });
  assert.equal(r[0].isRef, false);
  assert.equal(r[1].isRef, true);
  assert.deepEqual(r[3].vals, { planta: "3", tratamento: "BIOF04", bloco: "1" });
  assert.equal(r[3].isRef, true);
  assert.equal(r[5].vals.tratamento, "7"); // zero à esquerda removido
});

test("nomes: espaço sobrando é aceito e avisado; campo ausente é avisado; nome fora do modelo é barrado", () => {
  const r = ler(DBC, ["P1 1 B1.SSM", "P2 1 B1.SSM", "P2  12 B3 .SSM", "P1 BIOF06-.SSM", "B1 34 B2.SSM", "P1 BIOF06 B2.SSM", "P3 BIOF 04 B1.SSM", "P1 07 B2.SSM"]);
  assert.deepEqual(r[2].vals, { planta: "2", tratamento: "12", bloco: "3" });
  assert.ok(r[2].notes.some((n) => n.includes("espaço")));
  assert.deepEqual(r[3].missing, ["bloco"]);
  assert.equal(r[3].isRef, true);
  assert.equal(r[4].ok, false);
});

test("nomes DIC e amostra simples", () => {
  const r = ler("{tratamento} R{repeticao} L{leitura}", ["Controle R3 L1.ssm", "Dose 50 R1 L1.ssm", "T1 R2 L3.ssm"]);
  assert.deepEqual(r[0].vals, { tratamento: "CONTROLE", repeticao: "3", leitura: "1" });
  assert.deepEqual(r[1].vals, { tratamento: "DOSE50", repeticao: "1", leitura: "1" });
  assert.deepEqual(ler("{amostra}", ["abc.ssm"])[0].vals, { amostra: "ABC" });
});

test("letra O no lugar de zero é corrigida e avisada", () => {
  const n = Core.normVal("BIOFO6");
  assert.equal(n.v, "BIOF06");
  assert.equal(n.notes.length, 1);
});

test("nome de saída: média da parcela remove o campo planta", () => {
  assert.equal(Core.render(DBC, { planta: "1", tratamento: "34", bloco: "2" }, "planta"), "34 B2");
  assert.equal(Core.render("{tratamento} R{repeticao} L{leitura}", { tratamento: "CONTROLE", repeticao: "3", leitura: "1" }, "leitura"), "CONTROLE R3");
});

/* ---------- Privacidade ---------- */
test("o aplicativo não envia dados: sem chamadas de rede no código", () => {
  for (const proibido of ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource"]) {
    assert.ok(!html.includes(proibido), `encontrado: ${proibido}`);
  }
  const hosts = new Set([...html.matchAll(/https?:\/\/([^/"' )<]+)/g)].map((m) => m[1]));
  assert.deepEqual([...hosts].sort(), ["cdnjs.cloudflare.com", "fonts.googleapis.com"]);
});
