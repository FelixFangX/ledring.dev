(function(){
  var root=document.documentElement;
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  var nativeTransitions='CSSViewTransitionRule' in window && 'onpagereveal' in window;
  var pending;
  function eligible(url){
    return url.origin===location.origin && /^\/(tools\/?|projects\/?|notes\/?)?$/.test(url.pathname);
  }
  if(!eligible(new URL(location.href)))return;

  // Register before first paint so native navigation never gets a second reveal.
  addEventListener('pageswap',function(event){
    if(event.viewTransition && (reduced.matches || !event.activation || !eligible(new URL(event.activation.entry.url)))){
      event.viewTransition.skipTransition();
    }
  });
  addEventListener('pagereveal',function(event){
    var from=window.navigation && navigation.activation && navigation.activation.from;
    if(event.viewTransition && (reduced.matches || !from || !eligible(new URL(from.url)))){
      event.viewTransition.skipTransition();
    }else if(event.viewTransition){
      root.classList.add('nav-native');
    }
  });

  try{
    var destination=sessionStorage.getItem('nav-transition');
    sessionStorage.removeItem('nav-transition');
    if(!nativeTransitions && !reduced.matches && destination===location.href && location.pathname!=='/'){
      root.classList.add('nav-enter');
    }
  }catch(error){}
  addEventListener('pageshow',function(event){
    clearTimeout(pending);
    pending=null;
    root.classList.remove('nav-leaving');
    if(event.persisted)root.classList.remove('nav-enter');
  });
  document.addEventListener('click',function(event){
    if(nativeTransitions || reduced.matches || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    var link=event.target.closest && event.target.closest('a[href]');
    if(!link || link.hasAttribute('download') || (link.target && link.target!=='_self'))return;
    var url=new URL(link.href,location.href);
    if(!eligible(url) || (url.pathname===location.pathname && url.search===location.search))return;
    event.preventDefault();
    if(pending)return;
    root.classList.remove('nav-enter');
    root.classList.add('nav-leaving');
    pending=setTimeout(function(){
      try{sessionStorage.setItem('nav-transition',url.href)}catch(error){}
      location.assign(url.href);
    },160);
  });
})();
