// 最小 DOM/localStorage 桩，执行块4顶层，定位首个同步运行时异常
function makeEl(){ 
  const t=function(){ return makeEl(); };
  return new Proxy(t, {
    get(obj,key){
      if(key===Symbol.toPrimitive) return ()=>0;
      if(typeof key==='string'){
        if(key==='length') return 0;
        if(key==='style') return new Proxy(function(){}, {get:()=>function(){}, set:()=>true});
        if(key==='classList') return {add:()=>{},remove:()=>{},contains:()=>false,toggle:()=>{},addEventListener:()=>{}};
        if(key==='addEventListener') return ()=>{};
        if(key==='removeEventListener') return ()=>{};
        if(key==='value'||key==='textContent'||key==='innerHTML'||key==='src'||key==='title'||key==='placeholder') return '';
        if(key==='checked'||key==='disabled'||key==='hidden') return false;
        if(key==='files') return [];
        if(key==='dataset') return {};
        if(key==='tagName') return 'DIV';
        if(key==='style') return {};
      }
      return makeEl();
    },
    set(){ return true; },
    apply(){ return makeEl(); }
  });
}
function makeList(){ const a=makeEl(); a.length=0; for(let i=-1;i<20;i++) a.push(makeEl()); return a; }
global.window = global;
global.document = {
  getElementById:function(){return makeEl();},
  getElementsByClassName:function(){return makeList();},
  getElementsByTagName:function(){return makeList();},
  querySelector:function(){return makeEl();},
  querySelectorAll:function(){return makeList();},
  createElement:function(){return makeEl();},
  addEventListener:function(){},
  removeEventListener:function(){},
  body:makeEl(), documentElement:makeEl(), head:makeEl(),
  title:'', cookie:'', location:{}
};
global.navigator = { userAgent:'Mozilla/5.0 (iPhone)', platform:'iPhone', language:'zh-CN', onLine:true, clipboard:{writeText:()=>Promise.resolve()} };
global.localStorage = { _d:{}, getItem:function(k){return this._d[k]??null;}, setItem:function(k,v){this._d[k]=String(v);}, removeItem:function(k){delete this._d[k];}, clear:function(){this._d={};}, key:function(){return null;}, get length(){return Object.keys(this._d).length;} };
global.sessionStorage = global.localStorage;
global.location = { href:'https://x/', protocol:'https:', host:'x', pathname:'/', search:'', hash:'', origin:'https://x', reload:function(){}, assign:function(){}, replace:function(){} };
global.fetch = function(){ return Promise.reject(new Error('fetch stub')); };
global.XMLHttpRequest = function(){};
global.WebSocket = function(){};
global.requestAnimationFrame = function(fn){ try{return (typeof fn==='function'&&fn())||0;}catch(e){return 0;} };
global.setTimeout=setTimeout; global.setInterval=setInterval; global.clearTimeout=clearTimeout;
global.indexedDB = { open:function(){ return { onupgradeneeded:null, onsuccess:null, onerror:null, result:null };} };
global.Notification={requestPermission:function(){}};
global.matchMedia=function(){ return {matches:false,addEventListener:()=>{},addListener:()=>{}}; };

// 读块4执行
const fs=require('fs');
const code=fs.readFileSync('_blk4.js','utf8');
// 逐行执行并定位第一个抛错行
const lines=code.split('\n');
let baseLine=8818; // 块4 script 起始行(全局文件中)
for(let i=0;i<lines.length;i++){
  try{ new Function('return (function(){' + lines[i] + '});')(); }
  catch(e){ /* 单行定义不做，跳过 */ }
}
// 干脆整个执行
try {
  eval(code);
  console.log('RESULT: 块4 同步执行无异常');
} catch(e) {
  // 识别抛错的用户源码行：解析stack
  console.log('RESULT: 块4 同步执行抛异常');
  console.log('MSG:', e && e.message);
  const st=(e&&e.stack)||'';
  console.log('STACK:', st.slice(0,800));
}
