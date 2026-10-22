// Reproducible 44-second, 1080p/30 fps capture of the real SVG application.
// Requires Node 22+, Chrome/Chromium and ffmpeg. Run from the repository root.
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {chromePort} from '../vendor/anatomy/scripts/chrome-port.mjs';

const profile=mkdtempSync(join(tmpdir(),'starship-film-'));
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
  '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
  '--no-first-run','--no-default-browser-check','--hide-scrollbars','--allow-file-access-from-files','about:blank',
]);
mkdirSync('media',{recursive:true});mkdirSync('work/recording',{recursive:true});
let socket,encoder;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const fps=30,duration=44;
const events=new Map([
  [0,{caption:'01 / COMPLETE VEHICLE'}],
  [4,{caption:'02 / CONTROL THE SEPARATION'}],
  [12,{click:'[data-part=payload]',caption:'03 / INSIDE THE PAYLOAD BAY'}],
  [14,{click:'[data-inspect]'}],[18,{click:'[data-inspect]'}],
  [20,{click:'[data-part=sea]',caption:'04 / INSPECT THE RAPTOR CLUSTER'}],
  [22,{click:'[data-inspect]'}],[27,{click:'[data-inspect]'}],
  [29,{click:'[data-part=methane]',caption:'05 / EXPLORE THE TANK STRUCTURE'}],
  [31,{click:'[data-inspect]'}],[35,{click:'[data-inspect]'}],
  [36,{click:'[data-filter=all]',caption:'06 / EVERY SYSTEM, IN CONTEXT'}],
  [38,{click:'[data-theme-toggle]'}],
  [39,{click:'[data-reset]',caption:'07 / REASSEMBLE'}],
  [42,{click:'[data-theme-toggle]',caption:'STARSHIP ANATOMY / EXPLORE THE STRUCTURE'}],
]);
try{
  const port=await chromePort(chrome,profile);
  const tab=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  socket=new WebSocket(tab.webSocketDebuggerUrl);await once(socket,'open');
  let seq=0;const pending=new Map(),errors=[];
  socket.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.id&&pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);}
    if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text);
    if(d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errors.push(d.params.args.map(a=>a.value||a.description).join(' '));
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq,timer=setTimeout(()=>reject(new Error(`CDP timeout: ${method}`)),30000);
    pending.set(id,d=>{clearTimeout(timer);d.error?reject(new Error(d.error.message)):resolve(d.result)});
    socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    let filmId=0;const filmCallbacks=new Map();
    window.requestAnimationFrame=cb=>{const id=++filmId;filmCallbacks.set(id,cb);return id};
    window.cancelAnimationFrame=id=>filmCallbacks.delete(id);
    window.filmFrame=t=>{const callbacks=[...filmCallbacks.values()];filmCallbacks.clear();for(const cb of callbacks)cb(t)};
  `});
  await send('Page.navigate',{url:pathToFileURL(resolve('outputs/starship.html')).href});
  for(let i=0;i<100;i++){if(await evaluate('typeof starshipState==="function"'))break;await pause(50);}
  await evaluate(`(()=>{
    const style=document.createElement('style');style.textContent='.page{zoom:.84;max-width:2000px;padding-top:24px}.film-caption{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);font:12px ui-monospace,monospace;letter-spacing:.15em;color:var(--sub);background:var(--page);padding:8px 16px;border-radius:5px;white-space:nowrap;pointer-events:none}';document.head.append(style);
    const label=document.createElement('div');label.className='film-caption';document.body.append(label);
  })()`);
  await pause(200);
  // Warm up the layout without consuming the filmed timeline.
  for(let f=0;f<90;f++)await evaluate(`filmFrame(${f*1000/fps})`);
  encoder=spawn('ffmpeg',['-y','-loglevel','warning','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','media/starship-demo.mp4'],{stdio:['pipe','ignore','pipe']});
  let encodingLog='';encoder.stderr.on('data',d=>encodingLog+=d);
  const encoded=once(encoder,'close');
  const samples=[];
  for(let frame=0;frame<duration*fps;frame++){
    const second=frame/fps,event=events.get(second);
    if(event){
      if(event.caption)await evaluate(`document.querySelector('.film-caption').textContent=${JSON.stringify(event.caption)}`);
      if(event.click)await evaluate(`document.querySelector(${JSON.stringify(event.click)}).click()`);
    }
    if(second>=4&&second<=9){
      const progress=Math.round((second-4)/5*100);
      await evaluate(`(()=>{const el=document.querySelector('#separation');el.value='${progress}';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    }
    await evaluate(`filmFrame(${3000+frame*1000/fps})`);
    const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:94,captureBeyondViewport:false});
    const bytes=Buffer.from(shot.data,'base64');
    if(!encoder.stdin.write(bytes))await once(encoder.stdin,'drain');
    if([0,9,16,25,33,40,43].includes(second)){
      writeFileSync(`work/recording/frame-${String(second).padStart(2,'0')}.jpg`,bytes);
      samples.push({second,state:await evaluate('starshipState()'),pageHeight:await evaluate('document.querySelector(".page").getBoundingClientRect().bottom')});
    }
    if(frame%150===0)console.log(`captured ${(frame/fps).toFixed(0)} / ${duration}s`);
  }
  encoder.stdin.end();const [code]=await encoded;
  if(code!==0)throw new Error(`ffmpeg exited ${code}: ${encodingLog}`);
  if(errors.length)throw new Error(errors.join('\n'));
  writeFileSync('work/recording/receipt.json',JSON.stringify({duration,fps,width:1920,height:1080,frames:duration*fps,errors,samples},null,2));
  console.log('Recorded media/starship-demo.mp4; console clean.');
}catch(error){console.error(error);encoder?.kill('SIGKILL');process.exitCode=1;}
finally{socket?.close();chrome.kill('SIGKILL');await pause(100);rmSync(profile,{recursive:true,force:true});}
