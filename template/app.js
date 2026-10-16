(function(){
  var chips=document.getElementById('chips');
  var toc=document.getElementById('toc');
  var n=0,min=3;
  document.querySelectorAll('[data-min]').forEach(function(c){n++;min+=parseInt(c.getAttribute('data-min'),10)||1;});
  var issue=document.getElementById('issue');
  if(issue){issue.innerHTML=issue.getAttribute('data-prefix')+'記事 <b>'+n+'本</b> / 読了目安 <b>約'+min+'分</b>';}

  chips.addEventListener('click',function(e){
    var b=e.target.closest('.chip');if(!b)return;
    var f=b.getAttribute('data-f');
    chips.querySelectorAll('.chip').forEach(function(c){c.setAttribute('aria-pressed',c===b?'true':'false');});
    document.querySelectorAll('[data-g]').forEach(function(c){c.hidden=(f!=='all'&&c.getAttribute('data-g')!==f);});
    document.querySelectorAll('[data-grp]').forEach(function(s){s.hidden=!s.querySelector('[data-g]:not([hidden])');});
    document.querySelectorAll('[data-sec]').forEach(function(s){s.hidden=!s.querySelector('[data-g]:not([hidden])');});
    setTimeout(spy,0);
  });

  var links=[].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var last=null;
  function spy(){
    var cur=null,y=window.innerHeight*0.35;
    links.forEach(function(a){
      var t=document.querySelector(a.getAttribute('href'));
      a.hidden=!!(t&&t.hidden);
      if(t&&!t.hidden&&t.getBoundingClientRect().top<=y)cur=a;
    });
    var vis=links.filter(function(a){return !a.hidden;});
    if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4)cur=vis[vis.length-1]||cur;
    if(!cur)cur=vis[0]||null;
    links.forEach(function(a){a.setAttribute('aria-current',a===cur?'true':'false');});
    if(cur&&cur!==last){
      last=cur;
      if(getComputedStyle(toc).flexDirection==='row'){toc.scrollLeft=cur.offsetLeft-toc.clientWidth/2+cur.offsetWidth/2;}
    }
  }
  window.addEventListener('scroll',spy,{passive:true});
  window.addEventListener('resize',spy);
  spy();
})();
