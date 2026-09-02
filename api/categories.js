// TaskTap Categories API - /api/categories
// GET    -> list current user's custom categories
// POST   -> create a category (body: { name, color })
// PUT    -> update a category (body: { id, name?, color?, sortOrder? }) - rename syncs tasks
// DELETE -> delete a category (body: { id }) - moves its tasks to built-in 'other'
const {
  supabase,
  send,
  ok,
  fail,
  getUserFromToken,
  getBearer
} = require('./_lib');

// Built-in category keys that cannot be shadowed by custom categories
const BUILTIN_KEYS = ['work', 'personal', 'health', 'finance', 'other'];

function rowToApi(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '',
    sortOrder: row.sort_order || 0
  };
}

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

  const now = Date.now();
  const body = req.body || {};

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('username', username)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      ok(res, { data: (data || []).map(rowToApi) });
      return;
    }

    if (req.method === 'POST') {
      const name = String(body.name || '').trim();
      if (!name) {
        fail(res, 400, '分类名称不能为空');
        return;
      }
      if (name.length > 30) {
        fail(res, 400, '分类名称过长（最多30字符）');
        return;
      }
      if (BUILTIN_KEYS.indexOf(name) !== -1) {
        fail(res, 400, '该名称与内置分类冲突');
        return;
      }

      // Check duplicate
      const { data: dup, error: dupErr } = await supabase
        .from('categories')
        .select('id')
        .eq('username', username)
        .eq('name', name)
        .limit(1);
      if (dupErr) throw dupErr;
      if (dup && dup[0]) {
        fail(res, 400, '该分类已存在');
        return;
      }

      const { data: maxRow, error: maxErr } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('username', username)
        .order('sort_order', { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;

      const sortOrder = (maxRow && maxRow[0] ? maxRow[0].sort_order : 0) + 1;
      const { data, error } = await supabase
        .from('categories')
        .insert({ username, name, color: String(body.color || ''), sort_order: sortOrder, created_at: now, updated_at: now })
        .select()
        .single();
      if (error) throw error;
      ok(res, { data: rowToApi(data) });
      return;
    }

    if (req.method === 'PUT') {
      const id = String(body.id || '');
      if (!id) {
        fail(res, 400, '缺少分类 id');
        return;
      }

      const { data: existing, error: selErr } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('username', username)
        .single();
      if (selErr || !existing) {
        fail(res, 404, '分类不存在');
        return;
      }

      const updates = {};
      if (body.name !== undefined) {
        const newName = String(body.name).trim();
        if (!newName) {
          fail(res, 400, '分类名称不能为空');
          return;
        }
        if (newName.length > 30) {
          fail(res, 400, '分类名称过长（最多30字符）');
          return;
        }
        if (BUILTIN_KEYS.indexOf(newName) !== -1) {
          fail(res, 400, '该名称与内置分类冲突');
          return;
        }
        if (newName !== existing.name) {
          // Check duplicate
          const { data: dup, error: dupErr } = await supabase
            .from('categories')
            .select('id')
            .eq('username', username)
            .eq('name', newName)
            .limit(1);
          if (dupErr) throw dupErr;
          if (dup && dup[0] && dup[0].id !== id) {
            fail(res, 400, '该分类已存在');
            return;
          }
          updates.name = newName;
          // Rename syncs existing tasks to the new category name
          const { error: taskErr } = await supabase
            .from('tasks')
            .update({ category: newName, updated_at: now })
            .eq('username', username)
            .eq('category', existing.name);
          if (taskErr) throw taskErr;
        }
      }
      if (body.color !== undefined) updates.color = String(body.color || '');
      if (body.sortOrder !== undefined) updates.sort_order = Number(body.sortOrder) || 0;
      updates.updated_at = now;

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      ok(res, { data: rowToApi(data) });
      return;
    }

    if (req.method === 'DELETE') {
      const id = String(body.id || '');
      if (!id) {
        fail(res, 400, '缺少分类 id');
        return;
      }

      const { data: existing, error: selErr } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('username', username)
        .single();
      if (selErr || !existing) {
        fail(res, 404, '分类不存在');
        return;
      }

      // Move existing tasks to built-in 'other' before removing the category
      const { error: taskErr } = await supabase
        .from('tasks')
        .update({ category: 'other', updated_at: now })
        .eq('username', username)
        .eq('category', existing.name);
      if (taskErr) throw taskErr;

      const { error: delErr } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('username', username);
      if (delErr) throw delErr;

      ok(res, { deleted: id });
      return;
    }

    fail(res, 405, 'Method not allowed');
  } catch (e) {
    console.error('[categories] error:', e.message);
    fail(res, 500, e.message || '操作失败');
  }
};
