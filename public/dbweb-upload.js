(()=>{"use strict";
const cloud='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V9a5 5 0 0 1 10 0v1a4 4 0 0 1 1 7.9M7 10a4 4 0 0 0-2 7.5M12 12v9m0-9 3 3m-3-3-3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const fileIcon='<svg class="dbw-upload-file-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3h12l7 7v19H7zM19 3v8h7" stroke="#4169e1" stroke-width="1.5" fill="none"/></svg>';
function enhance(input,index){
 if(input.dataset.dbwUploadReady==="1")return;
 const hidden=input.hidden||getComputedStyle(input).display==="none"||input.getAttribute("aria-hidden")==="true"||input.classList.contains("hidden");
 const zone=input.closest("#uploadArea,.upload-area,.upload-zone,.file-drop-zone,.drop-zone,.dropzone,.image-upload-area");
 let trigger=null;
 if(hidden&&!zone&&input.id){const escaped=window.CSS&&CSS.escape?CSS.escape(input.id):input.id;trigger=document.querySelector(`button[onclick*="${escaped}"],label[for="${escaped}"],[role="button"][onclick*="${escaped}"]`);}
 if(hidden&&!zone&&!trigger)return;
 let card=zone;
 if(!card){card=document.createElement("div");const anchor=trigger||input;anchor.parentNode.insertBefore(card,anchor);if(trigger)trigger.classList.add("dbw-upload-legacy");}
 card.classList.add("dbw-upload-card");
 const inputId=input.id||("dbw-file-"+index);input.id=inputId;
 Array.from(card.children).forEach(child=>{if(child!==input&&!child.classList.contains("dbw-upload-preview"))child.classList.add("dbw-upload-legacy");});
 const hero=document.createElement("div");hero.className="dbw-upload-hero";
 const label=document.createElement("strong");
 const accept=(input.accept||"").toLowerCase();
 const imageOnly=accept.includes("image/")&&!accept.includes("application/")&&!accept.includes(".pdf");
 label.textContent=imageOnly?"Browse image to upload!":"Browse file to upload!";
 const hint=document.createElement("small");hint.textContent=input.multiple?"Choose one or more files from your device":"Tap to choose a file from your device";
 hero.innerHTML=cloud;hero.append(label,hint);
 const footer=document.createElement("div");footer.className="dbw-upload-footer";
 const status=document.createElement("span");status.className="dbw-upload-status";status.textContent="No file selected";
 const clear=document.createElement("button");clear.type="button";clear.className="dbw-upload-clear";clear.setAttribute("aria-label","Clear selected file");clear.title="Clear selection";clear.textContent="×";clear.hidden=true;
 footer.insertAdjacentHTML("afterbegin",fileIcon);footer.append(status,clear);
 card.insertBefore(hero,card.firstChild);card.append(footer);
 input.classList.add("dbw-upload-native");input.dataset.dbwUploadReady="1";
 if(input.parentNode!==card)card.appendChild(input);
 const update=()=>{const files=Array.from(input.files||[]);status.textContent=files.length?(files.length===1?files[0].name:files.length+" files selected"):"No file selected";clear.hidden=!files.length;};
 input.addEventListener("change",update);
 clear.addEventListener("click",event=>{event.stopPropagation();input.value="";update();input.dispatchEvent(new Event("change",{bubbles:true}));});
 card.addEventListener("click",event=>{if(event.target.closest("button,a,select,textarea")||event.target===input)return;input.click();});
 card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();input.click();}});
 card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label",label.textContent+" "+hint.textContent);
 card.addEventListener("dragover",event=>{event.preventDefault();card.style.background="rgba(0,110,255,.09)";});
 card.addEventListener("dragleave",()=>{card.style.background="";});
 card.addEventListener("drop",event=>{card.style.background="";if(!event.dataTransfer?.files?.length)return;event.preventDefault();try{input.files=event.dataTransfer.files;input.dispatchEvent(new Event("change",{bubbles:true}));}catch{}});
}
function init(){document.querySelectorAll('input[type="file"]').forEach((input,index)=>{try{enhance(input,index)}catch(error){console.warn("Dbweb upload UI skipped an input",error)}})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
new MutationObserver(()=>init()).observe(document.documentElement,{childList:true,subtree:true});
})();