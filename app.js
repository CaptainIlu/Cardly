let dataFileHandle=null, mobileStorage=false, state={cards:[],milestones:[],transactions:[]};
const stores=['cards','milestones','transactions'];
function all(store){return Promise.resolve([...state[store]])}
function serialisedData(){return {format:'cardly-data',version:1,...state}}
async function saveDataFile(){if(dataFileHandle){const writable=await dataFileHandle.createWritable();await writable.write(JSON.stringify(serialisedData(),null,2));await writable.close();return}if(mobileStorage){await saveMobileData();return}throw new Error('Open a Cardly data file first.')}
async function put(store,obj){if(!stores.includes(store))throw new Error('Unknown data type.');const rows=state[store],index=rows.findIndex(x=>x.id===obj.id);if(index<0)rows.push(obj);else rows[index]=obj;await saveDataFile();return obj}
async function del(store,id){if(!stores.includes(store))throw new Error('Unknown data type.');state[store]=state[store].filter(x=>x.id!==id);await saveDataFile()}
const id=()=>crypto.randomUUID();
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const today=()=>new Date().toISOString().slice(0,10);
function displayDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:(value||'—')}
function dateForStorage(value){const m=String(value||'').trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);if(!m)throw new Error('Enter the date as DD-MM-YYYY.');const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]),date=new Date(year,month-1,day);if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)throw new Error('Enter a valid date as DD-MM-YYYY.');return `${m[3]}-${m[2]}-${m[1]}`}
function displayDayMonth(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}-${m[2]}`:''}
function dateForStorageFromDayMonth(value){const m=String(value||'').trim().match(/^(\d{2})-(\d{2})$/);if(!m)throw new Error('Enter the renewal date as DD-MM.');const day=Number(m[1]),month=Number(m[2]),t=today(),thisYear=Number(t.slice(0,4));const build=year=>{const d=new Date(year,month-1,day);if(d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day)return null;return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`};for(let y=thisYear;y<=thisYear+8;y++){const candidate=build(y);if(candidate&&candidate>=t)return candidate}throw new Error('Enter a valid date as DD-MM.')}
function setDateField(field,value){field.value=displayDate(value)}
function dueDate(c){const m=String(c.billDate||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return '';const billDay=Number(m[3]),dueDay=Number(c.dueDay||1),year=Number(m[1]),month=Number(m[2])-1,dueMonth=dueDay<=billDay?month+1:month,lastDay=new Date(year,dueMonth+1,0).getDate(),date=new Date(year,dueMonth,Math.min(dueDay,lastDay));return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function dateForMonth(year,month,day){const lastDay=new Date(year,month+1,0).getDate(),date=new Date(year,month,Math.min(day,lastDay));return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function addDays(value,days){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return '';const date=new Date(Number(m[1]),Number(m[2])-1,Number(m[3])+days);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function latestStatementDate(c){const day=Number(c.statementDay);if(!Number.isInteger(day)||day<1||day>31)return '';const now=new Date(),current=dateForMonth(now.getFullYear(),now.getMonth(),day);if(current<=today())return current;return dateForMonth(now.getFullYear(),now.getMonth()-1,day)}
function needsBillUpdate(c){const latest=latestStatementDate(c);return Boolean(latest&&today()>=addDays(latest,2)&&String(c.billDate||'')<latest)}
const DUE_REMINDER_DAYS=3, FEE_REMINDER_DAYS=21;
function daysUntil(dateStr){const m=String(dateStr||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;const target=new Date(Number(m[1]),Number(m[2])-1,Number(m[3])),now=new Date();now.setHours(0,0,0,0);return Math.round((target-now)/86400000)}
function nextRenewalDate(c){const m=String(c.renewalDate||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return '';let year=Number(m[1]);const month=m[2],day=m[3];let candidate=`${year}-${month}-${day}`;let guard=0;while(candidate<today()&&guard<200){year+=1;candidate=`${year}-${month}-${day}`;guard++}return candidate}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function periodRange(type,c){const d=new Date(), y=d.getFullYear(),m=d.getMonth(),day=d.getDate();let start,end;if(type==='CALENDAR_MONTH'){start=new Date(y,m,1);end=new Date(y,m+1,0)}else if(type==='CALENDAR_QUARTER'){const q=Math.floor(m/3);start=new Date(y,q*3,1);end=new Date(y,q*3+3,0)}else if(type==='CALENDAR_YEAR'){start=new Date(y,0,1);end=new Date(y,11,31)}else if(type==='MEMBERSHIP_YEAR'){if(!c||!c.renewalDate)return ['',''];const next=nextRenewalDate(c);if(!next)return ['',''];const nm=next.match(/^(\d{4})-(\d{2})-(\d{2})$/);const nextD=new Date(Number(nm[1]),Number(nm[2])-1,Number(nm[3]));const startD=new Date(nextD);startD.setFullYear(startD.getFullYear()-1);const endD=new Date(nextD);endD.setDate(endD.getDate()-1);start=startD;end=endD}else{start=new Date(y,m,1);end=new Date(y,m+1,0)}return [start.toISOString().slice(0,10),end.toISOString().slice(0,10)]}
function spend(cardId,type){const c=state.cards.find(x=>x.id===cardId);let ms=state.milestones.filter(x=>x.cardId===cardId&&x.periodType===type);if(!ms.length)return 0;let [s,e]=periodRange(type,c);if(!s)return 0;return state.transactions.filter(t=>t.cardId===cardId&&t.type!=='PAYMENT'&&t.status!=='REFUNDED'&&t.date>=s&&t.date<=e).reduce((a,t)=>a+Number(t.amount),0)}
function milestonePeriodLabel(type){return type==='MEMBERSHIP_YEAR'?'Fee waiver · membership year':type.replaceAll('_',' ')}
function milestoneNote(c,m,v){if(m.periodType!=='MEMBERSHIP_YEAR')return '';const[s,e]=periodRange('MEMBERSHIP_YEAR',c);if(!s)return '';const target=Number(m.targetAmount);return v>=target?`🎉 Fee waived for the ${esc(displayDate(nextRenewalDate(c)))} renewal`:`${money(Math.max(0,target-v))} more by ${esc(displayDate(e))} to waive next year's fee`}
function paidForCurrentBill(c){return state.transactions.filter(t=>t.cardId===c.id&&t.type==='PAYMENT'&&t.status!=='REFUNDED'&&t.date>=(c.billDate||'0000-01-01')).reduce((a,t)=>a+Number(t.amount||0),0)}
function status(c){
  const bill=Number(c.currentBill||0), paid=paidForCurrentBill(c);
  if(bill<=0 || paid>=bill)return 'paid';
  const due=dueDate(c);
  return due&&today()>due?'overdue':'unpaid';
}
function outstanding(c){return Math.max(0,Number(c.currentBill||0)-paidForCurrentBill(c))}
function feeDueSoon(c){if(c.lifetimeFree||!c.renewalDate)return false;const d=daysUntil(nextRenewalDate(c));return d!==null&&d>=0&&d<=FEE_REMINDER_DAYS}
function render(){document.getElementById('cardCount').textContent=state.cards.filter(c=>c.active!==false).length;document.getElementById('unpaidCount').textContent=state.cards.filter(c=>status(c)!=='paid').length;document.getElementById('dueTotal').textContent=money(state.cards.filter(c=>status(c)!=='paid').reduce((a,c)=>a+outstanding(c),0));
const billUpdateReminders=state.cards.filter(c=>c.active!==false&&needsBillUpdate(c));
const dueSoonReminders=state.cards.filter(c=>c.active!==false&&status(c)!=='paid'&&(d=>d!==null&&d<=DUE_REMINDER_DAYS)(daysUntil(dueDate(c))));
const feeReminders=state.cards.filter(c=>c.active!==false&&feeDueSoon(c));
const reminderSection=document.getElementById('billReminders');
let remindersHtml='';
if(billUpdateReminders.length)remindersHtml+=`<div class="sectionhead"><div><div class="sectiontitle">Bill details needed</div><div class="muted">Add the latest bill issued on or before ${displayDate(today())}.</div></div></div>${billUpdateReminders.map(c=>{const statementDate=latestStatementDate(c);return `<div class="panel bill-reminder"><div><div class="cardname">${esc(c.bank)} · ${esc(c.name)}</div><div class="meta">Statement date ${esc(displayDate(statementDate))} · not updated after two days</div></div><button class="btn primary" onclick="openBill('${c.id}','${statementDate}')">Add Bill Details</button></div>`}).join('')}`;
if(dueSoonReminders.length)remindersHtml+=`<div class="sectionhead" style="margin-top:${billUpdateReminders.length?'14px':'0'}"><div><div class="sectiontitle">Payment due</div><div class="muted">Outstanding bills due within ${DUE_REMINDER_DAYS} days, or already overdue.</div></div></div>${dueSoonReminders.map(c=>{const d=daysUntil(dueDate(c)),label=d<0?`Overdue by ${-d} day${-d===1?'':'s'}`:d===0?'Due today':`Due in ${d} day${d===1?'':'s'}`;return `<div class="panel bill-reminder"><div><div class="cardname">${esc(c.bank)} · ${esc(c.name)}</div><div class="meta">${label} · Outstanding ${money(outstanding(c))}</div></div><button class="btn primary" onclick="openPayment('${c.id}')">+ Add Payment</button></div>`}).join('')}`;
if(feeReminders.length)remindersHtml+=`<div class="sectionhead" style="margin-top:${(billUpdateReminders.length||dueSoonReminders.length)?'14px':'0'}"><div><div class="sectiontitle">Annual fee renewal coming up</div><div class="muted">Decide whether to keep the card before the fee posts.</div></div></div>${feeReminders.map(c=>{const rd=nextRenewalDate(c),d=daysUntil(rd);return `<div class="panel bill-reminder"><div><div class="cardname">${esc(c.bank)} · ${esc(c.name)}</div><div class="meta">Renews ${esc(displayDate(rd))} (in ${d} day${d===1?'':'s'}) · Fee ${money(c.annualFee)}</div></div><button class="btn" onclick="openCard('${c.id}')">Review</button></div>`}).join('')}`;
reminderSection.hidden=!remindersHtml;
reminderSection.innerHTML=remindersHtml;
const q=document.getElementById('search').value.toLowerCase(), f=document.getElementById('statusFilter').value;
const cards=state.cards.filter(c=>c.active!==false&&(`${c.bank} ${c.name}`).toLowerCase().includes(q)&& (f==='all'||status(c)===f));
document.getElementById('cards').innerHTML=cards.length?cards.map(c=>{const st=status(c),due=dueDate(c),cms=state.milestones.filter(m=>m.cardId===c.id&&m.active!==false),feeBadge=c.lifetimeFree?'<span class="badge">LTF</span>':(feeDueSoon(c)?`<span class="badge warn">Fee in ${daysUntil(nextRenewalDate(c))}d</span>`:'');return `<div class="panel cardrow clickable" onclick="openCard('${c.id}')"><div class="cardmain"><div><div class="cardname">${esc(c.bank)} · ${esc(c.name)}</div><div class="meta">${esc(c.network||'')} ${c.last4?'· •••• '+esc(c.last4):''} · Bill date ${esc(displayDate(c.billDate))} · Due date ${esc(displayDate(due))}</div></div><div class="badges"><span class="badge ${st}">${st.toUpperCase()}</span>${feeBadge}</div></div><div class="meta" style="margin-top:10px">Bill ${money(c.currentBill)} · Paid ${money(paidForCurrentBill(c))} · Outstanding ${money(outstanding(c))}</div>${cms.length?`<div class="card-milestones"><div class="milestone-label">Milestones</div>${cms.map(m=>{const v=spend(m.cardId,m.periodType),p=Math.min(100,v/Number(m.targetAmount)*100),note=milestoneNote(c,m,v);return `<div class="milestone"><div class="milestonehead"><span>${esc(m.name)} · ${money(v)} / ${money(m.targetAmount)}</span><span>${Math.round(p)}%</span></div><div class="bar"><div class="fill" style="width:${p}%"></div></div>${note?`<div class="meta">${note}</div>`:''}</div>`}).join('')}</div>`:''}</div>`}).join(''):'<div class="panel empty">No cards yet. Add your first card.</div>';
const ts=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);document.getElementById('transactions').innerHTML=ts.length?ts.map(t=>{const c=state.cards.find(x=>x.id===t.cardId),ref=t.status==='REFUNDED',pay=t.type==='PAYMENT';return `<div class="cardrow" style="border-bottom:1px solid var(--line)"><div class="cardmain"><div><div class="cardname ${ref?'txn-refunded':''}">${esc(t.merchant)}</div><div class="meta">${esc(displayDate(t.date))} · ${esc(c?.bank||'Unknown bank')} · ${esc(c?.name||'Unknown card')} ${pay?'· <span class="badge paid">PAYMENT</span>':''}${ref?`· <span class="badge refunded">REFUNDED${t.refundDate?' · '+esc(displayDate(t.refundDate)):''}</span>`:''}</div></div><div class="txn-actions"><strong class="${ref?'txn-refunded':''}">${money(t.amount)}</strong><button class="iconbtn" title="${ref?'Undo refund':'Mark as refunded'}" onclick="event.stopPropagation();${ref?`undoRefund('${t.id}')`:`openRefund('${t.id}')`}">⋮</button></div></div></div>`}).join(''):'<div class="empty">No transactions yet.</div>';
updateNotifyBtn();maybeSendNotifications();
}
async function load(){for(const c of [...state.cards]){let changed=false;if(c.billDate==null){c.billDate=c.paymentDate||today();changed=true}if(c.paidAmount!=null&&Number(c.paidAmount)>0&&!c.legacyPaymentMigrated){const legacy={id:id(),cardId:c.id,date:c.paymentDate||today(),merchant:'Bill Payment',amount:Number(c.paidAmount),type:'PAYMENT',status:'COMPLETED',refundDate:''};state.transactions.push(legacy);await put('transactions',legacy);c.legacyPaymentMigrated=true;changed=true}if(changed)await put('cards',c)}for(const t of [...state.transactions]){let changed=false;if(!t.type)t.type='PURCHASE',changed=true;if(!t.status){t.status='COMPLETED';changed=true}if(t.refundDate==null){t.refundDate='';changed=true}if(changed)await put('transactions',t)}render()}
function setFileError(message=''){document.getElementById('dataFileError').textContent=message}
function openHandleDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('cardly-file-link',2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings');if(!d.objectStoreNames.contains('mobileData'))d.createObjectStore('mobileData')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function rememberFileHandle(handle){const d=await openHandleDB();await new Promise((resolve,reject)=>{const r=d.transaction('settings','readwrite').objectStore('settings').put(handle,'dataFile');r.onsuccess=resolve;r.onerror=()=>reject(r.error)});d.close()}
async function getRememberedFileHandle(){const d=await openHandleDB();const handle=await new Promise((resolve,reject)=>{const r=d.transaction('settings').objectStore('settings').get('dataFile');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});d.close();return handle}
async function saveMobileData(){const d=await openHandleDB();await new Promise((resolve,reject)=>{const r=d.transaction('mobileData','readwrite').objectStore('mobileData').put(serialisedData(),'data');r.onsuccess=resolve;r.onerror=()=>reject(r.error)});d.close()}
async function getMobileData(){const d=await openHandleDB();const data=await new Promise((resolve,reject)=>{const r=d.transaction('mobileData').objectStore('mobileData').get('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});d.close();return data}
function applyData(data){if(!data||!Array.isArray(data.cards)||!Array.isArray(data.milestones)||!Array.isArray(data.transactions))throw new Error('This file is not a valid Cardly data file.');state={cards:data.cards,milestones:data.milestones,transactions:data.transactions}}
function showDashboard(){document.getElementById('dataGate').hidden=true;document.getElementById('dashboard').hidden=false;document.getElementById('exportDataFile').hidden=!mobileStorage;setFileError('')}
async function useDataFile(handle,createNew=false){dataFileHandle=handle;mobileStorage=false;try{if(createNew){state={cards:[],milestones:[],transactions:[]};await saveDataFile()}else{const file=await handle.getFile(),text=await file.text();if(!text.trim()){state={cards:[],milestones:[],transactions:[]};await saveDataFile()}else applyData(JSON.parse(text))}await load();await rememberFileHandle(handle);showDashboard()}catch(err){dataFileHandle=null;setFileError(`Could not open that file: ${err.message}`)}}
async function importDataFile(file){try{applyData(JSON.parse(await file.text()));dataFileHandle=null;mobileStorage=true;await saveMobileData();await load();showDashboard()}catch(err){setFileError(`Could not import that file: ${err.message}`)}}
function exportMobileData(){const file=new Blob([JSON.stringify(serialisedData(),null,2)],{type:'application/json'}),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='cardly-data.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function chooseDataFile(createNew=false){setFileError('');try{if(!('showOpenFilePicker'in window)||!('showSaveFilePicker'in window))throw new Error('This Chrome version does not support direct local-file saving. Update Chrome and reopen index.html.');const options={types:[{description:'Cardly data',accept:{'application/json':['.json']}}]};const handle=createNew?await window.showSaveFilePicker({suggestedName:'cardly-data.json',...options}):(await window.showOpenFilePicker({...options,multiple:false}))[0];if(handle)await useDataFile(handle,createNew)}catch(err){if(err.name!=='AbortError')setFileError(err.message)}}
async function reopenLastDataFile(){setFileError('');try{const handle=await getRememberedFileHandle();if(!handle)throw new Error('No previously opened Cardly data file was found.');let permission=await handle.queryPermission({mode:'readwrite'});if(permission!=='granted')permission=await handle.requestPermission({mode:'readwrite'});if(permission!=='granted')throw new Error('Chrome did not grant permission to this file. Choose Open Data File to select it again.');await useDataFile(handle)}catch(err){setFileError(err.message)}}
const NOTIFY_KEY='cardly-notify-enabled', NOTIFY_SEEN_KEY='cardly-notify-seen';
function notifyEnabled(){return localStorage.getItem(NOTIFY_KEY)==='1'&&'Notification'in window&&Notification.permission==='granted'}
function updateNotifyBtn(){const btn=document.getElementById('notifyToggle');if(!btn)return;const on=notifyEnabled();btn.textContent=on?'🔔':'🔕';btn.title=on?'Due-date alerts on — click to turn off':'Turn on due-date alerts'}
document.getElementById('notifyToggle').onclick=async()=>{
  if(!('Notification'in window)){toast('Notifications are not supported in this browser.');return}
  if(notifyEnabled()){localStorage.setItem(NOTIFY_KEY,'0');updateNotifyBtn();toast('Alerts turned off');return}
  let perm=Notification.permission;
  if(perm==='default')perm=await Notification.requestPermission();
  if(perm!=='granted'){toast('Notifications are blocked — allow them for this page in Chrome\'s site settings.');updateNotifyBtn();return}
  localStorage.setItem(NOTIFY_KEY,'1');updateNotifyBtn();toast('✓ Due-date alerts on');maybeSendNotifications(true);
};
function maybeSendNotifications(force=false){
  if(!notifyEnabled())return;
  const todayKey=today();
  let seen;try{seen=JSON.parse(localStorage.getItem(NOTIFY_SEEN_KEY)||'{}')}catch{seen={}}
  if(seen.date!==todayKey)seen={date:todayKey,ids:[]};
  const fire=(dedupeId,title,body)=>{if(seen.ids.includes(dedupeId)&&!force)return;try{new Notification(title,{body,tag:dedupeId})}catch{}if(!seen.ids.includes(dedupeId))seen.ids.push(dedupeId)};
  state.cards.filter(c=>c.active!==false).forEach(c=>{
    if(status(c)!=='paid'){const d=daysUntil(dueDate(c));if(d!==null&&d<=DUE_REMINDER_DAYS){const label=d<0?`overdue by ${-d} day${-d===1?'':'s'}`:d===0?'due today':`due in ${d} day${d===1?'':'s'}`;fire(`due-${c.id}-${todayKey}`,`${c.bank} · ${c.name} bill ${label}`,`Outstanding ${money(outstanding(c))}`)}}
    if(feeDueSoon(c)){const rd=nextRenewalDate(c),d=daysUntil(rd);fire(`fee-${c.id}-${rd}`,`${c.bank} · ${c.name} renews in ${d} day${d===1?'':'s'}`,`Annual fee ${money(c.annualFee)} on ${displayDate(rd)}`)}
  });
  localStorage.setItem(NOTIFY_SEEN_KEY,JSON.stringify(seen));
}
function readFeeFields(f){
  const ltf=f.get('lifetimeFree')==='on';
  let annualFee=0,renewalDate='';
  if(!ltf){
    const fee=Number(f.get('annualFee')||0);
    if(fee<0)throw new Error('Annual fee cannot be negative.');
    annualFee=fee;
    const renewalRaw=f.get('renewalDate');
    renewalDate=renewalRaw?dateForStorageFromDayMonth(renewalRaw):'';
  }
  const waiverAmt=ltf?0:Number(f.get('waiverAmount')||0);
  if(waiverAmt<0)throw new Error('Waiver spend target cannot be negative.');
  return {lifetimeFree:ltf,annualFee,renewalDate,waiverAmt};
}
async function syncFeeWaiverMilestone(c,waiverAmt){
  const existingAuto=state.milestones.find(x=>x.cardId===c.id&&x.periodType==='MEMBERSHIP_YEAR'&&x.autoFeeWaiver);
  if(!c.lifetimeFree&&c.renewalDate&&waiverAmt>0){
    const m=existingAuto||{id:id(),cardId:c.id,active:true,autoFeeWaiver:true};
    m.name='Fee waiver';m.periodType='MEMBERSHIP_YEAR';m.targetAmount=waiverAmt;
    await put('milestones',m);
  }else if(existingAuto){
    await del('milestones',existingAuto.id);
  }
}
cardLifetimeFree.onchange=()=>{feeDetailsGroup.hidden=cardLifetimeFree.checked};
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function milestoneRow(){const d=document.createElement('div');d.className='milestone-edit';d.innerHTML=`<div class="formrow"><input class="mname" placeholder="Name (e.g. Monthly)" required><select class="mtype"><option value="CALENDAR_MONTH">Calendar Month</option><option value="BILLING_CYCLE">Billing Cycle</option><option value="CALENDAR_QUARTER">Calendar Quarter</option><option value="CALENDAR_YEAR">Calendar Year</option><option value="MEMBERSHIP_YEAR">Membership Year (fee waiver)</option></select></div><div style="margin-top:8px"><input class="mtarget" type="number" min="1" step="1" placeholder="Target spend" required></div>`;document.getElementById('milestoneInputs').appendChild(d)}
addMilestone.onclick=milestoneRow;
addCard.onclick=()=>{cardForm.reset();cardForm.dataset.cardId='';cardDialogTitle.textContent='Add credit card';cardCreateOnly.hidden=false;saveCard.textContent='Save Card';milestoneInputs.innerHTML='';cardLifetimeFree.checked=false;feeDetailsGroup.hidden=false;cardDialog.showModal()}
function openEditCard(cardId){
  const c=state.cards.find(x=>x.id===cardId);if(!c)return;
  cardForm.reset();milestoneInputs.innerHTML='';
  cardForm.dataset.cardId=cardId;
  cardDialogTitle.textContent='Edit card';
  cardCreateOnly.hidden=true;
  saveCard.textContent='Save Changes';
  cardForm.bank.value=c.bank||'';
  cardForm.elements.name.value=c.name||'';
  cardForm.network.value=c.network||'Visa';
  cardForm.last4.value=c.last4||'';
  cardForm.statementDay.value=c.statementDay||'';
  cardForm.dueDay.value=c.dueDay||'';
  cardLifetimeFree.checked=Boolean(c.lifetimeFree);
  cardAnnualFee.value=Number(c.annualFee||0);
  cardRenewalDate.value=displayDayMonth(c.renewalDate);
  const existingAuto=state.milestones.find(x=>x.cardId===c.id&&x.periodType==='MEMBERSHIP_YEAR'&&x.autoFeeWaiver);
  cardWaiverAmount.value=existingAuto?Number(existingAuto.targetAmount):'';
  feeDetailsGroup.hidden=cardLifetimeFree.checked;
  cardDialog.showModal();
}
editCardBtn.onclick=()=>{const cardId=detailDialog.dataset.cardId;detailDialog.close();openEditCard(cardId)};
addTxn.onclick=()=>openTxnFor(state.cards.find(c=>c.active!==false)?.id||'')

function openCard(cardId){
  const c=state.cards.find(x=>x.id===cardId); if(!c)return;
  detailDialog.dataset.cardId=cardId;
  const ms=state.milestones.filter(m=>m.cardId===cardId);
  const ts=[...state.transactions].filter(t=>t.cardId===cardId).sort((a,b)=>b.date.localeCompare(a.date));
  detailTitle.textContent=`${c.bank} · ${c.name}`;
  const st=status(c);
  detailContent.innerHTML=`
    <div class="sub">${esc(c.network||'')} ${c.last4?'· •••• '+esc(c.last4):''}</div>
    <div class="detail-grid" style="margin-top:14px">
      <div class="detail-box"><div class="label">Current bill</div><strong>${money(c.currentBill)}</strong></div>
      <div class="detail-box"><div class="label">Paid</div><strong>${money(paidForCurrentBill(c))}</strong></div>
      <div class="detail-box"><div class="label">Outstanding</div><strong>${money(outstanding(c))}</strong></div>
    </div>
    <div class="detail-section panel cardrow">
      <div class="cardmain"><div><div class="cardname">Payment status</div><div class="meta">Bill date ${esc(displayDate(c.billDate))} · Due date ${esc(displayDate(dueDate(c)))}</div></div><span class="badge ${st}">${st.toUpperCase()}</span></div>
      <div class="modalfoot payment-actions" style="margin-top:12px"><button class="btn" onclick="openBill('${c.id}')">Update Bill</button><button class="btn" onclick="openPayment('${c.id}')">+ Add Payment</button>${st==='paid'?'<button class="btn" disabled>✓ Bill Paid</button>':`<button class="btn primary" onclick="openPayment('${c.id}',true)">Mark Bill Paid</button>`}</div>
    </div>
    <div class="detail-section panel cardrow">
      <div class="cardmain"><div><div class="cardname">Annual fee</div><div class="meta">${c.lifetimeFree?'Lifetime free — no annual fee':(c.renewalDate?`Fee ${money(c.annualFee)} · renews ${esc(displayDate(nextRenewalDate(c)))} (in ${daysUntil(nextRenewalDate(c))} day${daysUntil(nextRenewalDate(c))===1?'':'s'})`:'Not set yet')}</div></div></div>
    </div>
    <div class="detail-section"><div class="sectionhead"><div class="sectiontitle">Milestones</div><button class="btn" onclick="openNewMilestone('${c.id}')">+ Add Milestone</button></div>
      ${ms.length?ms.map(m=>{const v=spend(m.cardId,m.periodType),p=Math.min(100,v/Number(m.targetAmount)*100),note=milestoneNote(c,m,v);return `<div class="milestone panel cardrow"><div class="milestonehead"><strong>${esc(m.name)}</strong><div class="milestone-actions"><span>${Math.round(p)}%</span><button class="btn milestone-edit-btn" onclick="openMilestone('${m.id}')">Edit</button></div></div><div class="meta">${esc(milestonePeriodLabel(m.periodType))}</div><div class="bar"><div class="fill" style="width:${p}%"></div></div><div class="meta">${money(v)} / ${money(m.targetAmount)} · ${money(Math.max(0,Number(m.targetAmount)-v))} remaining</div>${note?`<div class="meta" style="margin-top:4px">${note}</div>`:''}</div>`}).join(''):'<div class="panel empty">No milestones configured.</div>'}
    </div>
    <div class="detail-section"><div class="sectionhead"><div class="sectiontitle">Transactions</div><button class="btn" onclick="detailDialog.close();openTxnFor('${c.id}')">+ Add</button></div>
      <div class="panel">${ts.length?ts.map(t=>`<div class="row"><span><strong class="${t.status==='REFUNDED'?'txn-refunded':''}">${esc(t.merchant)}</strong><br><span class="meta">${esc(displayDate(t.date))} · ${esc(state.cards.find(x=>x.id===t.cardId)?.bank||'Unknown bank')} · ${esc(state.cards.find(x=>x.id===t.cardId)?.name||'Unknown card')} ${t.type==='PAYMENT'?'· PAYMENT':''} ${t.status==='REFUNDED'?'· REFUNDED':''}</span></span><strong class="${t.status==='REFUNDED'?'txn-refunded':''}">${money(t.amount)}</strong></div>`).join(''):'<div class="empty">No transactions for this card.</div>'}</div>
    </div>`;
  detailDialog.showModal();
}
function openBill(cardId,suggestedBillDate=''){
  const c=state.cards.find(x=>x.id===cardId);if(!c)return;
  billForm.dataset.cardId=cardId;billAmount.value=Number(c.currentBill||0);setDateField(billForm.billDate,suggestedBillDate||c.billDate||today());
  billSummary.innerHTML=`<div class="cardmain"><div><div class="cardname">${esc(c.bank)} · ${esc(c.name)}</div><div class="meta">Current outstanding: ${money(outstanding(c))}</div></div><span class="badge ${status(c)}">${status(c).toUpperCase()}</span></div>`;
  billDialog.showModal();
}
billForm.onsubmit=async e=>{e.preventDefault();const b=document.getElementById('saveBill');if(b.disabled)return;b.disabled=true;b.textContent='Saving…';try{const c=state.cards.find(x=>x.id===billForm.dataset.cardId);if(!c)throw new Error('Card not found.');const bill=Number(billAmount.value||0);if(bill<0)throw new Error('Bill amount cannot be negative.');c.currentBill=bill;c.billDate=dateForStorage(billForm.billDate.value);await put('cards',c);billDialog.close();await load();toast('✓ Current bill updated');if(detailDialog.open)openCard(c.id)}catch(err){toast('Could not update bill: '+err.message)}finally{b.disabled=false;b.textContent='Save Bill'}};
function openPayment(cardId,markPaid=false){
  const c=state.cards.find(x=>x.id===cardId); if(!c)return;
  paymentForm.dataset.cardId=cardId;
  setDateField(paymentForm.paymentDate,today());
  const paid=paidForCurrentBill(c), out=outstanding(c);
  paymentAmount.value=markPaid&&out>0?out:'';
  document.getElementById('savePayment').textContent=markPaid?'Mark Bill Paid':'Add Payment';
  paymentSummary.innerHTML=`<div class="cardmain"><div><div class="cardname">${esc(c.bank)} · ${esc(c.name)}</div><div class="meta">Bill ${money(c.currentBill)} · Paid ${money(paid)} · Outstanding ${money(out)}</div></div><span class="badge ${status(c)}">${status(c).toUpperCase()}</span></div>`;
  paymentDialog.showModal();
}
function openTxnFor(cardId){
  txnForm.reset(); setDateField(txnForm.date,today()); txnCard.innerHTML=state.cards.filter(c=>c.active!==false).map(c=>`<option value="${c.id}" ${c.id===cardId?'selected':''}>${esc(c.bank)} · ${esc(c.name)}</option>`).join(''); txnDialog.showModal();
}
paymentForm.onsubmit=async e=>{
  e.preventDefault();const b=document.getElementById('savePayment');if(b.disabled)return;b.disabled=true;b.textContent='Saving…';
  try{const cardId=paymentForm.dataset.cardId,c=state.cards.find(x=>x.id===cardId);const amount=Number(paymentAmount.value||0),remaining=outstanding(c);if(amount<=0)throw new Error('Payment amount must be greater than ₹0.');if(amount>remaining)throw new Error(`Payment cannot exceed the outstanding amount of ${money(remaining)}.`);
    await put('transactions',{id:id(),cardId,date:dateForStorage(paymentForm.paymentDate.value),merchant:'Bill Payment',amount,type:'PAYMENT',status:'COMPLETED',refundDate:''});paymentDialog.close();await load();toast(amount>=remaining?'✓ Bill marked paid':'✓ Partial payment added');if(detailDialog.open)openCard(cardId);
  }catch(err){toast('Could not save payment: '+err.message)}finally{b.disabled=false;b.textContent='Add Payment'}
};

function setMembershipYearAvailability(cardId){const c=state.cards.find(x=>x.id===cardId),opt=document.getElementById('membershipYearOption');if(!opt)return;const available=Boolean(c&&!c.lifetimeFree&&c.renewalDate);opt.disabled=!available;opt.textContent=available?'Membership Year (fee waiver)':'Membership Year (set annual fee & renewal date first)'}
function openMilestone(milestoneId){const m=state.milestones.find(x=>x.id===milestoneId);if(!m)return;milestoneForm.dataset.milestoneId=milestoneId;milestoneForm.dataset.cardId=m.cardId;milestoneDialogTitle.textContent='Edit milestone';setMembershipYearAvailability(m.cardId);milestoneName.value=m.name;milestonePeriod.value=m.periodType;milestoneTarget.value=Number(m.targetAmount);saveMilestone.textContent='Save Changes';milestoneDialog.showModal()}
function openNewMilestone(cardId){if(!state.cards.some(c=>c.id===cardId))return;milestoneForm.reset();milestoneForm.dataset.milestoneId='';milestoneForm.dataset.cardId=cardId;milestoneDialogTitle.textContent='Add milestone';setMembershipYearAvailability(cardId);milestonePeriod.value='CALENDAR_MONTH';saveMilestone.textContent='Add Milestone';milestoneDialog.showModal()}
milestoneForm.onsubmit=async e=>{e.preventDefault();const b=document.getElementById('saveMilestone');if(b.disabled)return;b.disabled=true;b.textContent='Saving…';try{const milestoneId=milestoneForm.dataset.milestoneId,cardId=milestoneForm.dataset.cardId,m=milestoneId?state.milestones.find(x=>x.id===milestoneId):{id:id(),cardId,active:true};if(!m||!state.cards.some(c=>c.id===cardId))throw new Error('Milestone not found.');const name=milestoneName.value.trim(),amount=Number(milestoneTarget.value||0);if(!name)throw new Error('Enter a milestone name.');if(amount<=0)throw new Error('Target spend must be greater than ₹0.');m.name=name;m.periodType=milestonePeriod.value;m.targetAmount=amount;await put('milestones',m);milestoneDialog.close();await load();toast(milestoneId?'✓ Milestone updated':'✓ Milestone added');if(detailDialog.open)openCard(cardId)}catch(err){toast('Could not save milestone: '+err.message)}finally{b.disabled=false;b.textContent=milestoneForm.dataset.milestoneId?'Save Changes':'Add Milestone'}};

cardForm.onsubmit=async e=>{
  e.preventDefault();const b=document.getElementById('saveCard');if(b.disabled)return;b.disabled=true;b.textContent='Saving…';
  try{
    const f=new FormData(e.target),editingId=cardForm.dataset.cardId,fee=readFeeFields(f);
    if(editingId){
      const c=state.cards.find(x=>x.id===editingId);if(!c)throw new Error('Card not found.');
      c.bank=f.get('bank');c.name=f.get('name');c.network=f.get('network');c.last4=f.get('last4');c.statementDay=Number(f.get('statementDay'));c.dueDay=Number(f.get('dueDay'));
      c.lifetimeFree=fee.lifetimeFree;c.annualFee=fee.annualFee;c.renewalDate=fee.renewalDate;
      await put('cards',c);
      await syncFeeWaiverMilestone(c,fee.waiverAmt);
      cardDialog.close();await load();toast('✓ Card updated');openCard(c.id);
    }else{
      const card={id:id(),bank:f.get('bank'),name:f.get('name'),network:f.get('network'),last4:f.get('last4'),statementDay:Number(f.get('statementDay')),dueDay:Number(f.get('dueDay')),currentBill:Number(f.get('currentBill')||0),billDate:f.get('billDate')?dateForStorage(f.get('billDate')):today(),active:true,lifetimeFree:fee.lifetimeFree,annualFee:fee.annualFee,renewalDate:fee.renewalDate};
      await put('cards',card);
      await syncFeeWaiverMilestone(card,fee.waiverAmt);
      for(const r of document.querySelectorAll('.milestone-edit'))await put('milestones',{id:id(),cardId:card.id,name:r.querySelector('.mname').value,periodType:r.querySelector('.mtype').value,targetAmount:Number(r.querySelector('.mtarget').value),active:true});
      cardDialog.close();await load();toast('✓ Card saved');
    }
  }catch(err){toast('Could not save card: '+err.message)}
  finally{b.disabled=false;b.textContent=cardForm.dataset.cardId?'Save Changes':'Save Card'}
};
txnForm.onsubmit=async e=>{e.preventDefault();const b=document.getElementById('saveTxn');if(b.disabled)return;b.disabled=true;b.textContent='Saving…';try{const f=new FormData(e.target);await put('transactions',{id:id(),cardId:f.get('cardId'),date:dateForStorage(f.get('date')),merchant:f.get('merchant'),amount:Number(f.get('amount')),type:'PURCHASE',status:'COMPLETED',refundDate:''});txnDialog.close();await load();toast('✓ Transaction added')}catch(err){toast('Could not save transaction: '+err.message)}finally{b.disabled=false;b.textContent='Add Transaction'}};
function openRefund(txnId){const t=state.transactions.find(x=>x.id===txnId);if(!t)return;refundForm.dataset.txnId=txnId;setDateField(refundForm.refundDate,t.refundDate||today());const c=state.cards.find(x=>x.id===t.cardId);refundSummary.innerHTML=`<div class="cardmain"><div><div class="cardname">${esc(t.merchant)}</div><div class="meta">${esc(c?.bank||'Unknown bank')} · ${esc(c?.name||'Unknown card')} · ${esc(displayDate(t.date))}</div></div><strong>${money(t.amount)}</strong></div>`;refundDialog.showModal()}
refundForm.onsubmit=async e=>{e.preventDefault();const b=document.getElementById('saveRefund');if(b.disabled)return;b.disabled=true;b.textContent='Saving…';try{const t=state.transactions.find(x=>x.id===refundForm.dataset.txnId);if(!t)throw new Error('Transaction not found.');t.status='REFUNDED';t.refundDate=dateForStorage(refundForm.refundDate.value);await put('transactions',t);refundDialog.close();await load();toast('✓ Transaction marked refunded');if(detailDialog.open)openCard(t.cardId)}catch(err){toast('Could not mark refund: '+err.message)}finally{b.disabled=false;b.textContent='Mark Refunded'}};
async function undoRefund(txnId){const t=state.transactions.find(x=>x.id===txnId);if(!t)return;t.status='COMPLETED';t.refundDate='';await put('transactions',t);await load();toast('✓ Refund removed');if(detailDialog.open)openCard(t.cardId)};
document.querySelectorAll('.date-input').forEach(field=>field.addEventListener('input',()=>{const digits=field.value.replace(/\D/g,'').slice(0,8);field.value=digits.length>4?`${digits.slice(0,2)}-${digits.slice(2,4)}-${digits.slice(4)}`:digits.length>2?`${digits.slice(0,2)}-${digits.slice(2)}`:digits}));
document.querySelectorAll('.dm-input').forEach(field=>field.addEventListener('input',()=>{const digits=field.value.replace(/\D/g,'').slice(0,4);field.value=digits.length>2?`${digits.slice(0,2)}-${digits.slice(2)}`:digits}));
search.oninput=render;statusFilter.onchange=render;theme.onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme==='dark'?'light':'dark';localStorage.setItem('cardly-theme',d.dataset.theme)};document.documentElement.dataset.theme=localStorage.getItem('cardly-theme')||'light';
const supportsDirectFileAccess='showOpenFilePicker'in window&&'showSaveFilePicker'in window;
document.getElementById('openDataFile').onclick=()=>chooseDataFile(false);document.getElementById('createDataFile').onclick=()=>chooseDataFile(true);document.getElementById('resumeDataFile').onclick=reopenLastDataFile;document.getElementById('importDataFile').onclick=()=>document.getElementById('dataFileInput').click();document.getElementById('dataFileInput').onchange=e=>{const file=e.target.files[0];if(file)importDataFile(file);e.target.value=''};document.getElementById('exportDataFile').onclick=exportMobileData;
if(supportsDirectFileAccess){getRememberedFileHandle().then(async handle=>{if(!handle)return;const permission=await handle.queryPermission({mode:'readwrite'});if(permission==='granted')await useDataFile(handle);else document.getElementById('resumeDataFile').hidden=false}).catch(()=>{})}else{document.getElementById('dataGateTitle').textContent='Import your Cardly data';document.getElementById('dataGateDescription').textContent='Choose cardly-data.json from the Files app. Cardly will keep your changes on this iPhone until you export an updated file back to iCloud Drive.';document.getElementById('openDataFile').hidden=true;document.getElementById('createDataFile').hidden=true;document.getElementById('importDataFile').hidden=false;getMobileData().then(async data=>{if(!data)return;mobileStorage=true;applyData(data);await load();showDashboard()}).catch(()=>setFileError('Could not open this browser’s saved Cardly data.'))}
