const BASE = `${SUPABASE_URL}/rest/v1/todos`;

function getHeaders() {
  const session = getSession();
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${session?.access_token || SUPABASE_KEY}`,
    'Prefer': 'return=representation'
  };
}

const input = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const remaining = document.getElementById('remaining');
const clearDoneBtn = document.getElementById('clearDone');
const filterBtns = document.querySelectorAll('.filter-btn');

let todos = [];
let currentFilter = 'all';

async function loadTodos() {
  const res = await fetch(`${BASE}?order=created_at.asc`, { headers: getHeaders() });
  todos = await res.json();
  render();
}

async function addTodo() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const session = getSession();
  const res = await fetch(BASE, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text, done: false, user_id: session?.user?.id })
  });
  const [newTodo] = await res.json();
  todos.push(newTodo);
  render();
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const res = await fetch(`${BASE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ done: !todo.done })
  });
  const [updated] = await res.json();
  todos = todos.map(t => t.id === id ? updated : t);
  render();
}

async function deleteTodo(id) {
  await fetch(`${BASE}?id=eq.${id}`, { method: 'DELETE', headers: getHeaders() });
  todos = todos.filter(t => t.id !== id);
  render();
}

async function clearDone() {
  const doneIds = todos.filter(t => t.done).map(t => t.id);
  if (doneIds.length === 0) return;
  await fetch(`${BASE}?id=in.(${doneIds.join(',')})`, { method: 'DELETE', headers: getHeaders() });
  todos = todos.filter(t => !t.done);
  render();
}

function render() {
  const filtered = todos.filter(t => {
    if (currentFilter === 'active') return !t.done;
    if (currentFilter === 'done') return t.done;
    return true;
  });

  if (filtered.length === 0) {
    todoList.innerHTML = '<p class="empty-msg">Görev yok.</p>';
  } else {
    todoList.innerHTML = filtered.map(todo => `
      <li class="${todo.done ? 'done' : ''}" data-id="${todo.id}">
        <input type="checkbox" ${todo.done ? 'checked' : ''} />
        <span class="text">${escapeHtml(todo.text)}</span>
        <button class="delete-btn" title="Sil">✕</button>
      </li>
    `).join('');
  }

  const activeCount = todos.filter(t => !t.done).length;
  remaining.textContent = `${activeCount} görev kaldı`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

todoList.addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li) return;
  const id = Number(li.dataset.id);
  if (e.target.type === 'checkbox') toggleTodo(id);
  if (e.target.classList.contains('delete-btn')) deleteTodo(id);
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

addBtn.addEventListener('click', addTodo);
input.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
clearDoneBtn.addEventListener('click', clearDone);

initAuth();

const appScreen = document.getElementById('appScreen');
if (!appScreen.classList.contains('hidden')) {
  loadTodos();
} else {
  const observer = new MutationObserver(() => {
    if (!appScreen.classList.contains('hidden')) {
      observer.disconnect();
      loadTodos();
    }
  });
  observer.observe(appScreen, { attributes: true, attributeFilter: ['class'] });
}
