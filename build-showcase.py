# Generates public/showcase/index.html: a non-interactive, auto-playing copy of the site.
import re,os
s=open('public/index.html').read()
s=re.sub(r'<a ([^>]*?)href="[^"]*"',r'<a \1',s)
s=s.replace('<link rel="canonical" href="https://ledring.dev/">','<meta name="robots" content="noindex">')
s=s.replace("localStorage.getItem(\"theme\")||\"light\"","\"light\"")
CSS='<style>html,body,body *{pointer-events:none!important;cursor:default!important;user-select:none}#cur,.term,#topen,.toast{display:none!important}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}</style>'
JS=r'''<script>(function(){
try{localStorage.removeItem('theme')}catch(e){}
['wheel','touchmove','keydown','mousedown','click'].forEach(function(t){addEventListener(t,function(e){e.preventDefault();e.stopPropagation()},{capture:true,passive:false})});
var ease=function(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
function Y(id){var e=document.getElementById(id);return e?e.getBoundingClientRect().top+scrollY-60:0}
function to(y,ms){return new Promise(function(r){var y0=scrollY,t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/ms);scrollTo(0,y0+(y-y0)*ease(k));k<1?requestAnimationFrame(f):r()})(t0)})}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
function th(d){var dk=document.documentElement.dataset.theme==='dark';if(dk!==d)document.getElementById('theme').onclick()}
async function run(){var S=window.__SC;
 for(;;){scrollTo(0,0);var w=document.getElementById('wall');w&&w.classList.remove('broken');
  await wait(2500);S.stAdd(14);await wait(1600);S.stAdd(14);await wait(1600);S.stAdd(22);await wait(2200);S.stAdd(-60);await wait(1400);
  await to(Y('about'),1600);await wait(2600);
  await to(Y('selected'),1800);await wait(2400);
  th(true);await wait(1600);
  await to(Y('oss'),1400);await wait(2000);
  await to(Y('now'),1400);await wait(2200);
  await to(Y('wall')-120,1400);await wait(1200);S.breakWall();await wait(3200);
  await to(Y('human'),1400);await wait(3200);
  th(false);await wait(900);
  await to(Y('path')-100,1400);await wait(3000);
  await to(document.body.scrollHeight,1400);await wait(2000);
  await to(0,2400);S.stAdd(-100);await wait(800)}}
addEventListener('load',function(){setTimeout(run,800)});
})()</script>'''
s=s.replace('</head>',CSS+'</head>',1).replace('</body>',JS+'</body>',1)
os.makedirs('public/showcase',exist_ok=True);open('public/showcase/index.html','w').write(s)
