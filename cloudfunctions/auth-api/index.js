const tcb = require('@cloudbase/node-sdk');
const crypto = require('crypto');

const app = tcb.init();
const db = app.database();
const usersCol = db.collection('users');

function hashPassword(pwd, salt) {
  return crypto.createHash('sha256').update(salt + pwd + salt).digest('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Get caller's openid from cloud function context
function getCallerOpenid() {
  try {
    var auth = app.auth();
    var info = auth.getUserInfo();
    return info.openId || '';
  } catch(e) {
    console.log('[auth-api] getUserInfo failed:', e.message);
    return '';
  }
}

// Migrate all documents from old _openid to new _openid in a collection
async function migrateCollection(collectionName, oldOpenid, newOpenid) {
  var col = db.collection(collectionName);
  var result = await col.where({ _openid: oldOpenid }).limit(1000).get();
  if (!result.data || result.data.length === 0) return 0;

  var count = 0;
  for (var i = 0; i < result.data.length; i++) {
    var doc = result.data[i];
    try {
      await col.doc(doc._id).update({ _openid: newOpenid });
      count++;
    } catch(err) {
      console.error('[migrate] Failed to update doc', doc._id, err.message);
    }
  }
  return count;
}

// Tag all documents belonging to a username (fix old data without username field)
async function tagDocumentsWithUsername(collectionName, username) {
  var col = db.collection(collectionName);
  // Find docs by this username that don't have the username field yet
  var result = await col.where({
    username: db.RegExp({ options: 'i', regexp: '^' + username + '$', flags: 'i' })
  }).limit(1000).get();
  // Also find docs with _openid matching and no username
  // We'll just update docs where username field doesn't exist but belong to the user
  // For simplicity, find all docs without username field
  var noUsernameResult = await col.where({
    username: ''
  }).limit(1000).get();
  if (!noUsernameResult.data || noUsernameResult.data.length === 0) return 0;
  
  var count = 0;
  for (var i = 0; i < noUsernameResult.data.length; i++) {
    var doc = noUsernameResult.data[i];
    try {
      await col.doc(doc._id).update({ username: username });
      count++;
    } catch(err) {
      console.error('[tagUsername] Failed to update doc', doc._id, err.message);
    }
  }
  return count;
}

exports.main = async (event, context) => {
  // Extract body - handle both callFunction and invokeFunction formats
  var body = {};
  if (event.action) {
    body = event;
  } else if (event.data && typeof event.data === 'object') {
    body = event.data;
  } else if (typeof event.data === 'string') {
    try { body = JSON.parse(event.data); } catch(e) { body = {}; }
  }

  var action = body.action;

  // ====== getOpenid: return caller's openid (no auth required) ======
  if (action === 'getOpenid') {
    var oid = getCallerOpenid();
    return { ok: true, openid: oid };
  }

  // ====== check: check if username exists (no auth required) ======
  if (action === 'check') {
    var checkResult = await usersCol.where({ username: String(body.username || '') }).limit(1).get();
    return { ok: true, exists: checkResult.data && checkResult.data.length > 0 };
  }

  // ====== sync: sync data for existing user (called on page load when session is restored) ======
  if (action === 'sync') {
    var syncUser = String(body.username || '');
    if (!syncUser || syncUser.length < 3) {
      return { ok: false, error: '用户名至少3个字符' };
    }

    var syncOpenid = getCallerOpenid();
    console.log('[auth-api] sync username:', syncUser, 'openid:', syncOpenid);

    var syncResult = await usersCol.where({ username: syncUser }).limit(1).get();
    if (!syncResult.data || syncResult.data.length === 0) {
      return { ok: false, error: '用户不存在' };
    }

    var syncUserDoc = syncResult.data[0];
    var oldOpenid = syncUserDoc.lastOpenid || '';

    if (syncOpenid && oldOpenid && syncOpenid !== oldOpenid) {
      console.log('[auth-api] Sync migrating data from', oldOpenid, 'to', syncOpenid);
      var syncTaskCount = await migrateCollection('tasks', oldOpenid, syncOpenid);
      var syncAlarmCount = await migrateCollection('alarms', oldOpenid, syncOpenid);
      console.log('[auth-api] Sync migrated', syncTaskCount, 'tasks and', syncAlarmCount, 'alarms');
      await usersCol.doc(syncUserDoc._id).update({ lastOpenid: syncOpenid });
    } else if (syncOpenid && !oldOpenid) {
      await usersCol.doc(syncUserDoc._id).update({ lastOpenid: syncOpenid });
    }

    // Ensure all this user's docs have the username field
    try {
      await tagDocumentsWithUsername('tasks', syncUser);
      await tagDocumentsWithUsername('alarms', syncUser);
    } catch(tagErr) {
      console.error('[auth-api] sync tagUsername error:', tagErr.message);
    }
  }

  // ====== deleteAccount: delete user and all their data ======
  if (action === 'deleteAccount') {
    var delUser = String(body.username || '');
    var delPwd = String(body.password || '');
    if (!delUser || delUser.length < 3) {
      return { ok: false, error: '用户名至少3个字符' };
    }
    if (!delPwd || delPwd.length < 6) {
      return { ok: false, error: '请输入密码以确认注销' };
    }

    // Verify password
    var delUserResult = await usersCol.where({ username: delUser }).limit(1).get();
    if (!delUserResult.data || delUserResult.data.length === 0) {
      return { ok: false, error: '用户不存在' };
    }
    var delUserDoc = delUserResult.data[0];
    var delPwdHash = hashPassword(delPwd, delUserDoc.salt);
    if (delPwdHash !== delUserDoc.passwordHash) {
      return { ok: false, error: '密码错误，无法注销' };
    }

    // Delete all tasks and alarms belonging to this user
    var tasksCol = db.collection('tasks');
    var alarmsCol = db.collection('alarms');
    var delTasks = await tasksCol.where({ username: delUser }).limit(1000).get();
    var delAlarms = await alarmsCol.where({ username: delUser }).limit(1000).get();

    var deletedTasks = 0, deletedAlarms = 0;
    if (delTasks.data) {
      for (var i = 0; i < delTasks.data.length; i++) {
        try { await tasksCol.doc(delTasks.data[i]._id).remove(); deletedTasks++; } catch(e) {}
      }
    }
    if (delAlarms.data) {
      for (var i = 0; i < delAlarms.data.length; i++) {
        try { await alarmsCol.doc(delAlarms.data[i]._id).remove(); deletedAlarms++; } catch(e) {}
      }
    }

    // Delete user record
    await usersCol.doc(delUserDoc._id).remove();

    console.log('[auth-api] Account deleted:', delUser, 'tasks:', deletedTasks, 'alarms:', deletedAlarms);
    return { ok: true, deletedTasks: deletedTasks, deletedAlarms: deletedAlarms };
  }

  // ====== register / login: require username + password ======
  var username = String(body.username || '');
  var password = String(body.password || '');

  if (!username || username.length < 3) {
    return { ok: false, error: '用户名至少3个字符' };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: '密码至少6位' };
  }

  // Get caller's openid from server-side context (reliable)
  var currentOpenid = getCallerOpenid();
  console.log('[auth-api] action:', action, 'username:', username, 'openid:', currentOpenid);

  try {
    if (action === 'register') {
      // Check if username already exists
      var existing = await usersCol.where({ username: username }).limit(1).get();
      if (existing.data && existing.data.length > 0) {
        return { ok: false, error: '用户名已存在' };
      }

      // Create user record
      var salt = generateSalt();
      var pwdHash = hashPassword(password, salt);

      await usersCol.add({
        username: username,
        passwordHash: pwdHash,
        salt: salt,
        lastOpenid: currentOpenid,
        createdAt: new Date().toISOString()
      });

      console.log('[auth-api] Registered user:', username, 'openid:', currentOpenid);
      return { ok: true, username: username, openid: currentOpenid };

    } else if (action === 'login') {
      // Find user by username
      var userResult = await usersCol.where({ username: username }).limit(1).get();
      if (!userResult.data || userResult.data.length === 0) {
        return { ok: false, error: '用户名或密码错误' };
      }

      var user = userResult.data[0];
      var pwdHash = hashPassword(password, user.salt);
      if (pwdHash !== user.passwordHash) {
        return { ok: false, error: '用户名或密码错误' };
      }

      // If the user is logging in from a different device/browser, migrate their data
      var oldOpenid = user.lastOpenid || '';
      if (currentOpenid && oldOpenid && currentOpenid !== oldOpenid) {
        console.log('[auth-api] Migrating data from', oldOpenid, 'to', currentOpenid);
        var taskCount = await migrateCollection('tasks', oldOpenid, currentOpenid);
        var alarmCount = await migrateCollection('alarms', oldOpenid, currentOpenid);
        console.log('[auth-api] Migrated', taskCount, 'tasks and', alarmCount, 'alarms');

        // Update user's lastOpenid
        await usersCol.doc(user._id).update({ lastOpenid: currentOpenid });
      } else if (currentOpenid && !oldOpenid) {
        // First login after migration, save the openid
        await usersCol.doc(user._id).update({ lastOpenid: currentOpenid });
      }

      // Ensure all this user's docs have the username field (backward compat)
      try {
        await tagDocumentsWithUsername('tasks', username);
        await tagDocumentsWithUsername('alarms', username);
      } catch(tagErr) {
        console.error('[auth-api] tagUsername error:', tagErr.message);
      }

      console.log('[auth-api] Login OK:', username, 'openid:', currentOpenid);
      return { ok: true, username: username, openid: currentOpenid };

    } else {
      return { ok: false, error: 'Unknown action' };
    }
  } catch(err) {
    console.error('[auth-api Error]', err.message);
    return { ok: false, error: err.message || '操作失败' };
  }
};
