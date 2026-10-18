(function(){
  var toc=document.getElementById('toc');
  var n=0,min=3;
  document.querySelectorAll('[data-min]').forEach(function(c){n++;min+=parseInt(c.getAttribute('data-min'),10)||1;});
  var issue=document.getElementById('issue');
  if(issue){issue.innerHTML='記事 <b>'+n+'本</b> / 読了目安 <b>約'+min+'分</b>';}

  /* ---- いま読んでいる場所 ---- */
  var links=[].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var last=null;
  function spy(){
    var cur=null,y=window.innerHeight*0.35;
    links.forEach(function(a){
      var t=document.querySelector(a.getAttribute('href'));
      if(t&&t.getBoundingClientRect().top<=y)cur=a;
    });
    if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4)cur=links[links.length-1]||cur;
    if(!cur)cur=links[0]||null;
    links.forEach(function(a){a.setAttribute('aria-current',a===cur?'true':'false');});
    if(cur&&cur!==last){
      last=cur;
      if(getComputedStyle(toc).flexDirection==='row'){toc.scrollLeft=cur.offsetLeft-toc.clientWidth/2+cur.offsetWidth/2;}
    }
  }
  window.addEventListener('scroll',spy,{passive:true});
  window.addEventListener('resize',spy);
  spy();

  /* ---- 気になる記事のチェック(このブラウザに保存) ---- */
  var KEY='dd.saved';
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return [];}}
  function store(a){try{localStorage.setItem(KEY,JSON.stringify(a));}catch(e){}}
  var saved=load();
  var nEl=document.getElementById('savedN'),panel=document.getElementById('saved'),list=document.getElementById('savedList');
  function has(id){return saved.some(function(x){return x.id===id;});}
  function paint(){
    document.querySelectorAll('.ck').forEach(function(b){
      var o;try{o=JSON.parse(b.getAttribute('data-ck'));}catch(e){return;}
      var on=has(o.id);b.setAttribute('aria-pressed',on?'true':'false');b.textContent=on?'★':'☆';
    });
    nEl.textContent=saved.length;
  }
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function render(){
    list.innerHTML='';
    if(!saved.length){list.appendChild(el('p','sv-n','まだありません。気になる記事の左上の☆を押してください。'));return;}
    saved.slice().reverse().forEach(function(x){
      var d=el('div','sv-i');
      d.appendChild(el('div','m',x.date+' / '+x.gl));
      var t=el('div');var a=el('a',null,x.h);if(x.r&&x.r[0]){a.href=x.r[0].u;a.target='_blank';a.rel='noopener';}t.appendChild(a);d.appendChild(t);
      if(x.img){var im=document.createElement('img');im.src=x.img;im.alt='';im.loading='lazy';im.referrerPolicy='no-referrer';im.onerror=function(){im.remove();};d.appendChild(im);}
      if(x.a)d.appendChild(el('div',null,x.a));
      var s=el('div','m','出典: ');
      (x.r||[]).forEach(function(r){var l=el('a',null,r.t);l.href=r.u;l.target='_blank';l.rel='noopener';s.appendChild(l);s.appendChild(document.createTextNode(' '));});
      d.appendChild(s);
      var rm=el('button',null,'外す');rm.addEventListener('click',function(){saved=saved.filter(function(y){return y.id!==x.id;});store(saved);paint();render();});
      d.appendChild(rm);list.appendChild(d);
    });
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('.ck');if(!b)return;
    e.preventDefault();
    var o;try{o=JSON.parse(b.getAttribute('data-ck'));}catch(x){return;}
    if(has(o.id)){saved=saved.filter(function(y){return y.id!==o.id;});}else{saved.push(o);}
    store(saved);paint();if(!panel.hidden)render();
  });
  document.getElementById('savedBtn').addEventListener('click',function(){panel.hidden=!panel.hidden;if(!panel.hidden)render();});
  document.getElementById('savedClose').addEventListener('click',function(){panel.hidden=true;});
  document.getElementById('savedClear').addEventListener('click',function(){if(!saved.length||confirm('チェックをすべて外しますか?')){saved=[];store(saved);paint();render();}});
  paint();

  /* ---- 巡回リンク(日替わりのローテーション + その日のうちだけ残るチェック) ---- */
  (function(){
    var sec=document.getElementById('patrol');
    if(!sec)return;
    var jstDay=Math.floor((Date.now()+9*3600*1000)/86400000);
    var date=new Date(Date.now()+9*3600*1000).toISOString().slice(0,10);
    var per=parseInt(sec.getAttribute('data-per-day'),10)||6;
    var rest=document.getElementById('ptRest'),today=document.getElementById('ptToday');
    var wraps=[].slice.call(rest.querySelectorAll('.rotwrap'));
    var N=wraps.length;
    if(N){
      var start=(jstDay*per)%N;
      for(var k=0;k<Math.min(per,N);k++){
        var w=wraps[(start+k)%N];
        while(w.firstChild)today.appendChild(w.firstChild);
        w.remove();
      }
    }
    var boxes=[].slice.call(sec.querySelectorAll('#ptDaily input[data-pt], #ptToday input[data-pt], #ptRest input[data-pt]'));
    var K='dd.patrol.'+date;
    var st;try{st=JSON.parse(localStorage.getItem(K)||'{}');}catch(e){st={};}
    try{Object.keys(localStorage).forEach(function(k){if(k.indexOf('dd.patrol.')===0&&k!==K)localStorage.removeItem(k);});}catch(e){}
    var nEl=document.getElementById('patrolN');
    var todayBoxes=boxes.filter(function(b){return !b.closest('#ptRest');});
    function paintP(){
      var c=0;
      boxes.forEach(function(b){var on=!!st[b.getAttribute('data-pt')];b.checked=on;b.closest('.pt').classList.toggle('done',on);});
      todayBoxes.forEach(function(b){if(st[b.getAttribute('data-pt')])c++;});
      if(nEl)nEl.textContent='今日 '+c+' / '+todayBoxes.length+' チェック済み';
    }
    function saveP(){try{localStorage.setItem(K,JSON.stringify(st));}catch(e){}}
    boxes.forEach(function(b){
      b.addEventListener('change',function(){st[b.getAttribute('data-pt')]=b.checked;saveP();paintP();});
      var a=b.closest('.pt').querySelector('.ptl');
      if(a)a.addEventListener('click',function(){st[b.getAttribute('data-pt')]=true;saveP();paintP();});
    });
    paintP();
  })();
})();
