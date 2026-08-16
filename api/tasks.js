// TaskTap Tasks API - /api/tasks
// GET    -> list current user's tasks
// POST   -> create a task
// PUT    -> update a task (body: { id, ...fields })
// DELETE -> delete a task (body: { id })
const {
  supabase,
  send,
  ok,
  fail,
  getUserFromToken,
  getBearer,
  taskToApi,
  taskToDb
} = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }

  const username = await getUserFromToken(getBearer(req));
  if (!username) {
    fail(res, 401, '未登录或登录已过期');
    return;
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false });
      if (error) throw error;
      ok(res, { data: (data || []).map(taskToApi) });
      return;
    }

    if (req.method === 'POST') {
      const now = Date.now();
      const dbData = taskToDb(req.body || {});
      const { data, error } = await supabase
        .from('tasks')
        .insert(Object.assign({ username, created_at: now, updated_at: now }, dbData))
        .select()
        .single();
      if (error) throw error;
      ok(res, { data: taskToApi(data) });
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = String(body.id || '');
      if (!id) {
        fail(res, 400, '缺少任务 id');
        return;
      }

      const dbData = taskToDb(body);
      // Only allow updating own task
      const { data: existing, error: selErr } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', id)
        .eq('username', username)
        .single();
      if (selErr || !existing) {
        fail(res, 404, '任务不存在');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(Object.assign({ updated_at: Date.now() }, dbData))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      ok(res, { data: taskToApi(data) });
      return;
    }

    if (req.method === 'DELETE') {
      const id = String((req.body && req.body.id) || req.query.id || '');
      if (!id) {
        fail(res, 400, '缺少任务 id');
        return;
      }
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('username', username);
      if (error) throw error;
      ok(res, { deleted: id });
      return;
    }

    fail(res, 405, 'Method not allowed');
  } catch (e) {
    console.error('[tasks] error:', e.message);
    fail(res, 500, e.message || '操作失败');
  }
};
