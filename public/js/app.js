const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// Theme & i18n
const STORAGE_KEYS = { theme: 'ebox:theme', lang: 'ebox:lang' };
const THEMES = { dark: 'dark', light: 'light' };
const RTL_LANGS = new Set(['ar']);

const TRANSLATIONS = {
  en: { app_name:'EBox', logout:'Logout', sign_in:'Sign in', username_placeholder:'Username', password_placeholder:'Password', login:'Login', create_account:'Create account', new_task_placeholder:'New task title', add:'Add', q_do_first_title:'Do First', q_do_first_hint:'Crises, emergencies, deadlines', q_schedule_title:'Schedule', q_schedule_hint:'Planning, learning, relationships', q_delegate_title:'Delegate', q_delegate_hint:'Interruptions, some meetings', q_eliminate_title:'Eliminate', q_eliminate_hint:'Distractions & time-wasters', q_do_first_opt:'Important & Urgent', q_schedule_opt:'Important, Not Urgent', q_delegate_opt:'Not Important, Urgent', q_eliminate_opt:'Not Important & Not Urgent', delete_confirm:'Delete task?' },
  ar: { app_name:'صندوق أيزنهاور', logout:'تسجيل الخروج', sign_in:'تسجيل الدخول', username_placeholder:'اسم المستخدم', password_placeholder:'كلمة المرور', login:'دخول', create_account:'إنشاء حساب', new_task_placeholder:'عنوان مهمة جديدة', add:'إضافة', q_do_first_title:'قوم بها أولًا', q_do_first_hint:'أزمات، طوارئ، مواعيد نهائية', q_schedule_title:'جدولة', q_schedule_hint:'تخطيط، تعلم، علاقات', q_delegate_title:'تفويض', q_delegate_hint:'مقاطعات، بعض الاجتماعات', q_eliminate_title:'إلغاء', q_eliminate_hint:'مشتتات ومضيعات للوقت', q_do_first_opt:'مهم وعاجل', q_schedule_opt:'مهم وغير عاجل', q_delegate_opt:'غير مهم وعاجل', q_eliminate_opt:'غير مهم وغير عاجل', delete_confirm:'حذف المهمة؟' }
};

function setTheme(theme){
  const next = theme === THEMES.light ? THEMES.light : THEMES.dark;
  document.body.setAttribute('data-theme', next);
  const btn = $('#themeToggle');
  if (btn) btn.textContent = next === THEMES.light ? '🌞' : '🌙';
  localStorage.setItem(STORAGE_KEYS.theme, next);
}

function applyLang(lang){
  const locale = TRANSLATIONS[lang] ? lang : 'en';
  document.documentElement.lang = locale;
  document.body.dir = RTL_LANGS.has(locale) ? 'rtl' : 'ltr';
  const dict = TRANSLATIONS[locale];
  // text nodes
  $$('[data-i18n]').forEach(n=>{ const k=n.getAttribute('data-i18n'); if (dict[k]) n.textContent = dict[k]; });
  // placeholders
  $$('[data-i18n-placeholder]').forEach(n=>{ const k=n.getAttribute('data-i18n-placeholder'); if (dict[k]) n.setAttribute('placeholder', dict[k]); });
  const sel = $('#languageSelect'); if (sel) sel.value = locale;
  localStorage.setItem(STORAGE_KEYS.lang, locale);
}

