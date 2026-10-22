import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromePort} from '../vendor/anatomy/scripts/chrome-port.mjs';

const profile=mkdtempSync(join(tmpdir(),'starship-touch-'));
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
  '--no-first-run','--no-default-browser-check','--hide-scrollbars','--allow-file-access-from-files','about:blank',
]);
let socket;
const checks=[],errors=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
  const port=await chromePort(chrome,profile);
  const page=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
  let seq=0;const pending=new Map();
  socket.onmessage=event=>{
    const data=JSON.parse(event.data);
    if(data.id&&pending.has(data.id)){pending.get(data.id)(data);pending.delete(data.id);}
    if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text);
    if(data.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(data.params.type))errors.push(data.params.args.map(a=>a.value||a.description).join(' '));
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq,timer=setTimeout(()=>reject(new Error(`CDP timeout: ${method}`)),30000);
    pending.set(id,data=>{clearTimeout(timer);data.error?reject(new Error(data.error.message)):resolve(data.result);});
    socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  async function check(name,expression){const value=await evaluate(expression);if(!value)throw new Error(`FAIL ${name}`);checks.push(name);console.log('PASS',name);}
  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(50);}throw new Error(`Timed out: ${expression}`);}
  async function center(selector,scroll=true){
    if(scroll){await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await pause(150);}
    return evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  }
  async function tap(selector){const p=await center(selector);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1,radiusX:2,radiusY:2}]});await pause(50);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(100);}
  async function drag(points){
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1,radiusX:2,radiusY:2}]});
    for(const p of points.slice(1)){await pause(25);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1,radiusX:2,radiusY:2}]});}
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(150);
  }
  async function shot(name){
    const size=await evaluate('({width:document.documentElement.clientWidth,height:document.documentElement.scrollHeight})');
    const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,...size,scale:1}});
    writeFileSync(resolve(`work/qa/${name}.png`),Buffer.from(r.data,'base64'));console.log('shot',name);
  }
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:780,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.qaFrames=0;const nativeRAF=requestAnimationFrame;window.requestAnimationFrame=callback=>nativeRAF(t=>{window.qaFrames++;callback(t)});'});
  await send('Page.navigate',{url:pathToFileURL(resolve('outputs/starship.html')).href});await until('typeof starshipState==="function"');await pause(500);
  await check('390px initial full assembly','starshipState().progress===0 && !starshipState().pinned');
  await check('no mobile horizontal overflow','document.documentElement.scrollWidth===390');
  await check('slider follows the drawing on mobile',"document.querySelector('.frame-bottom').getBoundingClientRect().top < document.querySelector('.sidebar').getBoundingClientRect().top");
  await shot('phone-assembled');
  await tap('[data-explode]');await until('starshipState().progress>.999');await shot('phone-apart');
  await tap('[data-part=payload]');await check('touch module selection','starshipState().pinned==="payload"');
  await center('.stage');await tap('[data-inspect]');await pause(1600);await check('touch detail view','starshipState().focused');await shot('phone-payload-detail');
  await tap('[data-reset]');await center('.stage');await until('starshipState().progress<.001');
  const bounds=await evaluate("(()=>{const r=document.querySelector('.stage').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height}})()");
  await drag(Array.from({length:20},(_,i)=>({x:bounds.x+55+i*7.5,y:bounds.y+bounds.height*.65})));
  await pause(1800);await check('real touch drag holds separation','starshipState().held>.3 && starshipState().held<1 && Math.abs(starshipState().held-starshipState().progress)<.003');
  await shot('phone-drag');
  await tap('[data-reset]');await center('.stage');await until('starshipState().progress<.001');
  const start=await evaluate('scrollY');
  await drag(Array.from({length:16},(_,i)=>({x:80,y:560-i*18})));
  await check('vertical touch gesture scrolls the page',`scrollY>${start+80}`);
  await check('vertical scroll does not commit a drag','starshipState().held===null');
  await tap('[data-filter=propulsion]');await check('touch filter','starshipState().filter==="propulsion" && document.querySelectorAll(".part:not([hidden])").length===3');
  await tap('[data-part=vac]');await check('touch selection through filter','starshipState().pinned==="vac"');
  await tap('[data-reset]');await check('touch reassemble clears filter','starshipState().filter==="all" && !starshipState().pinned');
  await center('.stage');await tap('[data-tour]');await pause(800);
  await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');await until('!starshipState().visible');await pause(100);
  const before=await evaluate('qaFrames');await pause(800);await check('animation sleeps offscreen',`qaFrames===${before}`);
  await tap('[data-reset]');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await until('starshipState().reduced');await pause(250);
  await center('.stage');await tap('[data-explode]');await check('reduced motion settles immediately','starshipState().progress===1 && Object.values(starshipState().shares).every(x=>x===1)');
  await check('reduced motion disables tour','document.querySelector("[data-tour]").disabled');
  await shot('phone-reduced-apart');
  await tap('[data-reset]');await check('reduced motion reassembles immediately','starshipState().progress===0');
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await pause(400);
  await check('landscape resize does not overflow','document.documentElement.scrollWidth<=844');
  await check('no external runtime resources',"performance.getEntriesByType('resource').every(x=>x.name.startsWith('file:'))");
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('console: clean');
  writeFileSync(resolve('work/qa/touch-result.json'),JSON.stringify({status:'PASS',checks,errors,device:'Chromium touch emulation, 390x780; landscape 844x390',physicalDevice:false},null,2));
}catch(error){console.error(error);process.exitCode=1;writeFileSync(resolve('work/qa/touch-result.json'),JSON.stringify({status:'FAIL',checks,errors,error:String(error)},null,2));}
finally{socket?.close();chrome.kill('SIGKILL');await pause(100);rmSync(profile,{recursive:true,force:true});}
