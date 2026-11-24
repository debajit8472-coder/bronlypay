(() => {
  'use strict';
  const API = String(window.BRONLY_ADMIN_CONFIG?.API_BASE || '').replace(/\/$/, '');
  const $ = id => document.getElementById(id);
  const h = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const d = value => value ? new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  const money = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value)) : '—';
  const num = value => new Intl.NumberFormat('en-IN').format(Number(value || 0));
  const state = { token:null, admin:null, page:'overview', pg:1, query:'', items:[], currentColumns:[] };
  const titleMap = {overview:'Overview',users:'Customers',payments:'Payments',recharges:'Recharges',ledger:'Wallet ledger',requests:'Payment requests',tickets:'Support tickets',audit:'Activity log',settings:'System status'};
  const subtitles = {
    overview:'A real-time view of your BronlyPay operations.',
    users:'Browse customers and inspect their recorded account activity.',
    payments:'Existing payment records — not provider-verified settlements.',
    recharges:'Recharge records — operator fulfilment is not yet verified.',
    ledger:'Read-only legacy wallet transactions and recorded balances.',
    requests:'Track and review requests. No wallet credit is performed.',
    tickets:'Track customer issues and update resolution status.',
    audit:'A trace of sensitive administrator actions.',
    settings:'Backend connectivity, role permissions and launch safeguards.'
  };
  const config = {
    users:{ columns:[['ID','id'],['CUSTOMER','name'],['EMAIL','email'],['RECORDED BALANCE','recorded_balance'],['JOINED','created_at']], detail:true },
    payments:{columns:[['ID','id'],['ORDER','order_id'],['CUSTOMER','email'],['AMOUNT','amount'],['STATUS','status'],['DATE','created_at']]},
    recharges:{columns:[['ID','id'],['OPERATOR','operator'],['CUSTOMER','email'],['NUMBER','mobile_number'],['AMOUNT','amount'],['STATUS','status'],['DATE','created_at']]},
    ledger:{columns:[['ID','id'],['CUSTOMER','email'],['TYPE','type'],['AMOUNT','amount'],['AFTER','balance_after'],['STATUS','status'],['DATE','created_at']]},
    requests:{columns:[['ID','id'],['CUSTOMER','customer_email'],['AMOUNT','amount'],['REFERENCE','customer_reference'],['STATUS','status'],['DATE','created_at']]},
    tickets:{columns:[['ID','id'],['SUBJECT','subject'],['CUSTOMER','customer_email'],['PRIORITY','priority'],['STATUS','status'],['DATE','created_at']]},
    audit:{columns:[['TIME','created_at'],['ADMIN','admin_email'],['ACTION','action'],['ENTITY','entity_type'],['ID','entity_id']]}
  };
  let toastTimer;
  function toast(message, error=false) {
    const el = $('toast'); el.textContent=message;el.className='toast'+(error?' error':'');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),4500);
  }
  async function request(path,method='GET',data=null) {
    if(!API.startsWith('https://') && !API.startsWith('http://localhost')) throw new Error('Invalid API endpoint in config.js');
    const headers={'Accept':'application/json'};
    if(data!==null) headers['Content-Type']='application/json';
    if(state.token) headers['Authorization']='Bearer '+state.token;
    let res;
    try {res=await fetch(API+path,{method,headers,body:data===null?undefined:JSON.stringify(data),cache:'no-store'});}
    catch {throw new Error('Cannot reach admin API. Check Render and the backend CORS allowlist.');}
    let body={};try{body=await res.json();}catch{}
    if(!res.ok) {
      if(res.status===401 && state.token) { logout(false); }
      throw new Error(body.error||body.message||`Request failed (${res.status})`);
    }
    return body;
  }
  function signInVisible(show) { $('loginScreen').classList.toggle('hidden',!show);$('appShell').classList.toggle('hidden',show); }
  function logout(message=true){state.token=null;state.admin=null;state.items=[];$('password').value='';signInVisible(true);if(message)toast('Signed out.');}
  async function login(e){e.preventDefault();$('loginError').textContent='';$('loginButton').disabled=true;
    try{const data=await request('/auth/login','POST',{email:$('email').value.trim(),password:$('password').value});
      if(!data.token || !data.admin) throw new Error('Invalid login response');
      state.token=data.token;state.admin=data.admin;$('password').value='';$('accountName').textContent=data.admin.name||'Admin';
      $('accountRole').textContent=String(data.admin.role||'Administrator').replaceAll('_',' ');
      $('avatar').textContent=String(data.admin.name||'A').charAt(0).toUpperCase();signInVisible(false);await navigate('overview');
    }catch(err){$('loginError').textContent=err.message;}finally{$('loginButton').disabled=false;}
  }
  function isOperator(){return ['super_admin','operations'].includes(state.admin?.role);}
  function canSupport(){return ['super_admin','operations','support'].includes(state.admin?.role);}
  function head(title,subtitle,actions=''){return `<section class="page-head"><div><div class="eyebrow">BRONLYPAY / OPERATIONS</div><h1>${h(title)}</h1><p>${h(subtitle)}</p></div><div class="page-actions">${actions}</div></section>`;}
  const badge = val => {
    const s=String(val??'UNKNOWN').toUpperCase();
    const type=['SUCCESS','SUCCEEDED','COMPLETED','RESOLVED','REVIEWED','CREDIT'].includes(s)?'good':
      ['PENDING','PROCESSING','IN_PROGRESS','OPEN','NORMAL'].includes(s)?'warn':
      ['FAILED','REJECTED','CANCELED','CANCELLED','DEBIT','HIGH'].includes(s)?'bad':'neutral';
    return `<span class="pill ${type}">${h(s.replaceAll('_',' '))}</span>`;
  };
  const isDate = key => key==='created_at' || key==='updated_at';
  function fieldHtml(key,value){
    if(['amount','balance_after','recorded_balance'].includes(key))return `<b>${h(money(value))}</b>`;
    if(key==='status'||key==='priority'||key==='type')return badge(value);
    if(isDate(key)) return h(d(value));
    if(key==='email'||key==='customer_email')return `<span class="main-cell">${h(value)}</span>`;
    return h(value);
  }
  function warning(content){return `<div class="banner-note"><span class="warn-symbol">!</span><div><strong>Financial verification safeguard</strong><p>${h(content)}</p></div></div>`;}
  const tableHeader = () => `<div class="toolbar"><div class="search-field"><span>⌕</span><input id="searchInput" type="search" placeholder="Search ${h(titleMap[state.page].toLowerCase())}…" value="${h(state.query)}" aria-label="Search records"></div><div class="toolbar-actions">${state.page==='requests'&&isOperator()?'<button class="btn primary" data-action="new-request">+ Add request</button>':''}${state.page==='tickets'&&canSupport()?'<button class="btn primary" data-action="new-ticket">+ New ticket</button>':''}<button class="btn light" data-action="export">↓ Export page CSV</button></div></div>`;
  function rowAction(item){
    if(state.page==='users')return `<button class="row-link" data-action="user-detail" data-id="${Number(item.id)}">Details ↗</button>`;
    if(state.page==='requests' && item.status==='PENDING' && isOperator())return `<button class="row-link" data-action="review-request" data-id="${Number(item.id)}">Review ↗</button>`;
    if(state.page==='tickets' && item.status!=='RESOLVED' && canSupport())return `<button class="row-link" data-action="ticket-status" data-id="${Number(item.id)}">Update ↗</button>`;
    return '—';
  }
  function paintTable(data) {
    const columns=config[state.page].columns;state.items=data.items||[];state.currentColumns=columns;
    const rows=state.items.map(item=>`<tr>${columns.map(([,key])=>`<td>${fieldHtml(key,item[key])}</td>`).join('')}<td>${rowAction(item)}</td></tr>`).join('');
    const shown=state.items.length, total=Number(data.total||0), limit=Number(data.limit||20), totalPages=Math.max(1,Math.ceil(total/limit));
    return `${head(titleMap[state.page],subtitles[state.page])}
      ${['payments','recharges','ledger','requests'].includes(state.page)?warning(data.warning||subtitles[state.page]):''}
      ${tableHeader()}<div class="table-card"><div class="table-wrap"><table><thead><tr>${columns.map(([label])=>`<th>${h(label)}</th>`).join('')}<th>ACTIONS</th></tr></thead><tbody>${rows||`<tr><td colspan="${columns.length+1}"><div class="empty-state"><span class="empty-icon">▧</span>No records found for this view.</div></td></tr>`}</tbody></table></div><div class="table-footer"><span>${total?num((state.pg-1)*limit+1):0}–${num((state.pg-1)*limit+shown)} of ${num(total)} records</span><div class="pager"><button data-action="prev" ${state.pg<=1?'disabled':''}>← Previous</button><button data-action="next" ${state.pg>=totalPages?'disabled':''}>Next →</button></div></div></div>`;
  }
  function statCard(label,val,icon,variant='',note='Recorded data'){
    return `<div class="stat-card"><div class="stat-top"><span>${h(label)}</span><span class="stat-icon ${variant}">${h(icon)}</span></div><strong class="stat-value">${num(val)}</strong><div class="stat-note">${h(note)}</div></div>`;
  }
  function chart(items) {
    if(!Array.isArray(items)||!items.length)return '<div class="empty-state">No trend data</div>';
    const max=Math.max(1,...items.flatMap(x=>[Number(x.payments),Number(x.recharges)]));
    const bars=items.map(x=>{const a=Math.max(3,Math.round(Number(x.payments)/max*160));const b=Math.max(3,Math.round(Number(x.recharges)/max*160));
      return `<div class="bar-group"><div class="bar-pair"><div class="bar" title="Payment records: ${Number(x.payments)}" style="height:${a}px"></div><div class="bar secondary" title="Recharge records: ${Number(x.recharges)}" style="height:${b}px"></div></div><div class="bar-label">${h(String(x.day).slice(5))}</div></div>`;}).join('');
    return `<div class="bar-chart">${bars}</div><div class="chart-legend"><span><i class="legend-dot"></i> Payment records</span><span><i class="legend-dot green"></i> Recharge records</span></div>`;
  }
  function quickCard(icon,title,desc,page){return `<div class="quick-card"><span class="quick-dot">${h(icon)}</span><div><strong>${h(title)}</strong><small>${h(desc)}</small></div><button data-page="${h(page)}" aria-label="Open ${h(title)}">→</button></div>`;}
  async function showOverview(){
    const [o,t]=await Promise.all([request('/overview'),request('/trends')]);
    $('mainContent').innerHTML = head('Operations overview','Good to see you. Here is what your system has recorded.',`<button class="btn light" data-action="refresh">↻ Refresh data</button>`)+
      warning('Payment and recharge records are NOT proof of settled money or delivered services. No customer balance is credited from this dashboard.')+
      `<section class="stats">${statCard('Total customers',o.customers,'♙','','Registered users')}${statCard('Payment records',o.payment_records,'▤','green','Not verified settlements')}${statCard('Recharge records',o.recharge_records,'◈','purple','Not verified fulfilments')}${statCard('Pending reviews',o.pending_requests,'☑','orange','Admin review required')}</section>
      <div class="split"><div class="panel"><div class="panel-title"><div><h2>7-day activity</h2><p class="panel-sub">Recorded payment and recharge entries</p></div><span class="pill neutral">LAST 7 DAYS</span></div>${chart(t.items)}</div>
      <div class="panel"><div class="panel-title"><div><h2>Quick access</h2><p class="panel-sub">Your daily work, one click away</p></div></div>
      ${quickCard('♙','Customer directory','Search registered accounts','users')}
      ${quickCard('☑','Pending requests',`${num(o.pending_requests)} awaiting review`,'requests')}
      ${quickCard('☏','Support queue',`${num(o.open_tickets)} open or in progress`,'tickets')}
      ${quickCard('◈','Recharge records','Inspect reported activity','recharges')}</div></div>`;
  }
  async function showSettings(){
    const [me,health]=await Promise.all([request('/me'),request('/health')]);
    const a=me.admin;
    $('mainContent').innerHTML=head('System status','See current connectivity and your administrative permissions.')+
      `<div class="info-rows"><div class="panel"><div class="panel-title"><h2>Infrastructure</h2></div>
      <ul class="summary-list"><li><span>Admin backend API</span><b class="health-ok">${h(health.api)}</b></li><li><span>Database check</span><b class="health-ok">${h(health.database)}</b></li><li><span>Payment gateway verification</span><b class="health-unknown">Not connected here</b></li><li><span>Recharge fulfilment verification</span><b class="health-unknown">Not connected here</b></li><li><span>Customer wallet credits</span><b class="health-ok">Disabled in admin</b></li></ul></div>
      <div class="panel"><div class="panel-title"><h2>Your access</h2></div>
      <ul class="summary-list"><li><span>Admin name</span><b>${h(a.name)}</b></li><li><span>Admin email</span><b>${h(a.email)}</b></li><li><span>Role</span><b>${h(a.role)}</b></li><li><span>View customer data</span><b>Allowed</b></li><li><span>Review requests</span><b>${isOperator()?'Allowed':'Not allowed'}</b></li><li><span>Admin token duration</span><b>30 minutes</b></li></ul></div></div>
      <div class="note-inline" style="margin-top:20px">Security: roles are checked against the database on every protected request. Admin tokens are kept only in browser memory and are lost on reload. For production, add MFA, edge rate limiting, alerting, and comprehensive security testing.</div>`;
  }
  async function navigate(page){
    if(!state.token)return;
    if(!titleMap[page])return;
    state.page=page;state.pg=1;state.query='';$('breadcrumb').textContent=titleMap[page];
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    $('sidebar').classList.remove('open');await loadPage();
  }
  async function loadPage(){
    if(!state.token)return;
    $('mainContent').innerHTML='<div class="loading-box">Loading '+h(titleMap[state.page])+'…</div>';
    try{
      if(state.page==='overview')await showOverview();
      else if(state.page==='settings')await showSettings();
      else {const p=new URLSearchParams({page:String(state.pg),limit:'20',q:state.query});
        const result=await request('/'+(state.page==='users'?'users':state.page)+'?'+p.toString());
        $('mainContent').innerHTML=paintTable(result);}
    }catch(err){if(!state.token)return;$('mainContent').innerHTML=head(titleMap[state.page],subtitles[state.page])+`<div class="error-panel">${h(err.message)}<br><br><button class="btn light" data-action="refresh">Try again</button></div>`;}
  }
  const modal = (title,body,onSave,saveLabel='Save')=>{
    $('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;
    $('dialogConfirm').textContent=saveLabel;
    $('dialogConfirm').classList.toggle('hidden',!onSave);
    $('dialogForm').onsubmit=async e=>{e.preventDefault();if(!onSave){$('actionDialog').close();return;}
      $('dialogConfirm').disabled=true;
      try{await onSave(new FormData($('dialogForm')));$('actionDialog').close();await loadPage();}
      catch(err){toast(err.message,true);}finally{$('dialogConfirm').disabled=false;}
    };
    $('actionDialog').showModal();
  };
  function formField(label,name,type='text',placeholder='',required=true){
    return `<div class="field"><label for="field-${h(name)}">${h(label)}</label><input id="field-${h(name)}" name="${h(name)}" type="${h(type)}" placeholder="${h(placeholder)}" ${required?'required':''} /></div>`;
  }
  async function userDetail(id){
    const data=await request('/users/'+encodeURIComponent(id));const u=data.user;
    const hist=data.transactions.slice(0,7).map(x=>`<li><span>${h(x.type)} · ${h(d(x.created_at))}</span><b>${h(money(x.amount))}</b></li>`).join('');
    modal('Customer #'+u.id,`<div class="info-rows"><div class="info-box"><h3>Name</h3><strong>${h(u.name)}</strong></div><div class="info-box"><h3>Recorded balance</h3><strong>${h(money(u.recorded_balance))}</strong></div></div>
      <div class="note-inline">${h(u.email)}<br>Joined ${h(d(u.created_at))}</div><h4>Recent wallet ledger entries</h4><ul class="summary-list">${hist||'<li>No wallet entries available</li>'}</ul><p class="caption">Balances and entries may be unverified legacy data. No changes can be made here.</p>`,null,'Close');
  }
  function newRequest(){modal('Record a payment request',`<div class="note-inline">Recordkeeping only. Do not instruct the customer to deposit money, and do not treat a UTR as proof of settlement. This form NEVER credits a wallet.</div>
    ${formField('Existing customer ID','user_id','number','e.g. 1')}${formField('Claimed amount (INR, two decimals)','amount','text','e.g. 100.00')}${formField('Customer-supplied reference (optional)','customer_reference','text','Do not trust without bank verification',false)}`,
    async fd=>{await request('/requests','POST',{user_id:String(fd.get('user_id')),amount:String(fd.get('amount')),customer_reference:String(fd.get('customer_reference'))});toast('Request recorded. No funds moved.');},'Record request');}
  function reviewRequest(id){modal('Review request #'+id,`<div class="note-inline">Marking a request reviewed is an administrative note only. It DOES NOT verify bank settlement or add money to any account.</div>
    <div class="field"><label for="reviewStatus">Review status</label><select id="reviewStatus" name="status"><option value="REVIEWED">Reviewed (no credit)</option><option value="REJECTED">Rejected</option></select></div>
    <div class="field"><label for="reviewNote">Reason or verification note (required)</label><textarea id="reviewNote" name="note" minlength="4" maxlength="500" required placeholder="Record your findings. Do not include bank secrets."></textarea></div>`,
    async fd=>{await request('/requests/'+id,'PATCH',{status:String(fd.get('status')),note:String(fd.get('note'))});toast('Review saved. Wallet unchanged.');},'Save review');}
  function newTicket(){modal('Open support ticket',`${formField('Subject','subject','text','Issue summary')}
    <div class="field"><label for="tDesc">Description</label><textarea name="description" id="tDesc" required minlength="3" maxlength="4000" placeholder="Describe the issue"></textarea></div>
    ${formField('Customer ID (optional)','user_id','number','Leave empty if unknown',false)}
    <div class="field"><label for="priority">Priority</label><select name="priority" id="priority"><option>NORMAL</option><option>LOW</option><option>HIGH</option></select></div>`,
    async fd=>{await request('/tickets','POST',{subject:String(fd.get('subject')),description:String(fd.get('description')),user_id:String(fd.get('user_id')),priority:String(fd.get('priority'))});toast('Ticket created.');},'Create ticket');}
  function updateTicket(id){modal('Update ticket #'+id,`<div class="field"><label for="ticketStatus">New status</label><select id="ticketStatus" name="status"><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="OPEN">Open</option></select></div>`,
    async fd=>{await request('/tickets/'+id,'PATCH',{status:String(fd.get('status'))});toast('Ticket updated.');},'Save status');}
  function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function exportCsv(){const cols=state.currentColumns;if(!cols.length){toast('No table to export.',true);return;}
    const rows=[cols.map(x=>x[0]),...state.items.map(item=>cols.map(([,key])=>item[key]??''))];
    const csv='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`bronlypay_${state.page}_page_${state.pg}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast('Current page exported.');
  }
  async function action(type,id){try{
    if(type==='refresh')await loadPage();else if(type==='next'){state.pg++;await loadPage();}
    else if(type==='prev'){state.pg=Math.max(1,state.pg-1);await loadPage();}
    else if(type==='export')exportCsv();else if(type==='new-request')newRequest();
    else if(type==='review-request')reviewRequest(id);else if(type==='new-ticket')newTicket();
    else if(type==='ticket-status')updateTicket(id);else if(type==='user-detail')await userDetail(id);
  }catch(err){toast(err.message,true);}}
  function init(){
    $('loginForm').addEventListener('submit',login);
    $('logoutBtn').addEventListener('click',()=>logout());
    $('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
    $('mobileClose').addEventListener('click',()=>$('sidebar').classList.remove('open'));
    $('refreshBtn').addEventListener('click',()=>loadPage());
    $('dialogClose').addEventListener('click',()=>$('actionDialog').close());
    $('dialogCancel').addEventListener('click',()=>$('actionDialog').close());
    document.addEventListener('click',e=>{
      const nav=e.target.closest('[data-page]');if(nav){navigate(nav.dataset.page);return;}
      const act=e.target.closest('[data-action]');if(act){action(act.dataset.action,act.dataset.id);return;}
    });
    let searchTimer;
    $('mainContent').addEventListener('input',e=>{
      if(e.target.id!=='searchInput')return;
      const value=e.target.value;
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>{state.query=value.trim();state.pg=1;loadPage();},450);
    });
  }
  init();
})();