async function api(path, opts={}){
  const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type':'application/json' }, ...opts });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

function renderStats(tasks){
  const total = tasks.length || 1;
  const counts = { do_first:0, schedule:0, delegate:0, eliminate:0 };
  tasks.forEach(t=>counts[t.quadrant]++);
  const lang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
  const dict = TRANSLATIONS[TRANSLATIONS[lang]?lang:'en'];
  $('#stats').textContent = `${dict.q_do_first_title} ${(counts.do_first/total*100)|0}% · ${dict.q_schedule_title} ${(counts.schedule/total*100)|0}% · ${dict.q_delegate_title} ${(counts.delegate/total*100)|0}% · ${dict.q_eliminate_title} ${(counts.eliminate/total*100)|0}%`;
}

function el(tag, attrs={}, children=[]) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k === 'class') {
      e.className = v;
    } else if (k.startsWith('on')) {
      e.addEventListener(k.slice(2), v);
    } else if (k === 'text') {
      e.textContent = v;
    } else if (k === 'value' && 'value' in e) {
      e.value = v;
    } else if (k === 'checked' && 'checked' in e) {
      e.checked = !!v;
    } else {
      e.setAttribute(k,v);
    }
  });
  children.forEach(c=> e.append(c));
  return e;
}

function taskItem(t){
  const checkbox = el('input', { type:'checkbox', checked: !!t.completed });
  checkbox.addEventListener('change', async ()=>{
    const prev = !checkbox.checked;
    try{ await api(`/api/tasks/${t.id}/toggle`, { method:'POST', body: JSON.stringify({ completed: checkbox.checked })}); }
    catch(e){ alert(e.message); checkbox.checked = prev; }
  });

  const title = el('input', { type:'text', value: t.title, class: 'title', title: t.title, spellcheck: false });
  title.addEventListener('change', async ()=>{
    const prev = t.title;
    t.title = title.value;
    try{ await api(`/api/tasks/${t.id}`, { method:'PUT', body: JSON.stringify({ title: title.value, description: t.description||'', quadrant: t.quadrant })}); }
    catch(e){ alert(e.message); t.title = prev; title.value = prev; }
  });

  const del = el('button', { class: 'btn', text:'Delete', onclick: async ()=>{
    const lang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
    const dict = TRANSLATIONS[TRANSLATIONS[lang]?lang:'en'];
    if (!confirm(dict.delete_confirm)) return;
    // Optimistic remove
    const parent = li.parentElement;
    const id = t.id;
    if (Array.isArray(window.__tasks_cache)) window.__tasks_cache = window.__tasks_cache.filter(x=>x.id!==id);
    if (parent) parent.removeChild(li);
    renderStats(window.__tasks_cache||[]);
    try{ await api(`/api/tasks/${id}`, { method:'DELETE' }); }
    catch(e){ alert(e.message); loadTasks(); }
  }});

  const li = el('li', { class:'task', draggable: true });
  li.dataset.id = t.id;
  const controls = el('div', { class:'controls' }, [del]);
  li.append(checkbox, title, controls);

  li.addEventListener('dragstart', ()=>{ li.classList.add('dragging'); });
  li.addEventListener('dragend', ()=>{ li.classList.remove('dragging'); });
  return li;
}

async function loadTasks(){
  const { tasks } = await api('/api/tasks');
  window.__tasks_cache = tasks;
  ['do_first','schedule','delegate','eliminate'].forEach(q => {
    const list = $(`#list-${q}`);
    list.innerHTML = '';
    tasks.filter(t=>t.quadrant===q).forEach(t=> list.append(taskItem(t)));
  });
  renderStats(tasks);
}

function setupDnD(){
  $$('.quadrant').forEach(q => {
    q.addEventListener('dragover', (e)=>{ e.preventDefault(); q.classList.add('dragover'); });
    q.addEventListener('dragleave', ()=> q.classList.remove('dragover'));
    q.addEventListener('drop', async (e)=>{
      e.preventDefault();
      q.classList.remove('dragover');
      const dragged = document.querySelector('.task.dragging');
      if (!dragged) return;
      const id = dragged.dataset.id;
      const quadrant = q.dataset.quadrant;
      // Optimistic DOM move
      const list = q.querySelector('ul');
      if (list) list.append(dragged);
      if (Array.isArray(window.__tasks_cache)){
        const t = window.__tasks_cache.find(x=>x.id===id);
        if (t) t.quadrant = quadrant;
        renderStats(window.__tasks_cache);
      }
      // Async persist
      try{ await api(`/api/tasks/${id}/move`, { method:'POST', body: JSON.stringify({ quadrant })}); }
      catch(err){ alert(err.message); loadTasks(); }
    });
  });
}

