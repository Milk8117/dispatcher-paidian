// getElementById/querySelector 真返回 null，贴近真实浏览器，找首个空元素抛错
function nullEl(){ return { classList:{add(){},remove(){},toggle(){},contains(){return false}},
  style:{}, dataset:{}, addEventListener(){}, removeEventListener(){}, getAttribute(){return null},
  setAttribute(){}, appendChild(){}, removeChild(){}, focus(){}, blur(){}, click(){}, closest(){return null},
  querySelector(){return null;}, querySelectorAll(){return [];}, getElementsByClassName(){return [];},
  setSelectionRange(){}, value:'', textContent:'', innerHTML:'', checked:false, disabled:false,
  hidden:false, files:[], title:'', placeholder:'', src:'', id:'', className:'', length:0,
  insertBefore(){}, firstChild:null, parentNode:null, nextSibling:null };}
function makeList(){ return []; }
global.window=global; global.self=global;
global.document={ getElementById(){return nullEl();}, getElementsByClassName(){return makeList();},
  getElementsByTagName(){return makeList();}, querySelector(){return nullEl();}, querySelectorAll(){return makeList();},
  createElement(){return nullEl();}, addEventListener(){}, removeEventListener(){}, body:nullEl(),
  documentElement:nullEl(), head:nullEl(), title:'', cookie:'', location:{} };
global.document.addEventListener=()=>{};
global.navigator={userAgent:'iPhone',platform:'iPhone',language:'zh-CN',onLine:true,clipboard:{writeText:()=>Promise.resolve()}};
global.localStorage={ _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
global.sessionStorage=global.localStorage;
global.location={href:'https://x/',protocol:'https:',host:'x',pathname:'/',search:'',hash:'',origin:'https://x',reload(){},assign(){},replace(){}};
global.fetch=()=>Promise.reject(new Error('stub'));
global.XMLHttpRequest=function(){}; global.WebSocket=function(){};
global.requestAnimationFrame=()=>0; global.cancelAnimationFrame=()=>0;
global.indexedDB={open(){return {onupgradeneeded:null,onsuccess:null,onerror:null,result:null};}};
global.Notification={requestPermission(){}}; global.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
global.scrollTo=()=>{}; global.open=()=>null; global.getComputedStyle=()=>({});
global.innerHeight=800; global.innerWidth=400; global.screen={}; global.addEventListener=()=>{};
const fs=require('fs');
const code=fs.readFileSync('_blk4.js','utf8');
// 分句执行，捕获首抛，映射全局行号
const baseGlobal=8818; // 块4 script起始行
// 直接把代码分行注入 try 逐行? 不行，函数定义跨行。改为整体 eval，解析 stack 行号
try {
  eval(code);
  console.log('OK: 无抛错');
} catch(e){
  console.log('THROW:', e&&e.message);
  const m=(e&&e.stack||'').match(/<anonymous>:(\d+):(\d+)/);
  if(m){ const blkLine=+m[1]; const g=baseGlobal+(blkLine-1); console.log(`块内行=${blkLine} → 全局行≈${g} (是否在12373之前: ${g<12373})`); }
  console.log((e&&e.stack||'').split('\n').slice(0,6).join('\n'));
}
