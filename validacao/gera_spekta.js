// Roda o núcleo de cálculo EXATAMENTE como está no index.html publicado
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(process.argv[2],'utf8');
const i=html.indexOf('const Core = (() =>'), j=html.indexOf('})();',i)+5;
const C=new Function(html.slice(i,j)+'; return Core;')();
const RAW=process.argv[3], OUT=process.argv[4], pairs=JSON.parse(fs.readFileSync(process.argv[5],'utf8'));
const rd=f=>fs.readFileSync(f).toString('latin1');
fs.mkdirSync(OUT+'/planta',{recursive:true}); fs.mkdirSync(OUT+'/media',{recursive:true});
const mine={};
for(const [k,[pl,pt]] of Object.entries(pairs)){
  const s=C.ratio(C.parseSSM(rd(path.join(RAW,pl+'.SSM'))),C.parseSSM(rd(path.join(RAW,pt+'.SSM'))),450,1100); mine[k]=s;
  fs.writeFileSync(`${OUT}/planta/${k}.csv`,C.toCSV(`Part of: ${pl} divided by: ${pt}`,s.wl,s.val),'latin1');
}
const plots=[...new Set(Object.keys(pairs).map(k=>k.split(' ').slice(1).join(' ')))];
for(const plot of plots){const ks=Object.keys(pairs).filter(k=>k.split(' ').slice(1).join(' ')===plot);
  const a=C.average(ks.map(k=>mine[k])); fs.writeFileSync(`${OUT}/media/${plot}.csv`,C.toCSV(plot,a.wl,a.val),'latin1');}
console.log(Object.keys(mine).length,'plantas',plots.length,'parcelas');
