// Shared helpers for TaskTap API (Vercel Serverless + Supabase)
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ---- Password hashing (SHA256 + salt) ----
function hashPassword(pwd, salt) {
  return crypto.createHash('sha256').update(salt + pwd + salt).digest('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// ---- Response helpers ----
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function send(res, status, body) {
  setCors(res);
  res.status(status).json(body);
}

function ok(res, data) {
  send(res, 200, Object.assign({ ok: true }, data || {}));
}

function fail(res, status, error) {
  send(res, status, { ok: false, error: error || '操作失败' });
}

// ---- Users ----
async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}

// ---- Sessions (token auth) ----
async function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  const { error } = await supabase.from('sessions').insert({ token, username });
  if (error) throw error;
  return token;
}

async function getUserFromToken(token) {
  if (!token) return null;
  const { data, error } = await supabase
    .from('sessions')
    .select('username')
    .eq('token', token)
    .limit(1);
  if (error) return null;
  return data && data[0] ? data[0].username : null;
}

function getBearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

// ---- Task / Alarm row mapping (snake_case DB -> camelCase used by frontend) ----
function taskToApi(row) {
  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'work',
    priority: row.priority || 'medium',
    dueDate: row.due_date || '',
    dueTime: row.due_time || '',
    completed: !!row.completed,
    checkInEnabled: !!row.check_in_enabled,
    checkInGoal: Number(row.check_in_goal) || 0,
    checkInMode: row.check_in_mode || 'daily',
    checkInProgress: Number(row.check_in_progress) || 0,
    checkInHistory: row.check_in_history || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function taskToDb(data) {
  const out = {};
  if (data.title !== undefined) out.title = String(data.title).trim();
  if (data.description !== undefined) out.description = data.description;
  if (data.category !== undefined) out.category = data.category;
  if (data.priority !== undefined) out.priority = data.priority;
  if (data.dueDate !== undefined) out.due_date = data.dueDate;
  if (data.dueTime !== undefined) out.due_time = data.dueTime;
  if (data.completed !== undefined) out.completed = !!data.completed;
  if (data.checkInEnabled !== undefined) out.check_in_enabled = !!data.checkInEnabled;
  if (data.checkInGoal !== undefined) out.check_in_goal = Number(data.checkInGoal) || 0;
  if (data.checkInMode !== undefined) out.check_in_mode = data.checkInMode;
  if (data.checkInProgress !== undefined) out.check_in_progress = Number(data.checkInProgress) || 0;
  if (data.checkInHistory !== undefined) out.check_in_history = Array.isArray(data.checkInHistory) ? data.checkInHistory : [];
  return out;
}

function alarmToApi(row) {
  return {
    _id: row.id,
    id: row.id,
    label: row.label || '',
    date: row.date || '',
    time: row.time || '',
    dismissed: !!row.dismissed,
    triggered: !!row.triggered
  };
}

function alarmToDb(data) {
  return {
    label: String(data.label || '').trim(),
    date: data.date || '',
    time: data.time || '',
    dismissed: !!data.dismissed,
    triggered: !!data.triggered
  };
}

module.exports = {
  supabase,
  hashPassword,
  generateSalt,
  send,
  ok,
  fail,
  getUserByUsername,
  createSession,
  getUserFromToken,
  getBearer,
  taskToApi,
  taskToDb,
  alarmToApi,
  alarmToDb
};
