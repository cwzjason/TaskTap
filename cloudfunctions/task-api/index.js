const tcb = require('@cloudbase/node-sdk');

// Initialize CloudBase Node SDK (admin privileges in cloud function context)
const app = tcb.init({
  env: 'cwz-d2glf6xtm409cbb3a',
  region: 'ap-shanghai'
});
const db = app.database();

// JSON response helper for HTTP mode
function jsonResp(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(body)
  };
}

// Parse callFunction data
function parseAction(event) {
  // callFunction format: event.data contains the passed object
  const payload = event.data || event.body || event;
  if (typeof payload === 'string') {
    try { return JSON.parse(payload); } catch(e) { return {}; }
  }
  return payload;
}

// ==================== TASKS CRUD ====================
async function getTasks() {
  const res = await db.collection('tasks').orderBy('createdAt', 'desc').get();
  return { ok: true, data: res.data || [] };
}

async function addTask(data) {
  if (!data.title) return { ok: false, error: 'Title required' };
  const now = Date.now();
  const doc = {
    title: String(data.title).trim(),
    description: data.description || '',
    category: data.category || 'work',
    priority: data.priority || 'medium',
    dueDate: data.dueDate || '',
    dueTime: data.dueTime || '',
    completed: false,
    createdAt: now,
    updatedAt: now
  };
  const res = await db.collection('tasks').add(doc);
  return { ok: true, data: { _id: res.id, ...doc } };
}

async function updateTask(id, data) {
  const updateData = { updatedAt: Date.now() };
  if (data.title !== undefined) updateData.title = String(data.title).trim();
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.dueTime !== undefined) updateData.dueTime = data.dueTime;
  if (data.completed !== undefined) updateData.completed = !!data.completed;

  await db.collection('tasks').doc(id).update(updateData);
  return { ok: true, data: { _id: id, ...updateData } };
}

async function deleteTask(id) {
  await db.collection('tasks').doc(id).remove();
  return { ok: true, data: { deleted: id } };
}

// ==================== ALARMS CRUD ====================
async function getAlarms() {
  const res = await db.collection('alarms').orderBy('date', 'asc').orderBy('time', 'asc').get();
  return { ok: true, data: res.data || [] };
}

async function addAlarm(data) {
  if (!data.label || !data.date || !data.time) return { ok: false, error: 'Label, date and time required' };
  const doc = {
    label: String(data.label).trim(),
    date: String(data.date),
    time: String(data.time),
    dismissed: false,
    triggered: false
  };
  const res = await db.collection('alarms').add(doc);
  return { ok: true, data: { _id: res.id, ...doc } };
}

async function updateAlarm(id, data) {
  const updateData = {};
  if (data.label !== undefined) updateData.label = data.label;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.time !== undefined) updateData.time = data.time;
  if (data.dismissed !== undefined) updateData.dismissed = !!data.dismissed;
  if (data.triggered !== undefined) updateData.triggered = !!data.triggered;

  await db.collection('alarms').doc(id).update(updateData);
  return { ok: true, data: { _id: id, ...updateData } };
}

async function deleteAlarm(id) {
  await db.collection('alarms').doc(id).remove();
  return { ok: true, data: { deleted: id } };
}

// ==================== ROUTER ====================
exports.main = async function(event, context) {
  try {
    const method = (event.httpMethod || '').toUpperCase();
    const path = event.path || '';

    console.log('[task-api] Request:', JSON.stringify({ method, path, hasData: !!event.data }));

    // ===== HTTP MODE (for direct fetch/curl access) =====
    if (method && method !== '') {
      // CORS preflight
      if (method === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
      }

      let body = event.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }

      if (path === '/' || path === '/health' || path === '/api/health') {
        return jsonResp(200, { ok: true, service: 'task-api', version: '2.0' });
      }
      if (path === '/api/tasks' && method === 'GET') return jsonResp(200, await getTasks());
      if (path === '/api/tasks' && method === 'POST') return jsonResp(201, await addTask(body));
      if (path.match(/^\/api\/tasks\//) && method === 'PUT') {
        const id = path.split('/').pop();
        return jsonResp(200, await updateTask(id, body));
      }
      if (path.match(/^\/api\/tasks\//) && method === 'DELETE') {
        const id = path.split('/').pop();
        return jsonResp(200, await deleteTask(id));
      }
      if (path === '/api/alarms' && method === 'GET') return jsonResp(200, await getAlarms());
      if (path === '/api/alarms' && method === 'POST') return jsonResp(201, await addAlarm(body));
      if (path.match(/^\/api\/alarms\//) && method === 'PUT') {
        const id = path.split('/').pop();
        return jsonResp(200, await updateAlarm(id, body));
      }
      if (path.match(/^\/api\/alarms\//) && method === 'DELETE') {
        const id = path.split('/').pop();
        return jsonResp(200, await deleteAlarm(id));
      }
      return jsonResp(404, { ok: false, error: 'Not Found', path });
    }

    // ===== CALLFUNCTION MODE (from JS SDK app.callFunction) =====
    const actionData = parseAction(event);
    const action = actionData.action || '';
    console.log('[task-api] Action:', action);

    switch(action) {
      case 'health':
        return { ok: true, service: 'task-api', version: '2.0' };

      case 'getTasks': return await getTasks();
      case 'addTask':  return await addTask(actionData);

      case 'updateTask': return await updateTask(actionData.id, actionData);
      case 'deleteTask': return await deleteTask(actionData.id);

      case 'getAlarms': return await getAlarms();
      case 'addAlarm':  return await addAlarm(actionData);
      case 'updateAlarm': return await updateAlarm(actionData.id, actionData);
      case 'deleteAlarm': return await deleteAlarm(actionData.id);

      default:
        // If no action, maybe it's a direct call - try to figure out intent
        if (!action) {
          return { ok: true, service: 'task-api', version: '2.0', message: 'Use "action" parameter to specify operation' };
        }
        return { ok: false, error: 'Unknown action: ' + action };
    }

  } catch(err) {
    console.error('[task-api Error]', err);
    // Return format compatible with both modes
    if (event.httpMethod) return jsonResp(500, { ok: false, error: err.message });
    return { ok: false, error: err.message };
  }
};
