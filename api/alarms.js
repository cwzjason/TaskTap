// TaskTap Alarms API - /api/alarms
// GET    -> list current user's alarms
// POST   -> create an alarm
// PUT    -> update an alarm (body: { id, ...fields })
// DELETE -> delete an alarm (body: { id })
const {
  supabase,
  send,
  ok,
  fail,
  getUserFromToken,
  getBearer,
  alarmToApi,
  alarmToDb
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
        .from('alarms')
        .select('*')
        .eq('username', username)
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (error) throw error;
      // Frontend expects the cloud seed marker filtered out + non-dismissed only
      const filtered = (data || []).filter(function (doc) {
        return doc.label !== '__cloud_seeded__' && !doc.dismissed;
      });
      ok(res, { data: filtered.map(alarmToApi) });
      return;
    }

    if (req.method === 'POST') {
      const dbData = alarmToDb(req.body || {});
      const { data, error } = await supabase
        .from('alarms')
        .insert(Object.assign({ username }, dbData))
        .select()
        .single();
      if (error) throw error;
      ok(res, { data: alarmToApi(data) });
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = String(body.id || '');
      if (!id) {
        fail(res, 400, '缺少闹钟 id');
        return;
      }

      const { data: existing, error: selErr } = await supabase
        .from('alarms')
        .select('id')
        .eq('id', id)
        .eq('username', username)
        .single();
      if (selErr || !existing) {
        fail(res, 404, '闹钟不存在');
        return;
      }

      const { data, error } = await supabase
        .from('alarms')
        .update(alarmToDb(body))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      ok(res, { data: alarmToApi(data) });
      return;
    }

    if (req.method === 'DELETE') {
      const id = String((req.body && req.body.id) || req.query.id || '');
      if (!id) {
        fail(res, 400, '缺少闹钟 id');
        return;
      }
      const { error } = await supabase
        .from('alarms')
        .delete()
        .eq('id', id)
        .eq('username', username);
      if (error) throw error;
      ok(res, { deleted: id });
      return;
    }

    fail(res, 405, 'Method not allowed');
  } catch (e) {
    console.error('[alarms] error:', e.message);
    fail(res, 500, e.message || '操作失败');
  }
};
