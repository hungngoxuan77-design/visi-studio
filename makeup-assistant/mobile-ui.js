/* VISI Studio mobile UI: progressive disclosure & install prompt. No AI/curriculum modifications. */
'use strict';
(() => {
  const drawer=document.getElementById('paletteDrawer');
  const mq=window.matchMedia('(max-width: 820px)');
  if(drawer){
    let mobileChoice=false;
    const updateDrawer=() => { drawer.open = mq.matches ? mobileChoice : true; };
    drawer.addEventListener('toggle', () => { if(mq.matches) mobileChoice=drawer.open; });
    updateDrawer();
    mq.addEventListener?.('change', updateDrawer);
  }
  // PWA: browser can show installation when eligible; iOS uses Share > Add to Home Screen.
  const installBtn=document.getElementById('installAppBtn');
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt=e;
    if(installBtn)installBtn.hidden=false;
  });
  if(installBtn)installBtn.addEventListener('click', async () => {
    if(!deferredPrompt)return;
    const prompt=deferredPrompt;deferredPrompt=null;installBtn.hidden=true;
    try { await prompt.prompt(); await prompt.userChoice; }catch(error){console.warn('PWA install:',error);}
  });
  window.addEventListener('appinstalled', () => {if(installBtn)installBtn.hidden=true;deferredPrompt=null;});
  if('serviceWorker' in navigator && window.isSecureContext){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js',{scope:'./'})
        .catch(error => console.warn('Visi PWA service worker:',error));
    });
  }
})();