async function checkSession(){
  try{
    const { user } = await api('/api/auth/me');
    $('#usernameDisplay').textContent = user.username;
    $('#authSection').hidden = true;
    $('#appSection').hidden = false;
    $('#logoutBtn').hidden = false;
    await loadTasks();
  }catch{
    $('#authSection').hidden = false;
    $('#appSection').hidden = true;
    $('#logoutBtn').hidden = true;
  }
}

function setupAuth(){
  $('#authForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    $('#authError').textContent = '';
    const username = $('#username').value.trim();
    const password = $('#password').value;
    try{ await api('/api/auth/login', { method:'POST', body: JSON.stringify({ username, password })}); await checkSession(); }catch(err){ $('#authError').textContent = err.message; }
  });
  $('#signupBtn').addEventListener('click', async ()=>{
    $('#authError').textContent = '';
    const username = $('#username').value.trim();
    const password = $('#password').value;
    try{ await api('/api/auth/signup', { method:'POST', body: JSON.stringify({ username, password })}); await checkSession(); }catch(err){ $('#authError').textContent = err.message; }
  });
  $('#logoutBtn').addEventListener('click', async ()=>{
    await api('/api/auth/logout', { method:'POST' });
    $('#usernameDisplay').textContent = '';
    $('#authSection').hidden = false;
    $('#appSection').hidden = true;
    $('#logoutBtn').hidden = true;
  });
}

function setupCreate(){
  $('#newTaskForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const title = $('#newTaskTitle').value.trim();
    const quadrant = $('#newTaskQuadrant').value;
    if (!title) return;
    // Optimistic add
    const tempId = 'cid_' + Math.random().toString(36).slice(2);
    const task = { id: tempId, title, description:'', quadrant, completed: 0 };
    if (!Array.isArray(window.__tasks_cache)) window.__tasks_cache = [];
    window.__tasks_cache.unshift({ ...task });
    const list = document.querySelector(`#list-${quadrant}`);
    if (list) list.prepend(taskItem(task));
    renderStats(window.__tasks_cache);
    $('#newTaskTitle').value='';
    try{
      const { task: saved } = await api('/api/tasks', { method:'POST', body: JSON.stringify({ id: tempId, title, quadrant })});
      // Replace cache entry if needed (ids match because we sent id)
      const idx = window.__tasks_cache.findIndex(x=>x.id===tempId);
      if (idx !== -1) window.__tasks_cache[idx] = saved;
    }catch(err){
      alert(err.message);
      // Rollback UI
      window.__tasks_cache = window.__tasks_cache.filter(x=>x.id!==tempId);
      const elTmp = document.querySelector(`li.task[data-id="${tempId}"]`);
      if (elTmp && elTmp.parentElement) elTmp.parentElement.removeChild(elTmp);
      renderStats(window.__tasks_cache);
    }
  });
}

function setupThemeAndLang(){
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme) || THEMES.dark;
  setTheme(storedTheme);
  const themeBtn = $('#themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', ()=>{
    const next = (localStorage.getItem(STORAGE_KEYS.theme) || THEMES.dark) === THEMES.dark ? THEMES.light : THEMES.dark;
    setTheme(next);
  });
  const storedLang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
  applyLang(storedLang);
  const langSel = $('#languageSelect');
  if (langSel) langSel.addEventListener('change', (e)=>{
    applyLang(e.target.value);
    renderStats(window.__tasks_cache||[]);
  });
}

window.addEventListener('DOMContentLoaded', async ()=>{
  setupAuth();
  setupCreate();
  setupDnD();
  setupThemeAndLang();
  await checkSession();
});


