(()=>{"use strict";
const cloud='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V9a5 5 0 0 1 10 0v1a4 4 0 0 1 1 7.9M7 10a4 4 0 0 0-2 7.5M12 12v9m0-9 3 3m-3-3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const fileIcon='<svg class="dbw-upload-file-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3h12l7 7v19H7zM19 3v8h7" stroke="#4169e1" stroke-width="1.5" fill="none"/></svg>';
function enhance(input,index){
 if(input.dataset.dbwUploadReady==="1")return;
 const hidden=input.hidden||getComputedStyle(input).display==="none"||input.getAttribute("aria-hidden")==="true"||input.classList.contains("hidden");
 const existingCard=input.closest(".dbw-upload-card");
 const zone=existingCard?null:input.closest("#uploadArea,.upload-area,.upload-zone,.file-drop-zone,.drop-zone,.dropzone,.image-upload-area");
 let trigger=null;
 if(hidden&&!zone&&!existingCard&&input.id){const escaped=window.CSS&&CSS.escape?CSS.escape(input.id):input.id;trigger=document.querySelector(`button[onclick*="${escaped}"],label[for="${escaped}"],[role="button"][onclick*="${escaped}"]`);}
 if(hidden&&!zone&&!trigger&&!existingCard)return;
 let card=zone;
 if(existingCard){card=document.createElement("div");existingCard.parentNode.insertBefore(card,existingCard);}
 else if(!card){card=document.createElement("div");const anchor=trigger||input;anchor.parentNode.insertBefore(card,anchor);if(trigger)trigger.classList.add("dbw-upload-legacy");}
 card.classList.add("dbw-upload-card");card.removeAttribute("onclick");card.style.cssText="box-sizing:border-box;width:100%;max-width:440px;min-height:220px;margin:12px 0;padding:10px;border:1px solid rgba(65,105,225,.16);border-radius:12px;display:flex;flex-direction:column;gap:8px;justify-content:space-between;background:rgba(0,110,255,.035);box-shadow:0 4px 22px rgba(15,23,42,.08);color:#111827;position:relative;overflow:hidden";
 const inputId=input.id||("dbw-file-"+index);input.id=inputId;
 Array.from(card.children).forEach(child=>{if(child!==input&&!child.classList.contains("dbw-upload-preview")){child.classList.add("dbw-upload-legacy");child.style.setProperty("display","none","important");}});
 const hero=document.createElement("div");hero.className="dbw-upload-hero";
 const label=document.createElement("strong");
 const accept=(input.accept||"").toLowerCase();
 const imageOnly=accept.includes("image/")&&!accept.includes("application/")&&!accept.includes(".pdf");
 label.style.cssText="font-size:15px;font-weight:650;line-height:1.4";label.textContent=imageOnly?"Browse image to upload!":"Browse file to upload!";
 const hint=document.createElement("small");hint.style.cssText="font-size:12px;line-height:1.45;color:#667085";hint.textContent=input.multiple?"Choose one or more files from your device":"Tap to choose a file from your device";
 hero.innerHTML=cloud;hero.style.cssText="flex:1;min-height:145px;width:100%;box-sizing:border-box;border:2px dashed #4169e1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px;text-align:center;background:#fff;color:#101828";hero.append(label,hint);
 const footer=document.createElement("div");footer.className="dbw-upload-footer";footer.style.cssText="width:100%;min-height:42px;box-sizing:border-box;padding:8px 10px;border-radius:9px;display:flex;align-items:center;gap:9px;background:rgba(0,110,255,.075);color:#101828;font-size:12px";
 const status=document.createElement("span");status.className="dbw-upload-status";status.textContent="No file selected";
 const clear=document.createElement("button");clear.type="button";clear.className="dbw-upload-clear";clear.setAttribute("aria-label","Clear selected file");clear.title="Clear selection";clear.textContent="×";clear.hidden=true;
 footer.insertAdjacentHTML("afterbegin",fileIcon);footer.append(status,clear);
 card.insertBefore(hero,card.firstChild);card.append(footer);
 input.hidden=false;input.removeAttribute("hidden");input.removeAttribute("aria-hidden");input.classList.remove("hidden");input.classList.add("dbw-upload-native");input.style.cssText="position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;overflow:hidden!important;clip-path:inset(50%)!important;left:10px!important;bottom:10px!important";input.dataset.dbwUploadReady="1";
 if(input.parentNode!==card)card.appendChild(input);
 const update=()=>{const files=Array.from(input.files||[]);status.textContent=files.length?(files.length===1?files[0].name:files.length+" files selected"):"No file selected";clear.hidden=!files.length;};
 input.addEventListener("change",update);
 const openPicker=()=>{try{input.hidden=false;input.removeAttribute("hidden");if(typeof input.showPicker==="function")input.showPicker();else input.click();}catch(error){try{input.click()}catch(fallbackError){console.warn("Could not open the device file picker",fallbackError)}}};
 clear.addEventListener("click",event=>{event.stopPropagation();input.value="";update();input.dispatchEvent(new Event("change",{bubbles:true}));});
 card.addEventListener("click",event=>{if(event.target.closest("button,a,select,textarea")||event.target===input)return;event.preventDefault();event.stopPropagation();openPicker()});
 card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();openPicker()}});
 card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label",label.textContent+" "+hint.textContent);
 if(!zone){card.addEventListener("dragover",event=>{event.preventDefault();card.style.background="rgba(0,110,255,.09)";});
 card.addEventListener("dragleave",()=>{card.style.background="";});
 card.addEventListener("drop",event=>{card.style.background="";if(!event.dataTransfer?.files?.length)return;event.preventDefault();try{input.files=event.dataTransfer.files;input.dispatchEvent(new Event("change",{bubbles:true}));}catch{}});}
}
function init(){document.querySelectorAll('input[type="file"]').forEach((input,index)=>{try{enhance(input,index)}catch(error){console.warn("Dbweb upload UI skipped an input",error)}})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
new MutationObserver(()=>init()).observe(document.documentElement,{childList:true,subtree:true});

/* Global safety net: make every upload zone use the same light card and open
   the browser's native Android document picker from a real user gesture. */
function dbwApplyGlobalUploadFix(){
 document.querySelectorAll('#uploadArea,.upload-area,.upload-zone,.file-drop-zone,.drop-zone,.dropzone,.image-upload-area').forEach(zone=>{
   const input=zone.querySelector('input[type="file"]');
   if(!input)return;
   zone.classList.add('dbw-upload-card');
   zone.style.cssText += ';box-sizing:border-box;width:100%;max-width:440px;min-height:220px;margin:12px 0;padding:10px;border:1px solid rgba(65,105,225,.16);border-radius:12px;display:flex;flex-direction:column;gap:8px;justify-content:space-between;background:#f8fbff;box-shadow:0 4px 22px rgba(15,23,42,.08);color:#111827;cursor:pointer';
   Array.from(zone.children).forEach(child=>{
     if(child!==input&&!child.classList.contains('dbw-upload-hero')&&!child.classList.contains('dbw-upload-footer')){
       child.classList.add('dbw-upload-legacy');
       child.style.setProperty('display','none','important');
     }
   });
   input.hidden=false;input.removeAttribute('hidden');input.removeAttribute('aria-hidden');input.classList.remove('hidden');
   input.classList.add('dbw-upload-native');
   input.style.cssText='position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;overflow:hidden!important;clip-path:inset(50%)!important;left:10px!important;bottom:10px!important';
 });
}
document.addEventListener('click',function(event){
 const target=event.target instanceof Element?event.target:null;
 if(!target)return;
 const zone=target.closest('#uploadArea,.upload-area,.upload-zone,.file-drop-zone,.drop-zone,.dropzone,.image-upload-area,.dbw-upload-card');
 if(!zone||target.closest('button,a,select,textarea'))return;
 const input=zone.querySelector('input[type="file"]');
 if(!input)return;
 event.preventDefault();
 try{input.hidden=false;input.removeAttribute('hidden');if(typeof input.showPicker==='function')input.showPicker();else input.click();}
 catch(error){try{input.click()}catch(fallback){console.warn('Dbweb could not open the device file picker',fallback)}}
},true);
document.addEventListener('DOMContentLoaded',dbwApplyGlobalUploadFix);
dbwApplyGlobalUploadFix();
new MutationObserver(()=>dbwApplyGlobalUploadFix()).observe(document.documentElement,{childList:true,subtree:true});

})();