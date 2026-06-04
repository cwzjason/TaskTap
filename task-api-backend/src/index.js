const tcb = require('@cloudbase/node-sdk');

// Initialize CloudBase Node SDK (admin privileges, no auth needed)
const app = tcb.init({
  env: 'cwz-d2glf6xtm409cbb3a',
  region: 'ap-shanghai'
});
const db = app.database();

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

// JSON response helper
function jsonResp(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body)
  };
}

// Parse event body
function parseBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch(e) {
    return {};
  }
}

// Get path from event
function getPath(event) {
  // CloudRun function type: path might be in different locations
  return event.path || event.requestContext?.path || '/';
}

// Get HTTP method
function getMethod(event) {
  return event.httpMethod || event.requestContext?.method || 'GET';
}

// ==================== TASKS API ====================
async function handleTasks(method, path, body) {
  const tasksCol = db.collection('tasks');

  // GET /api/tasks - list all tasks
  if (method === 'GET') {
    const res = await tasksCol.orderBy('createdAt', 'desc').get();
    return jsonResp(200, { ok: true, data: res.data || [] });
  }

  // POST /api/tasks - create task
  if (method === 'POST') {
    const { title, description, category, priority, dueDate, dueTime, completed } = body;
    if (!title) return jsonResp(400, { ok: false, error: 'Title is required' });

    const now = Date.now();
    const doc = {
      title: String(title).trim(),
      description: description || '',
      category: category || 'work',
      priority: priority || 'medium',
      dueDate: dueDate || '',
      dueTime: dueTime || '',
      completed: !!completed,
      createdAt: now,
      updatedAt: now
    };
    const res = await tasksCol.add(doc);
    return jsonResp(201, { ok: true, data: { _id: res.id, ...doc } });
  }

  return jsonResp(405, { ok: false, error: 'Method not allowed' });
}

async function handleTaskById(method, id, body) {
  const tasksCol = db.collection('tasks');

  // PUT /api/tasks/:id - update task
  if (method === 'PUT') {
    const updateData = { updatedAt: Date.now() };
    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
    if (body.dueTime !== undefined) updateData.dueTime = body.dueTime;
    if (body.completed !== undefined) updateData.completed = !!body.completed;

    await tasksCol.doc(id).update(updateData);
    return jsonResp(200, { ok: true, data: { _id: id, ...updateData } });
  }

  // DELETE /api/tasks/:id - delete task
  if (method === 'DELETE') {
    await tasksCol.doc(id).remove();
    return jsonResp(200, { ok: true, data: { deleted: id } });
  }

  return jsonResp(405, { ok: false, error: 'Method not allowed' });
}

// ==================== ALARMS API ====================
async function handleAlarms(method, body) {
  const alarmsCol = db.collection('alarms');

  // GET /api/alarms - list all alarms
  if (method === 'GET') {
    const res = await alarmsCol.orderBy('date', 'asc').orderBy('time', 'asc').get();
    return jsonResp(200, { ok: true, data: res.data || [] });
  }

  // POST /api/alarms - create alarm
  if (method === 'POST') {
    const { label, date, time } = body;
    if (!label || !date || !time) return jsonResp(400, { ok: false, error: 'Label, date and time are required' });

    const doc = {
      label: String(label).trim(),
      date: String(date),
      time: String(time),
      dismissed: false,
      triggered: false
    };
    const res = await alarmsCol.add(doc);
    return jsonResp(201, { ok: true, data: { _id: res.id, ...doc } });
  }

  return jsonResp(405, { ok: false, error: 'Method not allowed' });
}

async function handleAlarmById(method, id, body) {
  const alarmsCol = db.collection('alarms');

  // PUT /api/alarms/:id - update alarm
  if (method === 'PUT') {
    const updateData = {};
    if (body.label !== undefined) updateData.label = body.label;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.time !== undefined) updateData.time = body.time;
    if (body.dismissed !== undefined) updateData.dismissed = !!body.dismissed;
    if (body.triggered !== undefined) updateData.triggered = !!body.triggered;

    await alarmsCol.doc(id).update(updateData);
    return jsonResp(200, { ok: true, data: { _id: id, ...updateData } });
  }

  // DELETE /api/alarms/:id - delete alarm
  if (method === 'DELETE') {
    await alarmsCol.doc(id).remove();
    return jsonResp(200, { ok: true, data: { deleted: id } });
  }

  return jsonResp(405, { ok: false, error: 'Method not allowed' });
}

// ==================== HEALTH CHECK ====================
function healthCheck() {
  return jsonResp(200, { ok: true, service: 'task-api-backend', version: '1.0.0', timestamp: new Date().toISOString() });
}

// ==================== ROUTER ====================
exports.main = async function(event, context) {
  try {
    // Handle CORS preflight
    const method = getMethod(event);
    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: corsHeaders(), body: '' };
    }

    const path = getPath(event);
    const body = parseBody(event);

    console.log(`[API] ${method} ${path}`);

    // Health check
    if (path === '/' || path === '/health' || path === '/api/health') {
      return healthCheck();
    }

    // Task routes
    if (path === '/api/tasks') {
      return await handleTasks(method, path, body);
    }
    const taskMatch = path.match(/^\/api\/tasks\/([a-zA-Z0-9]+)$/);
    if (taskMatch) {
      return await handleTaskById(method, taskMatch[1], body);
    }

    // Alarm routes
    if (path === '/api/alarms') {
      return await handleAlarms(method, body);
    }
    const alarmMatch = path.match(/^\/api\/alarms\/([a-zA-Z0-9]+)$/);
    if (alarmMatch) {
      return await handleAlarmById(method, alarmMatch[1], body);
    }

    // Not found
    return jsonResp(404, { ok: false, error: 'Not Found', path: path });

  } catch(err) {
    console.error('[API Error]', err);
    return jsonResp(500, { ok: false, error: err.message || 'Internal server error' });
  }
};
