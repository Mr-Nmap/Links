/* CS12 Security Links - app.js */
const LS_KEY = 'cs12v4';
const ALL_TAGS = ['SOC','Pentest','OSINT','Compliance','Training','Cloud'];
const state = { base:[], links:[], filter:{tag:'all',search:'',mainCat:null,subCat:null}, editId:null, deleteId:null };

function loadDelta(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{a:[],e:{},d:[]};}catch{return{a:[],e:{},d:[]};}}
function saveDelta(d){localStorage.setItem(LS_KEY,JSON.stringify(d));}
function applyDelta(base){
  const d=loadDelta(), del=new Set(d.d);
  const links=base.filter(l=>!del.has(l.id)).map(l=>d.e[l.id]?{...l,...d.e[l.id]}:l);
  const maxId=base.reduce((m,l)=>Math.max(m,l.id||0),0);
  return [...links,...(d.a||[]).map((l,i)=>({...l,id:maxId+1000+i}))];
}

async function init(){
  state.base=typeof BASE_DATA!=='undefined'?BASE_DATA:[];
  state.links=applyDelta(state.base);
  buildMainCatSelect();
  buildSidebar();
  buildCatDatalist();
  buildTagCheckboxes();
  render();
  bindEvents();
  updateStats();
}

function buildMainCatSelect(){
  const sel=document.getElementById('fMainCat');
  const cats=[...new Set(state.base.map(l=>l.main_category).filter(Boolean))].sort();
  sel.innerHTML=cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  if(cats.length) sel.value=cats[0];
}

function buildSidebar(){
  const nav=document.getElementById('sidebarNav');
  nav.innerHTML='';
  const all=document.createElement('div');
  all.className='nav-all'; all.id='navAll';
  all.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>Alle Links</span>';
  all.addEventListener('click',()=>{resetFilter();clearNavActive();});
  nav.appendChild(all);
  const groups={};
  for(const l of state.links){const mc=l.main_category||'Sonstige',c=l.category||mc;if(!groups[mc])groups[mc]={};groups[mc][c]=(groups[mc][c]||0)+1;}
  for(const[mc,cats] of Object.entries(groups)){
    const mcDiv=document.createElement('div'); mcDiv.className='nav-mc'; mcDiv.dataset.mc=mc;
    mcDiv.innerHTML='<span>'+esc(mc)+'</span><svg class="chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
    const subsDiv=document.createElement('div'); subsDiv.className='nav-subs'; subsDiv.style.display='none';
    mcDiv.addEventListener('click',()=>{const open=mcDiv.classList.toggle('open');subsDiv.style.display=open?'block':'none';if(open){clearNavActive();mcDiv.classList.add('active');setFilter({mainCat:mc,subCat:null});}});
    for(const[cat,cnt] of Object.entries(cats)){
      const sub=document.createElement('div'); sub.className='nav-sub'; sub.dataset.cat=cat;
      sub.innerHTML='<span>'+esc(cat)+'</span><span class="cnt">'+cnt+'</span>';
      sub.addEventListener('click',e=>{e.stopPropagation();clearNavActive();sub.classList.add('active');setFilter({mainCat:mc,subCat:cat,tag:'all',search:''});document.getElementById('searchInput').value='';document.getElementById('searchClear').style.display='none';setActiveTag('all');});
      subsDiv.appendChild(sub);
    }
    nav.appendChild(mcDiv); nav.appendChild(subsDiv);
  }
}

