/* Daboys — zero-dependency, local-first hangout payments. All money is stored as integer halalas. */
(() => {
  'use strict';
  const KEY = 'crewtab:v1';
  const METHODS = ['Cash', 'PoS', 'Direct Transfer'];
  const ICONS = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    wallet:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10V6a3 3 0 0 1 3-3h12"/><path d="M16 14h5v4h-5a2 2 0 0 1 0-4Z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',back:'<path d="m15 18-6-6 6-6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',edit:'<path d="m16 5 3 3M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20Z"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',upload:'<path d="M12 21V9m-5 5 5-5 5 5M4 7V3h16v4"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',coins:'<circle cx="9" cy="9" r="6"/><path d="M15 9a6 6 0 1 1-6 6"/>',
    spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
  const el = document.getElementById('main');
  const modalRoot = document.getElementById('modal-root');
  const toastRoot = document.getElementById('toast-root');
  const uid = () => (globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nameHtml = (s) => `<span dir="auto" class="name-text">${escape(s)}</span>`;
  const centsText = (n) => (Math.max(0, Number(n) || 0) / 100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const sar = (n) => `${centsText(n)} <span class="money-unit">SAR</span>`;
  const amount = (n) => `SAR ${centsText(n)}`;
  const initial = (s) => [...String(s || '?').trim()][0]?.toUpperCase() || '?';
  const dateText = (iso) => { try{return new Date(iso).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'});}catch{return '';} };
  const pct = (num,den) => den ? Math.max(0,Math.min(100,Math.round(num/den*100))) : 100;
  const norm = s => String(s).trim().replace(/\s+/g,' ').toLocaleLowerCase();
  function moneyParse(input,allowZero=true){
    const s=String(input).trim();
    if(!/^(?:\d+)(?:\.\d{1,2})?$/.test(s)) return null;
    const [whole,dec='']=s.split('.');
    const n=Number(whole)*100+Number(dec.padEnd(2,'0'));
    if(!Number.isSafeInteger(n)||n<0||(!allowZero&&n===0)||n>99999999999) return null;
    return n;
  }
  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(KEY));
      if(parsed && parsed.version===1 && Array.isArray(parsed.members) && Array.isArray(parsed.hangouts) && Array.isArray(parsed.debts)) return parsed;
    }catch(e){ console.warn('Daboys could not load saved data',e); }
    return {version:1,members:[],hangouts:[],debts:[]};
  }
  let state=load();
  let page='dashboard', selectedHangout=null, draft=null, activeModal=null, toastTimer=null;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){toast('Could not save. Check browser storage settings or available space.',true);return false;}}
  function toast(msg,error=false){toastRoot.innerHTML=`<div class="toast${error?' error':''}">${escape(msg)}</div>`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastRoot.innerHTML='',3500);}
  function findHangout(id){return state.hangouts.find(h=>h.id===id);}
  function personName(p){return state.members.find(m=>m.id===p.memberId)?.name || p.name;}
  function participantName(h,id){if(!id) return 'Group / shared pool';return personName(h.participants.find(p=>p.id===id)||{name:'Former member'});}
  function methods(selected){return METHODS.map(m=>`<option value="${escape(m)}"${selected===m?' selected':''}>${escape(m)}</option>`).join('');}
  function splitShares(h){const base=Math.floor(h.totalCents/h.participants.length),remainder=h.totalCents%h.participants.length;h.participants.forEach((p,i)=>p.shareCents=base+(i<remainder?1:0));}
  function reconcileAuto(h){
    for(const p of h.participants){
      const excess=Math.max(0,p.paidCents-p.shareCents);
      let d=state.debts.find(d=>d.kind==='auto'&&d.hangoutId===h.id&&d.sourceParticipantId===p.id);
      if(excess===0){if(d) state.debts=state.debts.filter(x=>x.id!==d.id);continue;}
      if(p.autoDebtSuppressed) continue;
      if(!d){state.debts.push({id:uid(),hangoutId:h.id,kind:'auto',sourceParticipantId:p.id,creditorId:p.id,debtorId:null,amountCents:excess,settledCents:0,override:false,note:''});}
      else if(!d.override){d.amountCents=excess;d.settledCents=Math.min(d.settledCents,excess);}
    }
  }
  function hangoutDebts(h){return state.debts.filter(d=>d.hangoutId===h.id);}
  function allDone(h){return h.participants.length>0&&h.participants.every(p=>p.done&&p.paidCents>=p.shareCents);}
  function canComplete(h){return allDone(h)&&hangoutDebts(h).every(d=>d.settledCents>=d.amountCents);}
  function collected(h){return h.participants.reduce((a,p)=>a+p.paidCents,0);}
  function covered(h){return h.participants.reduce((a,p)=>a+Math.min(p.paidCents,p.shareCents),0);}
  function outstanding(){return state.debts.reduce((a,d)=>a+Math.max(0,d.amountCents-d.settledCents),0);}
  function update(){save();render();}
  function navigate(to){page=to;selectedHangout=null;closeModal();render();window.scrollTo({top:0,behavior:'instant'});}
  function openHangout(id){if(!findHangout(id))return;page='detail';selectedHangout=id;render();window.scrollTo({top:0,behavior:'instant'});}
  function render(){
    if(page==='detail'&&!findHangout(selectedHangout)){page='dashboard';selectedHangout=null;}
    document.getElementById('breadcrumb').textContent=page==='detail'?'Hangout details':page==='debts'?'Debts':page==='settings'?'Members & Settings':'Dashboard';
    document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===(page==='detail'?'dashboard':page)));
    const pending=state.debts.filter(d=>d.settledCents<d.amountCents).length;
    const navCount=document.getElementById('nav-debt-count');navCount.textContent=pending;navCount.hidden=!pending;
    el.innerHTML=page==='dashboard'?dashboardView():page==='detail'?detailView(findHangout(selectedHangout)):page==='debts'?debtsView():settingsView();
  }
  function dashboardView(){
    const total=state.hangouts.reduce((a,h)=>a+h.totalCents,0),paid=state.hangouts.reduce((a,h)=>a+covered(h),0);
    return `<section class="page-head"><div><p class="eyebrow">THE CREW'S CORNER</p><h1>Good times. Clear tabs.</h1><p class="subhead">Keep the hangouts fun and the money stuff easy.</p></div><button class="btn btn-primary" data-action="new-hangout">${icon('plus')} New hangout</button></section>
    <section class="hero"><div class="hero-content"><div class="hero-label">${icon('spark')} ALL SET, NO STRESS</div><h2>Less chasing. More hanging out.</h2><p>Split it fairly, track every payment, and call it a day.</p></div><div class="hero-art" aria-hidden="true"><div class="hero-coin one">﷼</div><div class="hero-coin two">✓</div></div></section>
    <section class="stats" aria-label="Summary"><div class="stat-card"><div class="stat-top"><span class="stat-label">Active hangouts</span><span class="stat-icon purple">${icon('calendar')}</span></div><div class="stat-number">${state.hangouts.length}</div><div class="stat-foot">Currently in progress</div></div><div class="stat-card"><div class="stat-top"><span class="stat-label">Shares covered</span><span class="stat-icon green">${icon('check')}</span></div><div class="stat-number">${sar(paid)}</div><div class="stat-foot">Of ${amount(total)} total shares</div></div><div class="stat-card"><div class="stat-top"><span class="stat-label">Unsettled debts</span><span class="stat-icon orange">${icon('wallet')}</span></div><div class="stat-number">${sar(outstanding())}</div><div class="stat-foot">Money to settle</div></div></section>
    <section><div class="section-heading"><h2>Your hangouts <span class="count">${state.hangouts.length}</span></h2><span class="muted">${state.hangouts.length?'Tap one to manage payments':''}</span></div>${state.hangouts.length?`<div class="hangout-grid">${[...state.hangouts].reverse().map(hangoutCard).join('')}</div>`:empty('calendar','No hangouts yet','Start one, pick your crew, and let Daboys handle the split.','new-hangout','Create your first hangout')}</section>`;
  }
  function hangoutCard(h){const count=h.participants.filter(p=>p.done).length,ready=canComplete(h),p=pct(covered(h),h.totalCents);return `<article class="hangout-card"><div class="card-top"><div><div class="card-title">${nameHtml(h.title)}</div><div class="card-date">${icon('calendar').replace('width="20"','width="13"')} ${dateText(h.createdAt)}</div></div><span class="status ${ready?'good':''}"><span class="status-dot"></span>${ready?'Ready to close':'In progress'}</span></div><div class="card-money">${sar(h.totalCents)}</div><div class="card-sub">${h.participants.length} members · ${count}/${h.participants.length} marked done</div><div class="progress-row"><span>Shares covered</span><strong>${p}%</strong></div><div class="progress"><div class="progress-fill" style="width:${p}%"></div></div><div class="card-footer"><div class="avatars">${h.participants.slice(0,4).map(p=>`<span class="mini-avatar" title="${escape(personName(p))}">${escape(initial(personName(p)))}</span>`).join('')}${h.participants.length>4?`<span class="mini-avatar extra">+${h.participants.length-4}</span>`:''}</div><button class="btn btn-small" data-action="open-hangout" data-id="${h.id}">Open ${icon('arrow')}</button></div></article>`;}
  function empty(i,title,desc,action,label){return `<div class="empty-state"><div class="empty-icon">${icon(i)}</div><h3>${escape(title)}</h3><p>${escape(desc)}</p>${action?`<button class="btn btn-primary" data-action="${action}">${icon('plus')} ${escape(label)}</button>`:''}</div>`;}
  function detailView(h){
    const done=h.participants.filter(p=>p.done).length, debts=hangoutDebts(h),openDebts=debts.filter(d=>d.amountCents>d.settledCents).length,ready=canComplete(h);
    return `<button class="back-btn" data-action="back-dashboard">${icon('back')} Back to dashboard</button><section class="detail-heading"><div><p class="eyebrow">HANGOUT DETAILS · ${dateText(h.createdAt)}</p><h1>${nameHtml(h.title)}</h1><p class="subhead">Only checking the box marks a member as done.</p></div><button class="btn btn-quiet" data-action="edit-hangout" data-id="${h.id}">${icon('edit')} Edit name & total</button></section>
    <section class="detail-summary"><div class="summary-tile"><label>Total bill</label><strong>${sar(h.totalCents)}</strong><div class="hint">Split to the halala</div></div><div class="summary-tile"><label>Shares covered</label><strong>${sar(covered(h))}</strong><div class="hint">${pct(covered(h),h.totalCents)}% of total</div></div><div class="summary-tile"><label>Members marked done</label><strong>${done} / ${h.participants.length}</strong><div class="hint">${openDebts} debt${openDebts===1?'':'s'} still open</div></div></section>
    <section class="panel"><div class="flex-between"><div><h2 class="panel-title">Payment tracker</h2><p class="panel-desc">Edit what each person paid, choose how, then tick their box when done.</p></div><span class="hint-bubble">${icon('info')} Amounts in SAR</span></div>
    <div class="table-wrap"><table class="payment-table"><thead><tr><th>Member</th><th>Share</th><th>Paid (SAR)</th><th>Method</th><th style="text-align:center">Done</th></tr></thead><tbody>${h.participants.map(p=>`<tr><td><div class="member-cell"><span class="person-avatar">${escape(initial(personName(p)))}</span><div><div class="member-name">${nameHtml(personName(p))}</div><div class="member-tag">${p.isTemp?'Temporary':'Permanent'}</div></div></div></td><td><span class="amount-strong">${centsText(p.shareCents)}</span></td><td><input class="field paid-input" aria-label="Amount paid by ${escape(personName(p))}" type="number" min="0" step="0.01" inputmode="decimal" data-field="paid" data-person="${p.id}" value="${(p.paidCents/100).toFixed(2)}">${p.paidCents>p.shareCents?`<div class="overpay">+${amount(p.paidCents-p.shareCents)} over</div>`:''}</td><td><select class="select method-select" aria-label="Payment method for ${escape(personName(p))}" data-field="method" data-person="${p.id}">${methods(p.method)}</select></td><td><input class="done-check" aria-label="Mark ${escape(personName(p))} as done" type="checkbox" data-field="done" data-person="${p.id}"${p.done?' checked':''}></td></tr>`).join('')}</tbody></table></div>
    <div class="footnote">Checking “Done” fills any unpaid share automatically. Editing an amount never checks the box for you. Overpayments create a debt automatically, which you can adjust or delete.</div></section>
    <section class="panel"><div class="flex-between"><div><h2 class="panel-title">Temporary debts</h2><p class="panel-desc">Track extra payments and personal IOUs for this hangout.</p></div><button class="btn btn-small" data-action="new-debt" data-id="${h.id}">${icon('plus')} Add debt</button></div><div class="mt-20">${debts.length?`<div class="debt-grid">${debts.map(debtCard).join('')}</div>`:`<div class="empty-mini">No debts here. Any extra payments will show up automatically.</div>`}</div></section>
    <section class="complete-bar"><div><h3>${ready?'All settled. Nice work! 🎉':'Ready to wrap this up?'}</h3><p>${ready?'Every member is marked done and all debts are settled. Completing permanently deletes this hangout.':!allDone(h)?'Mark every member done and settle all debts before completing.':'Settle the remaining debts before completing.'}</p></div><button class="btn ${ready?'btn-primary':'btn-quiet'}" data-action="complete-hangout" data-id="${h.id}" ${ready?'':'disabled'}>${icon('check')} Complete hangout</button></section>`;
  }
  function debtCard(d){const h=findHangout(d.hangoutId);if(!h)return '';const remain=Math.max(0,d.amountCents-d.settledCents),progress=pct(d.settledCents,d.amountCents);return `<article class="debt-card"><div class="debt-head"><div><div class="debt-title">${nameHtml(participantName(h,d.creditorId))}</div><div class="debt-subtitle">Owed by ${nameHtml(participantName(h,d.debtorId))} · ${nameHtml(h.title)}</div></div><div class="debt-badges"><span class="tag ${d.kind==='manual'?'manual':''}">${d.kind==='auto'?'Auto':'Manual'}</span></div></div><div class="debt-amounts"><div><span>Remaining</span><div><strong>${sar(remain)}</strong></div></div><span>${amount(d.settledCents)} / ${amount(d.amountCents)}</span></div><div class="progress"><div class="progress-fill mint" style="width:${progress}%"></div></div><div class="progress-row"><span>${progress}% settled</span><strong>${remain===0?'Settled ✓':'In progress'}</strong></div>${remain?`<div class="quick-row">${[5,10,20,50].map(n=>`<button class="btn btn-small" data-action="repay-quick" data-id="${d.id}" data-cents="${n*100}">+${n}</button>`).join('')}</div><div class="settle-row"><input class="field" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Custom SAR amount" aria-label="Custom settlement amount" data-repay-input="${d.id}"><button class="btn btn-small btn-primary" data-action="repay-custom" data-id="${d.id}">Add</button></div>`:''}<div class="debt-bottom"><span class="debt-note">${d.note?escape(d.note):d.kind==='auto'?'Created from an overpayment':'Manual debt'}${d.settlementMethod?` · Last: ${escape(d.settlementMethod)}`:''}</span><div class="small-actions"><button data-action="edit-debt" data-id="${d.id}" title="Edit debt" aria-label="Edit debt">${icon('edit')}</button><button data-action="delete-debt" data-id="${d.id}" title="Delete debt" aria-label="Delete debt">${icon('trash')}</button></div></div></article>`;}
  function debtsView(){const debts=state.debts.filter(d=>findHangout(d.hangoutId)),open=debts.filter(d=>d.settledCents<d.amountCents);return `<section class="page-head"><div><p class="eyebrow">KEEP IT BALANCED</p><h1>Debts, simplified.</h1><p class="subhead">Every extra payment and IOU, all in one place.</p></div><button class="btn btn-primary" data-action="new-debt" ${state.hangouts.length?'':'disabled'}>${icon('plus')} Add manual debt</button></section><section class="stats"><div class="stat-card"><div class="stat-top"><span class="stat-label">Still owed</span><span class="stat-icon orange">${icon('wallet')}</span></div><div class="stat-number">${sar(outstanding())}</div><div class="stat-foot">Across all hangouts</div></div><div class="stat-card"><div class="stat-top"><span class="stat-label">Open debts</span><span class="stat-icon purple">${icon('coins')}</span></div><div class="stat-number">${open.length}</div><div class="stat-foot">Need settling</div></div><div class="stat-card"><div class="stat-top"><span class="stat-label">Settled debts</span><span class="stat-icon green">${icon('check')}</span></div><div class="stat-number">${debts.length-open.length}</div><div class="stat-foot">Within active hangouts</div></div></section><div class="section-heading"><h2>Debt tracker <span class="count">${debts.length}</span></h2></div>${debts.length?`<div class="debt-grid">${[...debts].sort((a,b)=>Number(a.settledCents>=a.amountCents)-Number(b.settledCents>=b.amountCents)).map(debtCard).join('')}</div>`:empty('wallet','No debts to track','Overpayments will create debts automatically. You can also add a manual debt to an active hangout.',state.hangouts.length?'new-debt':null,'Add a manual debt')}`;}
  function settingsView(){
    const rows=state.members.map(m=>`<article class="member-row" data-member-row data-search-name="${escape(norm(m.name))}"><span class="person-avatar" aria-hidden="true">${escape(initial(m.name))}</span><div class="member-name">${nameHtml(m.name)}</div><div class="member-actions"><button class="member-action" data-action="edit-member" data-id="${m.id}" aria-label="Edit ${escape(m.name)}">${icon('edit')} <span>Edit</span></button><button class="member-action member-action-delete" data-action="delete-member" data-id="${m.id}" aria-label="Delete ${escape(m.name)}">${icon('trash')} <span>Delete</span></button></div></article>`).join('');
    return `<section class="page-head settings-heading"><div><p class="eyebrow">YOUR CREW</p><h1>Members & settings.</h1><p class="subhead">Your regulars, always ready for the next hangout.</p></div></section>
    <div class="settings-grid"><section class="panel members-panel"><div class="flex-between"><h2 class="panel-title">Permanent members</h2><span class="tag">${state.members.length} saved</span></div><p class="panel-desc">Add, edit, or remove your friends whenever you like.</p>
    <form id="member-add-form" class="form-inline"><label class="sr-only" for="member-name-input">New member name</label><input id="member-name-input" class="field" dir="auto" placeholder="Friend's name" maxlength="70" required autocomplete="off"><button class="btn btn-primary" type="submit">${icon('plus')} Add member</button></form>
    ${state.members.length?`<div class="member-search-wrap"><label class="form-label" for="member-search">Find a member</label><input id="member-search" class="field" type="search" dir="auto" placeholder="Search ${state.members.length} members..." autocomplete="off"></div>`:''}
    <div class="member-list" id="member-list">${state.members.length?rows:'<div class="empty-mini">No members yet. Add your first friend above.</div>'}</div><div id="member-no-results" class="empty-mini" hidden>No matching members.</div></section>
    <section class="settings-side"><div class="panel"><h2 class="panel-title">Member backup</h2><p class="panel-desc">Export or import names as JSON. Imports merge new names without removing existing members.</p><div class="settings-actions"><button class="btn" data-action="export-members">${icon('download')} Export JSON</button><button class="btn btn-quiet" data-action="import-members">${icon('upload')} Import JSON</button></div><div class="helper-card"><h3>${icon('lock')} Stored on this device</h3><p>Daboys saves automatically in this browser. Data is not synced between devices or stored on GitHub.</p></div><div class="warning"><strong>Heads up:</strong> Member JSON only includes names, not hangouts or debts. Clearing browser data can erase active payments.</div></div>
    <section class="panel danger-zone"><div class="danger-zone-head"><span class="danger-symbol">${icon('trash')}</span><div><h2 class="panel-title">Danger zone</h2><p class="panel-desc">Permanently erase all Daboys data on this device.</p></div></div><p class="danger-explainer">This deletes every permanent member, active hangout, payment, and debt. It cannot be undone. You will need to confirm twice.</p><button class="btn btn-danger danger-button" type="button" data-action="delete-all-start">${icon('trash')} Delete all data</button></section></section></div>`;
  }

  function modal(title,subtitle,body,footer,wide=false){activeModal=title;modalRoot.innerHTML=`<div class="modal-overlay" data-overlay="true"><div class="modal${wide?' wide':''}" role="dialog" aria-modal="true" aria-label="${escape(title)}"><div class="modal-head"><div><h2>${escape(title)}</h2>${subtitle?`<p>${escape(subtitle)}</p>`:''}</div><button class="modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button></div>${body}${footer?`<div class="modal-footer">${footer}</div>`:''}</div></div>`;document.body.style.overflow='hidden';modalRoot.querySelector('input:not([type=checkbox]),select,button')?.focus();}
  function closeModal(){modalRoot.innerHTML='';document.body.style.overflow='';activeModal=null;draft=null;}
  function modalError(message){const box=modalRoot.querySelector('.inline-error');if(box)box.textContent=message;else toast(message,true);}
  const cancelBtn=`<button type="button" class="btn btn-quiet" data-action="close-modal">Cancel</button>`;
  function addMember(name){name=String(name).trim().replace(/\s+/g,' ');if(!name||name.length>70)return {error:'Enter a name (up to 70 characters).'};let existing=state.members.find(m=>norm(m.name)===norm(name));if(existing)return {member:existing,existing:true};const member={id:uid(),name};state.members.push(member);save();return {member,existing:false};}
  function newHangoutModal(){draft={selected:new Set(),temp:[]};renderCreateModal();}
  function renderCreateModal(){
    const prevTitle=modalRoot.querySelector('#new-title')?.value??'',prevAmount=modalRoot.querySelector('#new-amount')?.value??'';
    const body=`<form id="create-hangout-form"><div class="two-col"><div class="form-group"><label class="form-label" for="new-title">Hangout name</label><input id="new-title" class="field" dir="auto" maxlength="90" placeholder="e.g. Thursday coffee" value="${escape(prevTitle)}"><div class="form-help">Optional — we'll name it for you if left blank.</div></div><div class="form-group"><label class="form-label" for="new-amount">Total bill (SAR) *</label><input id="new-amount" class="field" type="number" min="0.01" step="0.01" inputmode="decimal" required placeholder="0.00" value="${escape(prevAmount)}"><div class="form-help">Divided evenly to the nearest halala.</div></div></div><div class="modal-section-head"><strong>Choose saved members</strong><span>${draft.selected.size} selected</span></div><div class="selection-list">${state.members.length?state.members.map(m=>`<label class="selection-item"><input type="checkbox" data-draft-member="${m.id}"${draft.selected.has(m.id)?' checked':''}><span dir="auto">${escape(m.name)}</span></label>`).join(''):`<div class="empty-mini" style="grid-column:1/-1">No saved members yet. Add one below.</div>`}</div><div class="form-group mt-20"><label class="form-label" for="quick-member">Quick-add permanent member</label><div class="inline-add"><input id="quick-member" class="field" dir="auto" maxlength="70" placeholder="Name saved for future hangouts"><button class="btn btn-small" type="button" data-action="quick-member">${icon('plus')} Add</button></div></div><div class="form-group"><label class="form-label" for="temp-member">Temporary members</label><div class="inline-add"><input id="temp-member" class="field" dir="auto" maxlength="70" placeholder="Only for this hangout"><button class="btn btn-small" type="button" data-action="quick-temp">${icon('plus')} Add</button></div>${draft.temp.length?`<div class="draft-tags">${draft.temp.map((n,i)=>`<span class="draft-tag">${nameHtml(n)} <button type="button" data-action="remove-temp" data-index="${i}" aria-label="Remove ${escape(n)}">×</button></span>`).join('')}</div>`:''}</div><p class="inline-error" role="alert"></p></form>`;
    modal('New hangout','Pick the crew, enter the total, and we’ll do the math.',body,`${cancelBtn}<button class="btn btn-primary" data-action="create-hangout">${icon('check')} Create hangout</button>`,true);
  }
  function quickAdd(temp){const input=modalRoot.querySelector(temp?'#temp-member':'#quick-member'),name=input?.value.trim().replace(/\s+/g,' ');if(!name||name.length>70)return modalError('Enter a valid name (up to 70 characters).');
    const duplicate=draft.temp.some(n=>norm(n)===norm(name))||[...draft.selected].some(id=>norm(state.members.find(m=>m.id===id)?.name)===norm(name));
    if(duplicate)return modalError('This name is already selected for this hangout.');
    if(temp){if(state.members.some(m=>norm(m.name)===norm(name)))return modalError('This name is already a saved member. Select them from the list instead.');draft.temp.push(name);}else{const result=addMember(name);if(result.error)return modalError(result.error);draft.selected.add(result.member.id);}
    renderCreateModal();modalRoot.querySelector(temp?'#temp-member':'#quick-member')?.focus();
  }
  function createHangout(){const title=modalRoot.querySelector('#new-title')?.value.trim().replace(/\s+/g,' '),total=moneyParse(modalRoot.querySelector('#new-amount')?.value,false);if(total===null)return modalError('Enter a valid bill above SAR 0, with at most 2 decimals.');const ids=[...draft.selected].filter(id=>state.members.some(m=>m.id===id));const count=ids.length+draft.temp.length;if(!count)return modalError('Select or add at least one member.');
    const participants=[...ids.map(id=>({id:uid(),memberId:id,name:state.members.find(m=>m.id===id).name,isTemp:false,paidCents:0,shareCents:0,done:false,method:'Cash',autoDebtSuppressed:false})),...draft.temp.map(name=>({id:uid(),memberId:null,name,isTemp:true,paidCents:0,shareCents:0,done:false,method:'Cash',autoDebtSuppressed:false}))];
    const h={id:uid(),title:title||`Hangout #${state.hangouts.length+1}`,totalCents:total,createdAt:new Date().toISOString(),participants};splitShares(h);state.hangouts.push(h);closeModal();update();openHangout(h.id);toast('Hangout created!');
  }
  function memberEditModal(id){const m=state.members.find(x=>x.id===id);if(!m)return;modal('Edit member','Update this name everywhere it appears.',`<div class="form-group"><label class="form-label" for="edit-name">Name</label><input class="field" id="edit-name" dir="auto" maxlength="70" value="${escape(m.name)}"></div><p class="inline-error" role="alert"></p>`,`${cancelBtn}<button class="btn btn-primary" data-action="save-member" data-id="${id}">Save changes</button>`);}
  function editHangoutModal(id){const h=findHangout(id);if(!h)return;modal('Edit hangout','Changing the total recalculates everyone’s share and any automatic debts.',`<div class="form-group"><label class="form-label" for="edit-h-title">Hangout name</label><input id="edit-h-title" class="field" dir="auto" maxlength="90" value="${escape(h.title)}"></div><div class="form-group"><label class="form-label" for="edit-h-total">Total bill (SAR)</label><input id="edit-h-total" class="field" type="number" min="0.01" step="0.01" value="${(h.totalCents/100).toFixed(2)}"></div><p class="inline-error" role="alert"></p>`,`${cancelBtn}<button class="btn btn-primary" data-action="save-hangout" data-id="${id}">Save changes</button>`);}
  function participantOptions(h,selected,includeGroup=true){return `${includeGroup?`<option value=""${!selected?' selected':''}>Group / shared pool</option>`:''}${h.participants.map(p=>`<option value="${p.id}"${p.id===selected?' selected':''}>${escape(personName(p))}${p.isTemp?' (temp)':''}</option>`).join('')}`;}
  function debtModal(id=null,preferredHangout=null){const d=state.debts.find(x=>x.id===id),h=d?findHangout(d.hangoutId):findHangout(preferredHangout)||state.hangouts[0];if(!h)return toast('Create a hangout first.',true);
    const body=`<div class="form-group"><label class="form-label" for="debt-hangout">Hangout</label><select id="debt-hangout" class="select" ${d?'disabled':''}>${state.hangouts.map(x=>`<option value="${x.id}"${x.id===h.id?' selected':''}>${escape(x.title)}</option>`).join('')}</select></div><div class="two-col"><div class="form-group"><label class="form-label" for="debt-creditor">Money owed to</label><select id="debt-creditor" class="select">${participantOptions(h,d?.creditorId||h.participants[0]?.id,false)}</select></div><div class="form-group"><label class="form-label" for="debt-debtor">Owed by</label><select id="debt-debtor" class="select">${participantOptions(h,d?.debtorId||null)}</select></div></div><div class="two-col"><div class="form-group"><label class="form-label" for="debt-amount">Debt amount (SAR)</label><input id="debt-amount" class="field" type="number" min="0.01" step="0.01" inputmode="decimal" value="${d?(d.amountCents/100).toFixed(2):''}" placeholder="0.00"></div><div class="form-group"><label class="form-label" for="debt-settled">Already settled (SAR)</label><input id="debt-settled" class="field" type="number" min="0" step="0.01" inputmode="decimal" value="${d?(d.settledCents/100).toFixed(2):'0.00'}"></div></div><div class="form-group"><label class="form-label" for="debt-note">Note (optional)</label><input id="debt-note" class="field" dir="auto" maxlength="160" placeholder="What is this for?" value="${escape(d?.note||'')}"></div><p class="form-help">${d?.kind==='auto'?'Editing an automatic debt locks in your adjusted amount until you change it again.':'Manual debts are tracked separately from member payment shares.'}</p><p class="inline-error" role="alert"></p>`;
    modal(d?'Edit debt':'Add manual debt',d?'Adjust the amount, people, or settlement progress.':'Track an extra IOU for any active hangout.',body,`${cancelBtn}<button class="btn btn-primary" data-action="save-debt" data-id="${d?.id||''}">Save debt</button>`);
  }
  function refreshDebtOptions(){const h=findHangout(modalRoot.querySelector('#debt-hangout')?.value);if(!h)return;modalRoot.querySelector('#debt-creditor').innerHTML=participantOptions(h,h.participants[0]?.id,false);modalRoot.querySelector('#debt-debtor').innerHTML=participantOptions(h,null);}
  function saveDebt(id){const d=state.debts.find(x=>x.id===id),h=findHangout(d?.hangoutId||modalRoot.querySelector('#debt-hangout')?.value);if(!h)return modalError('Select a valid hangout.');const creditor=modalRoot.querySelector('#debt-creditor').value,debtor=modalRoot.querySelector('#debt-debtor').value||null,n=moneyParse(modalRoot.querySelector('#debt-amount').value,false),settled=moneyParse(modalRoot.querySelector('#debt-settled').value);if(n===null||settled===null)return modalError('Enter valid amounts (up to two decimal places).');if(settled>n)return modalError('Settled amount cannot exceed the total debt.');if(!h.participants.some(p=>p.id===creditor))return modalError('Choose who is owed.');if(debtor===creditor)return modalError('A person cannot owe money to themselves.');if(debtor&&!h.participants.some(p=>p.id===debtor))return modalError('Choose a valid debtor.');const note=modalRoot.querySelector('#debt-note').value.trim();if(d){Object.assign(d,{creditorId:creditor,debtorId:debtor,amountCents:n,settledCents:settled,note,override:true});}else state.debts.push({id:uid(),hangoutId:h.id,kind:'manual',sourceParticipantId:null,creditorId:creditor,debtorId:debtor,amountCents:n,settledCents:settled,note,override:true});closeModal();update();toast('Debt saved.');}
  function confirmModal(title,description,confirmAction,id,danger=true){modal(title,description,`<div class="warning">${danger?'This action cannot be undone.':'Please review before continuing.'}</div>`,`${cancelBtn}<button class="btn ${danger?'btn-danger':'btn-primary'}" data-action="${confirmAction}" data-id="${id}">Yes, ${danger?'delete':'continue'}</button>`);}
  // Two separate confirmations protect against accidental complete data deletion.
  function deleteAllFirstConfirmation(){
    modal('Delete ALL Daboys data?','Confirmation 1 of 2 — review what will be erased.',
      `<div class="warning"><strong>Everything will be permanently deleted:</strong> all saved members, hangouts, payment records, and debts. This affects this browser's Daboys data and cannot be undone.</div><p class="form-help">Member JSON exports do not contain hangouts or debts.</p>`,
      `${cancelBtn}<button class="btn btn-danger" data-action="delete-all-second">Continue to final confirmation</button>`);
  }
  function deleteAllFinalConfirmation(){
    modal('Final confirmation','Confirmation 2 of 2 — type the exact phrase to unlock deletion.',
      `<div class="warning">This is your final chance to cancel. All Daboys data saved in this browser will be erased.</div><div class="form-group mt-20"><label class="form-label" for="delete-all-phrase">Type <strong class="delete-phrase">DELETE DABOYS</strong> to confirm</label><input class="field danger-input" id="delete-all-phrase" type="text" placeholder="DELETE DABOYS" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="delete-all-help"><p class="form-help" id="delete-all-help">The phrase must match exactly. The button stays disabled until it does.</p></div>`,
      `${cancelBtn}<button class="btn btn-danger" data-action="delete-all-confirm" disabled>Delete everything permanently</button>`);
  }
  function deleteAllData(){
    const input=modalRoot.querySelector('#delete-all-phrase');
    if(activeModal!=='Final confirmation'||input?.value!=='DELETE DABOYS')return;
    try{localStorage.removeItem(KEY);}catch(e){toast('Could not clear browser storage.',true);return;}
    state={version:1,members:[],hangouts:[],debts:[]};
    selectedHangout=null;page='dashboard';closeModal();render();window.scrollTo(0,0);
    toast('All Daboys data has been permanently deleted.');
  }
  function repay(id,added){const d=state.debts.find(x=>x.id===id);if(!d)return;const remaining=d.amountCents-d.settledCents;if(remaining<=0)return;d.settledCents+=Math.min(added,remaining);update();toast(d.settledCents===d.amountCents?'Debt fully settled!':`${amount(Math.min(added,remaining))} recorded.`);}
  function exportMembers(){const data={app:'Daboys',version:1,exportedAt:new Date().toISOString(),members:state.members.map(m=>({name:m.name}))};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daboys-members.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Member JSON exported.');}
  async function importMembers(file){if(!file)return;if(file.size>1024*1024)return toast('JSON file is too large (1 MB maximum).',true);try{const data=JSON.parse(await file.text()),arr=Array.isArray(data)?data:data?.members;if(!Array.isArray(arr))throw Error('Expected a members list.');if(arr.length>5000)throw Error('Too many members in this file.');let added=0,skipped=0;for(const entry of arr){const name=typeof entry==='string'?entry:entry&&typeof entry.name==='string'?entry.name:null;if(!name||!name.trim()||name.trim().length>70){skipped++;continue;}const result=addMember(name);if(result.existing||result.error)skipped++;else added++;}update();toast(`Imported ${added} member${added===1?'':'s'}; skipped ${skipped}.`);}catch(e){toast(`Import failed: ${e.message||'Invalid JSON file'}`,true);}finally{document.getElementById('import-file').value='';}}
  // Click delegation: stable event handlers even when a view is re-rendered.
  document.addEventListener('click',e=>{
    if(e.target.matches('.modal-overlay')){closeModal();return;}
    const button=e.target.closest('[data-action],[data-nav]');if(!button)return;
    if(button.dataset.nav){e.preventDefault();navigate(button.dataset.nav);return;}
    const a=button.dataset.action,id=button.dataset.id;
    switch(a){
      case 'new-hangout':newHangoutModal();break;
      case 'open-hangout':openHangout(id);break;
      case 'back-dashboard':navigate('dashboard');break;
      case 'close-modal':closeModal();break;
      case 'quick-member':quickAdd(false);break;
      case 'quick-temp':quickAdd(true);break;
      case 'remove-temp':draft.temp.splice(Number(button.dataset.index),1);renderCreateModal();break;
      case 'create-hangout':createHangout();break;
      case 'edit-member':memberEditModal(id);break;
      case 'save-member':{
        const m=state.members.find(x=>x.id===id),name=modalRoot.querySelector('#edit-name')?.value.trim().replace(/\s+/g,' ');if(!m)return;if(!name||name.length>70)return modalError('Enter a name up to 70 characters.');if(state.members.some(x=>x.id!==id&&norm(x.name)===norm(name)))return modalError('Another member already has this name.');m.name=name;closeModal();update();toast('Member updated.');break;
      }
      case 'delete-member':confirmModal('Remove member?','They will disappear from Settings. Their name remains in any active hangout they already joined.','confirm-delete-member',id);break;
      case 'confirm-delete-member':state.members=state.members.filter(m=>m.id!==id);closeModal();update();toast('Member removed from Settings.');break;
      case 'edit-hangout':editHangoutModal(id);break;
      case 'save-hangout':{
        const h=findHangout(id),title=modalRoot.querySelector('#edit-h-title')?.value.trim(),total=moneyParse(modalRoot.querySelector('#edit-h-total')?.value,false);if(!h)return;if(!title||title.length>90)return modalError('Enter a hangout name (up to 90 characters).');if(total===null)return modalError('Enter a valid total above SAR 0.');h.title=title;h.totalCents=total;splitShares(h);h.participants.forEach(p=>{if(p.done&&p.paidCents<p.shareCents)p.done=false;});reconcileAuto(h);closeModal();update();toast('Hangout updated.');break;
      }
      case 'new-debt':debtModal(null,id);break;
      case 'edit-debt':debtModal(id);break;
      case 'save-debt':saveDebt(id);break;
      case 'delete-debt':confirmModal('Delete debt?','This debt and its settlement progress will be removed. An automatically created debt will stay dismissed unless the overpayment is cleared.','confirm-delete-debt',id);break;
      case 'confirm-delete-debt':{
        const d=state.debts.find(x=>x.id===id);if(d?.kind==='auto'){const p=findHangout(d.hangoutId)?.participants.find(p=>p.id===d.sourceParticipantId);if(p)p.autoDebtSuppressed=true;}
        state.debts=state.debts.filter(x=>x.id!==id);closeModal();update();toast('Debt deleted.');break;
      }
      case 'repay-quick':repay(id,Number(button.dataset.cents));break;
      case 'repay-custom':{
        const n=moneyParse(document.querySelector(`[data-repay-input="${CSS.escape(id)}"]`)?.value,false);if(n===null)return toast('Enter a valid settlement amount.',true);repay(id,n);break;
      }
      case 'complete-hangout':if(canComplete(findHangout(id)))confirmModal('Complete hangout?','Every payment and debt is settled. Completing will permanently delete this hangout, its temporary members, and its debts.','confirm-complete-hangout',id);break;
      case 'confirm-complete-hangout':{
        const h=findHangout(id);if(!h||!canComplete(h)){closeModal();update();return toast('Payments or debts still need attention.',true);}
        state.hangouts=state.hangouts.filter(x=>x.id!==id);state.debts=state.debts.filter(d=>d.hangoutId!==id);closeModal();navigate('dashboard');save();toast('Hangout completed and permanently removed. 🎉');break;
      }
      case 'delete-all-start':deleteAllFirstConfirmation();break;
      case 'delete-all-second':deleteAllFinalConfirmation();break;
      case 'delete-all-confirm':deleteAllData();break;
      case 'export-members':exportMembers();break;
      case 'import-members':document.getElementById('import-file').click();break;
    }
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='member-search'){
      const q=norm(e.target.value);
      const rows=[...document.querySelectorAll('[data-member-row]')];
      let visible=0;
      for(const row of rows){const show=row.dataset.searchName.includes(q);row.hidden=!show;if(show)visible++;}
      const noResults=document.getElementById('member-no-results');
      if(noResults)noResults.hidden=visible!==0;
    }
    if(e.target.id==='delete-all-phrase'){
      const button=modalRoot.querySelector('[data-action="delete-all-confirm"]');
      if(button)button.disabled=e.target.value!=='DELETE DABOYS';
    }
  });
  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.dataset.draftMember){if(t.checked)draft.selected.add(t.dataset.draftMember);else draft.selected.delete(t.dataset.draftMember);const count=modalRoot.querySelector('.modal-section-head span');if(count)count.textContent=`${draft.selected.size} selected`;return;}
    if(t.id==='debt-hangout'){refreshDebtOptions();return;}
    if(!t.dataset.field)return;
    const h=findHangout(selectedHangout),p=h?.participants.find(p=>p.id===t.dataset.person);if(!p)return;
    if(t.dataset.field==='paid'){
      const n=moneyParse(t.value);if(n===null){toast('Use a valid SAR amount with up to 2 decimals.',true);render();return;}
      p.paidCents=n;if(p.done&&n<p.shareCents)p.done=false;
      // If an overpayment was previously dismissed, a new overpayment after resetting to share can create a fresh debt.
      if(n<=p.shareCents)p.autoDebtSuppressed=false;
      reconcileAuto(h);update();
    }else if(t.dataset.field==='method'){if(METHODS.includes(t.value)){p.method=t.value;update();}}
    else if(t.dataset.field==='done'){if(t.checked&&p.paidCents<p.shareCents)p.paidCents=p.shareCents;p.done=t.checked;reconcileAuto(h);update();}
  });
  document.addEventListener('submit',e=>{if(e.target.id==='member-add-form'){e.preventDefault();const input=document.getElementById('member-name-input'),result=addMember(input.value);if(result.error)return toast(result.error,true);if(result.existing)return toast('That member already exists.',true);update();toast('Member added.');}else if(e.target.id==='create-hangout-form'){e.preventDefault();createHangout();}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&activeModal){closeModal();return;}
    if(e.key==='Enter'&&activeModal&&e.target.id==='quick-member'){e.preventDefault();quickAdd(false);}
    if(e.key==='Enter'&&activeModal&&e.target.id==='temp-member'){e.preventDefault();quickAdd(true);}
    if(e.key==='Enter'&&activeModal&&e.target.id==='new-amount'){e.preventDefault();createHangout();}
  });
  document.getElementById('import-file').addEventListener('change',e=>importMembers(e.target.files?.[0]));
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
  render();
})();
