window.qaFrames=0;
const qaNativeRAF=window.requestAnimationFrame.bind(window);
window.requestAnimationFrame=callback=>qaNativeRAF(now=>{window.qaFrames++;callback(now);});