function clearNavActive(){document.querySelectorAll('.nav-mc,.nav-sub').forEach(e=>e.classList.remove('active'));}
function resetFilter(){
  document.getElementById('searchInput').value='';
  document.getElementById('searchClear').style.display='none';
  setActiveTag('all');
  setFilter({tag:'all',search:'',mainCat:null,subCat:null});
}
function updateStats(){
  document.getElementById('totalCount').textContent=state.links.length;
  document.getElementById('catCount').textContent=new Set(state.links.map(l=>l.category)).size;
  document.getElementById('socCount').textContent=state.links.filter(l=>(l.tags||[]).includes('SOC')).length;
}
function setFilter(changes){Object.assign(state.filter,changes);render();updateBreadcrumb();}
function getFiltered(){
  const{tag,search,mainCat,subCat}=state.filter; const q=search.toLowerCase().trim();
  return state.links.filter(l=>{
    if(subCat&&l.category!==subCat)return false;
    if(!subCat&&mainCat&&l.main_category!==mainCat)return false;
    if(tag!=='all'&&!(l.tags||[]).includes(tag))return false;
    if(q){const hay=[l.title,l.description,l.url,l.category,...(l.tags||[])].join(' ').toLowerCase();if(!hay.includes(q))return false;}
    return true;
  });
}
function updateBreadcrumb(){
  const{mainCat,subCat,tag,search}=state.filter;
  let path='Alle Links';
  if(subCat) path=mainCat+' \u203a '+subCat;
  else if(mainCat) path=mainCat;
  else if(tag!=='all') path='Tag: '+tag;
  else if(search) path='Suche: "'+search+'"';
  document.getElementById('bcPath').textContent=path;
  document.getElementById('bcCount').textContent=getFiltered().length+' Links';
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function getDomain(url){try{return new URL(url).hostname;}catch{return '';}}
function makeCard(link){
  const tags=link.tags||[], tbHtml=tags.map(t=>'<span class="tb '+t+'">'+t+'</span>').join('');
  const domain=getDomain(link.url||''), letter=esc((link.title||'?')[0].toUpperCase());
  const favHtml=domain?'<img class="fav" src="https://www.google.com/s2/favicons?domain='+domain+'&sz=32" onerror="this.outerHTML=\'<div class=fav-ph>'+letter+'</div>\'" alt="">':'<div class="fav-ph">'+letter+'</div>';
  const dispUrl=(link.url||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
  const d=document.createElement('div'); d.className='card'; d.dataset.id=link.id;
  d.innerHTML=
    '<div class="card-header">'+favHtml+
    '<span class="card-title">'+esc(link.title)+'</span>'+
    '<div class="card-acts">'+
    '<button class="ca-btn edit-btn" data-id="'+link.id+'" title="Bearbeiten"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'+
    '<button class="ca-btn del del-btn" data-id="'+link.id+'" title="L\u00f6schen"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>'+
    '</div></div>'+
    (link.description?'<p class="card-desc">'+esc(link.description)+'</p>':'')+
    '<a class="card-url" href="'+esc(link.url||'')+'" target="_blank" rel="noopener">'+esc(dispUrl)+'</a>'+
    '<div class="card-footer">'+tbHtml+
    '<a class="open-link" href="'+esc(link.url||'')+'" target="_blank" rel="noopener">'+
    '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'+
    '\u00d6ffnen</a></div>';
  return d;
}
function render(){
  const area=document.getElementById('cardsArea'), filtered=getFiltered();
  area.innerHTML='<div class="cards-grid" id="cardsGrid"></div>';
  const grid=document.getElementById('cardsGrid');
  if(!filtered.length){grid.innerHTML='<div class="empty"><h3>Keine Links gefunden</h3><p>Versuche andere Filter oder Suchbegriffe.</p></div>';return;}
  const frag=document.createDocumentFragment();
  filtered.forEach(l=>frag.appendChild(makeCard(l)));
  grid.appendChild(frag);
}
function setActiveTag(tag){document.querySelectorAll('.tag-btn').forEach(b=>b.classList.toggle('active',b.dataset.tag===tag));}
function bindEvents(){
  const si=document.getElementById('searchInput'),sc=document.getElementById('searchClear');
  let st;
  si.addEventListener('input',()=>{clearTimeout(st);sc.style.display=si.value?'block':'none';st=setTimeout(()=>{setFilter({search:si.value,mainCat:null,subCat:null});clearNavActive();},200);});
  sc.addEventListener('click',()=>{si.value='';sc.style.display='none';setFilter({search:'',mainCat:null,subCat:null});});
  document.getElementById('tagFilters').addEventListener('click',e=>{const btn=e.target.closest('.tag-btn');if(!btn)return;setActiveTag(btn.dataset.tag);setFilter({tag:btn.dataset.tag,mainCat:null,subCat:null,search:''});si.value='';sc.style.display='none';clearNavActive();});
  document.getElementById('cardsArea').addEventListener('click',e=>{const eb=e.target.closest('.edit-btn'),db=e.target.closest('.del-btn');if(eb)openEdit(+eb.dataset.id);if(db)openDel(+db.dataset.id);});
  document.getElementById('addBtn').addEventListener('click',()=>openAdd());
  document.getElementById('collapseBtn').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('collapsed'));
  ['modalClose','modalCancel'].forEach(id=>document.getElementById(id).addEventListener('click',closeEdit));
  document.getElementById('editModal').addEventListener('click',e=>{if(e.target===document.getElementById('editModal'))closeEdit();});
  document.getElementById('modalSave').addEventListener('click',saveLink);
  ['deleteClose','deleteCancel'].forEach(id=>document.getElementById(id).addEventListener('click',closeDel));
  document.getElementById('deleteModal').addEventListener('click',e=>{if(e.target===document.getElementById('deleteModal'))closeDel();});
  document.getElementById('deleteConfirm').addEventListener('click',confirmDel);
  document.getElementById('tagCheckboxes').addEventListener('click',e=>{const tc=e.target.closest('.tag-check');if(tc)tc.classList.toggle('on');});
  const expBtn=document.getElementById('exportBtn'),expMenu=document.getElementById('exportMenu');
  expBtn.addEventListener('click',e=>{e.stopPropagation();const r=expBtn.getBoundingClientRect();expMenu.style.top=(r.bottom+4)+'px';expMenu.style.left=r.left+'px';expMenu.classList.toggle('open');});
  document.addEventListener('click',()=>expMenu.classList.remove('open'));
  document.getElementById('expJson').addEventListener('click',()=>{dlJson(state.links,'cs12_alle.json');expMenu.classList.remove('open');});
  document.getElementById('expHtml').addEventListener('click',()=>{exportBM(state.links);expMenu.classList.remove('open');});
  document.getElementById('expFiltered').addEventListener('click',()=>{dlJson(getFiltered(),'cs12_gefiltert.json');expMenu.classList.remove('open');});
  document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change',e=>importJson(e.target.files[0]));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeEdit();closeDel();}
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();si.focus();si.select();}
    if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();openAdd();}
  });
}
function buildTagCheckboxes(){document.getElementById('tagCheckboxes').innerHTML=ALL_TAGS.map(t=>'<span class="tag-check '+t+'" data-tag="'+t+'">'+t+'</span>').join('');}
function buildCatDatalist(){const dl=document.getElementById('catList');const cats=[...new Set(state.links.map(l=>l.category).filter(Boolean))].sort();dl.innerHTML=cats.map(c=>'<option value="'+esc(c)+'">').join('');}
function setModalTags(tags=[]){document.querySelectorAll('.tag-check').forEach(tc=>tc.classList.toggle('on',tags.includes(tc.dataset.tag)));}
function getModalTags(){return[...document.querySelectorAll('.tag-check.on')].map(tc=>tc.dataset.tag);}
function openAdd(){
  state.editId=null;
  document.getElementById('modalTitle').textContent='Link hinzuf\u00fcgen';
  ['fUrl','fTitle','fDesc','fCat'].forEach(id=>document.getElementById(id).value='');
  const sel=document.getElementById('fMainCat'); if(sel.options.length)sel.selectedIndex=0;
  setModalTags([]);
  document.getElementById('editModal').classList.add('open');
  setTimeout(()=>document.getElementById('fUrl').focus(),100);
}
function openEdit(id){
  const l=state.links.find(x=>x.id===id); if(!l)return;
  state.editId=id;
  document.getElementById('modalTitle').textContent='Link bearbeiten';
  document.getElementById('fUrl').value=l.url||'';
  document.getElementById('fTitle').value=l.title||'';
  document.getElementById('fDesc').value=l.description||'';
  document.getElementById('fCat').value=l.category||'';
  document.getElementById('fMainCat').value=l.main_category||'';
  setModalTags(l.tags||[]);
  document.getElementById('editModal').classList.add('open');
  setTimeout(()=>document.getElementById('fTitle').focus(),100);
}
function closeEdit(){document.getElementById('editModal').classList.remove('open');state.editId=null;}
function saveLink(){
  const url=document.getElementById('fUrl').value.trim(), title=document.getElementById('fTitle').value.trim();
  if(!url||!title){toast('URL und Titel sind Pflichtfelder',true);return;}
  const payload={url,title,description:document.getElementById('fDesc').value.trim(),category:document.getElementById('fCat').value.trim(),main_category:document.getElementById('fMainCat').value,tags:getModalTags()};
  const d=loadDelta();
  if(state.editId!==null){
    if(state.base.find(l=>l.id===state.editId)){d.e[state.editId]=payload;}
    else{const mx=state.base.reduce((m,l)=>Math.max(m,l.id||0),0);const i=(d.a||[]).findIndex((_,idx)=>mx+1000+idx===state.editId);if(i!==-1)d.a[i]={...d.a[i],...payload};}
    saveDelta(d);const idx=state.links.findIndex(l=>l.id===state.editId);if(idx!==-1)state.links[idx]={...state.links[idx],...payload};
    toast('Gespeichert \u2713');
  }else{
    if(!d.a)d.a=[];d.a.push(payload);saveDelta(d);
    state.links=applyDelta(state.base);buildSidebar();buildCatDatalist();
    toast('Hinzugef\u00fcgt \u2713');
  }
  closeEdit();render();updateStats();
}
function openDel(id){const l=state.links.find(x=>x.id===id);if(!l)return;state.deleteId=id;document.getElementById('deleteTitle').textContent=l.title||'';document.getElementById('deleteModal').classList.add('open');}
function closeDel(){document.getElementById('deleteModal').classList.remove('open');state.deleteId=null;}
function confirmDel(){if(state.deleteId===null)return;const d=loadDelta();d.d=[...(d.d||[]),state.deleteId];saveDelta(d);state.links=state.links.filter(l=>l.id!==state.deleteId);closeDel();buildSidebar();updateStats();render();toast('Gel\u00f6scht \u2713');}
function dlJson(links,name){dl(new Blob([JSON.stringify(links,null,2)],{type:'application/json'}),name);}
function exportBM(links){
  const groups={};for(const l of links){const c=l.category||'Sonstiges';if(!groups[c])groups[c]=[];groups[c].push(l);}
  let html='<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>CS12</TITLE>\n<H1>CS12 Security Bookmarks</H1>\n<DL><p>\n';
  for(const[cat,ls]of Object.entries(groups)){html+='  <DT><H3>'+cat+'</H3>\n  <DL><p>\n';for(const l of ls)if(l.url)html+='    <DT><A HREF="'+l.url+'">'+(l.title||'').replace(/</g,'&lt;')+'</A>\n';html+='  </DL><p>\n';}
  html+='</DL><p>\n';
  dl(new Blob([html],{type:'text/html'}),'cs12_lesezeichen.html');
}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Download gestartet \u2713');}
function importJson(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const imported=JSON.parse(e.target.result);if(!Array.isArray(imported))throw new Error();
      const d=loadDelta();if(!d.a)d.a=[];let added=0;
      for(const l of imported){if(!l.url||!l.title)continue;if(!state.links.some(x=>x.url===l.url)){d.a.push({url:l.url,title:l.title,description:l.description||'',category:l.category||'',main_category:l.main_category||'',tags:l.tags||[]});added++;}}
      saveDelta(d);state.links=applyDelta(state.base);buildSidebar();buildCatDatalist();updateStats();render();
      toast(added+' Links importiert \u2713');
    }catch{toast('Import-Fehler: ung\u00fcltiges JSON',true);}
  };
  reader.readAsText(file);document.getElementById('importFile').value='';
}
let toastTimer;
function toast(msg,err=false){const t=document.getElementById('toast');t.textContent=msg;t.className='toast'+(err?' err':'')+' show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}
init();
