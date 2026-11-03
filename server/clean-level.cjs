'use strict';
// Server-side validation with the same rules as the editor and the game: reads a level on stdin, prints the cleaned version and its checks.
const V=require('../assets/verrian/level-format.js');let raw='';
process.stdin.setEncoding('utf8');process.stdin.on('data',d=>{raw+=d;if(raw.length>400000){process.stdout.write(JSON.stringify({ok:false,error:'Livello troppo grande.'}));process.exit(0);}});
process.stdin.on('end',()=>{try{const pack=V.clean(JSON.parse(raw)),check=V.check(pack);process.stdout.write(JSON.stringify({ok:true,pack,check}));}catch{process.stdout.write(JSON.stringify({ok:false,error:'Livello non valido.'}));}});
