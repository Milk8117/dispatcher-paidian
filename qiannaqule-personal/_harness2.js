function makeEl(){
  const t=function(){ return makeEl(); };
  return new Proxy(t,{
    get(o,k){
      if(k===Symbol.toPrimitive) return ()=>0;
      if(k==='style'||k==='dataset') return new Proxy(function(){},{get:()=>function(){},set:()=>true});
      if(k==='classList') return {add(){},remove(){},contains(){return false},toggle(){}};
      if(k==='addEventListener'||k==='removeEventListener') return ()=>{};
      if(['value','textContent','innerHTML','src','title','placeholder','id','className','type','name'].includes(k)) return '';
      if(['checked','disabled','hidden','complete'].includes(k)) return false;
      if(k==='files') return [];
      if(k==='length') return 0;
      if(k==='parentNode'||k==='firstChild'||k==='nextSibling') return null;
      return makeEl();
    },
    set(){return true;},
    apply(){return makeEl();}
  });
}
function makeList(){ const a=[]; return a; }
global.window=global;
global.self=global;
global.document={
  getElementById(){return makeEl();}, getElementsByClassName(){return makeList();},
  getElementsByTagName(){return makeList();}, querySelector(){return makeEl();},
  querySelectorAll(){return makeList();}, createElement(){return makeEl();},
  addEventListener(){}, removeEventListener(){},
  body:makeEl(), documentElement:makeEl(), head:makeEl(), title:'', cookie:'',
  location:{}
};
global.navigator={userAgent:'iPhone',platform:'iPhone',language:'zh-CN',onLine:true,
  clipboard:{writeText:()=>Promise.resolve()}};
global.localStorage={ _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);},
  removeItem(k){delete this._d[k];}, clear(){this._d={};}};
global.sessionStorage=global.localStorage;
global.location={href:'https://x/',protocol:'https:',host:'x',pathname:'/',search:'',hash:'',
  origin:'https://x',reload(){},assign(){},replace(){}};
global.fetch=()=>Promise.reject(new Error('stub'));
global.XMLHttpRequest=function(){};
global.WebSocket=function(){};
global.requestAnimationFrame=()=>0;
global.cancelAnimationFrame=()=>0;
global.indexedDB={open(){return {onupgradeneeded:null,onsuccess:null,onerror:null,result:null};}};
global.Notification={requestPermission(){}};
global.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
global.scrollTo=()=>{}; global.open=()=>null; global.getComputedStyle=()=>({});
global.innerHeight=800; global.innerWidth=400; global.screen={};
global.addEventListener=()=>{};
const fs=require('fs');
const code=fs.readFileSync('_blk4.js','utf8');
// 保护: 若整体 eval 死循环，让超时退出
process.on('exit',()=>{console.log('EXIT fired')});
try {
  eval(code);
  console.log('RESULT_OK: 块4 同步执行无异常');
} catch(e){
  console.log('RESULT_THROW:', e&&e.message);
  console.log((e&&e.stack||'').split('\n').slice(0,3).join('\n'));
}
