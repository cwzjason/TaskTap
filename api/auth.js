// TaskTap Auth API - POST /api/auth
// Actions: register, login, check, deleteAccount
const {
  supabase,
  hashPassword,
  generateSalt,
  send,
  ok,
  fail,
  getUserByUsername,
  createSession
} = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }
  if (req.method !== 'POST') {
    fail(res, 405, 'Method not allowed');
    return;
  }

  const body = req.body || {};
  const action = body.action;

  // ====== check: does the username exist? ======
  if (action === 'check') {
    try {
      const user = await getUserByUsername(String(body.username || ''));
      ok(res, { exists: !!user });
    } catch (e) {
      fail(res, 500, e.message);
    }
    return;
  }

  const username = String(body.username || '');
  const password = String(body.password || '');

  if (!username || username.length < 3) {
    fail(res, 400, '用户名至少3个字符');
    return;
  }
  if (!password || password.length < 6) {
    fail(res, 400, '密码至少6位');
    return;
  }

  try {
    if (action === 'register') {
      // Check duplicate
      const existing = await getUserByUsername(username);
      if (existing) {
        fail(res, 400, '用户名已存在');
        return;
      }

      const salt = generateSalt();
      const pwdHash = hashPassword(password, salt);

      const { error } = await supabase.from('users').insert({
        username,
        password_hash: pwdHash,
        salt,
        created_at: new Date().toISOString()
      });
      if (error) throw error;

      const token = await createSession(username);
      ok(res, { username, token });
      return;
    }

    if (action === 'login') {
      const user = await getUserByUsername(username);
      if (!user) {
        fail(res, 401, '用户名或密码错误');
        return;
      }

      const pwdHash = hashPassword(password, user.salt);
      if (pwdHash !== user.password_hash) {
        fail(res, 401, '用户名或密码错误');
        return;
      }

      const token = await createSession(username);
      ok(res, { username, token });
      return;
    }

    if (action === 'deleteAccount') {
      const user = await getUserByUsername(username);
      if (!user) {
        fail(res, 401, '用户不存在');
        return;
      }

      const pwdHash = hashPassword(password, user.salt);
      if (pwdHash !== user.password_hash) {
        fail(res, 401, '密码错误，无法注销');
        return;
      }

      // Delete user's tasks, alarms, sessions, then the user
      await supabase.from('tasks').delete().eq('username', username);
      await supabase.from('alarms').delete().eq('username', username);
      await supabase.from('sessions').delete().eq('username', username);
      await supabase.from('users').delete().eq('username', username);

      ok(res, { deleted: username });
      return;
    }

    fail(res, 400, 'Unknown action');
  } catch (e) {
    console.error('[auth] error:', e.message);
    fail(res, 500, e.message || '操作失败');
  }
};
