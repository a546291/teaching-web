/* 雲端郵件作業評分核心：純函式，瀏覽器與 Node 共用 */
(function (root) {
  'use strict';

  var CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  var VARIANTS = { '啓': '啟', '温': '溫' };

  var GREETING_RE = /老師\s*[,，、]?\s*[您你]?\s*好|[您你]好\s*老師|親愛的老師/;
  var REASON_RE = /作業|功課|交|照片|圖片|風景|百齡樓|同心堂|二公橋|北門|校長|分享|因為|原因|檢視|查收|介紹/;
  var SIGN_RE = /敬上/;
  var URL_RE = /<[^>]*>|\S*(?:https?|tthps|:\/\/)\S*|drive\.google\.com\S*|\[image:[^\]]*\]/g;

  var DEFAULTS = {
    fullScore: 20,
    linkPenalty: 3,
    itemPenalty: 1,
    keepLatest: 2,
    week: 1,
    folderPrefix: '五年級資訊課'
  };

  function norm(text) {
    return String(text == null ? '' : text).trim().replace(/[啓温]/g, function (c) { return VARIANTS[c]; });
  }

  function escRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isBlank(v) {
    return v == null || String(v).trim() === '' || String(v).trim().toLowerCase() === 'nan';
  }

  function folderOk(folder, stu, cfg) {
    var re = new RegExp('^' + escRe(cfg.folderPrefix) + '-' + escRe(stu.cls) + '-0?' + stu.seat +
      '-' + escRe(norm(stu.name)) + '$');
    return re.test(norm(folder));
  }

  function subjectOk(subject, stu, cfg) {
    var weekAlt = '(?:' + cfg.week + (CN_NUM[cfg.week] ? '|' + CN_NUM[cfg.week] : '') + ')';
    var re = new RegExp('^' + escRe(stu.cls) + '-0?' + stu.seat + '-' + escRe(norm(stu.name)) +
      '-第' + weekAlt + '[週周]作業$');
    return re.test(norm(subject));
  }

  function linkIssue(r) {
    if (r['連結類型'] === '資料夾' && r['匿名可開啟'] === '是') return null;
    if (r['連結類型'] === '無連結' || isBlank(r['連結類型'])) return '內文無有效雲端連結';
    if (r['連結類型'] === '檔案') return '連結為單一檔案非資料夾';
    if (r['匿名可開啟'] !== '是') return '連結無法公開檢視(' + (r['匿名可開啟'] || '') + ')';
    return '連結無效';
  }

  /** 評一封信，回傳 { score, reasons[] } */
  function gradeMessage(r, stu, cfg) {
    var issues = [];
    var link = linkIssue(r);
    if (link) {
      issues.push([cfg.linkPenalty, link]);
    } else {
      if (!folderOk(r['資料夾名稱'], stu, cfg)) issues.push([cfg.itemPenalty, '資料夾名稱不符:' + norm(r['資料夾名稱'])]);
      if (isBlank(r['圖片檔名'])) issues.push([cfg.itemPenalty, '資料夾內無照片']);
    }

    var subject = isBlank(r['主旨']) ? '' : String(r['主旨']);
    if (!subjectOk(subject, stu, cfg)) issues.push([cfg.itemPenalty, '主旨格式不符:' + subject]);

    var body = isBlank(r['內文']) ? '' : String(r['內文']);
    if (!GREETING_RE.test(body)) issues.push([cfg.itemPenalty, '缺稱呼']);
    var textOnly = body.replace(URL_RE, ' ').replace(new RegExp(GREETING_RE.source, 'g'), ' ').replace(/\S*敬上/g, ' ');
    if (!REASON_RE.test(textOnly)) issues.push([cfg.itemPenalty, '缺事由說明']);
    if (!SIGN_RE.test(body)) issues.push([cfg.itemPenalty, '缺署名(敬上)']);

    var deduct = issues.reduce(function (s, it) { return s + it[0]; }, 0);
    return { score: cfg.fullScore - deduct, reasons: issues.map(function (it) { return it[1]; }) };
  }

  function parseDate(s) {
    var p = String(s || '').match(/\d+/g) || [];
    return new Date(+p[0] || 0, (+p[1] || 1) - 1, +p[2] || 1, +p[3] || 0, +p[4] || 0, +p[5] || 0);
  }

  function accountOf(email) {
    return String(email || '').split('@')[0].trim().toLowerCase();
  }

  /**
   * rows：匯出 CSV 的列物件陣列；roster：{ 帳號小寫: {cls, seat, name} }
   * 回傳 { all, best, unmatched }
   */
  function gradeAll(rows, roster, userCfg) {
    var cfg = Object.assign({}, DEFAULTS, userCfg || {});
    var all = [];
    var unmatched = {};
    rows.forEach(function (r) {
      var acct = accountOf(r['寄件信箱']);
      if (!acct) return;
      var stu = roster[acct];
      if (!stu) { unmatched[acct] = true; return; }
      var g = gradeMessage(r, stu, cfg);
      all.push({ account: acct, cls: stu.cls, seat: stu.seat, name: stu.name,
        date: parseDate(r['日期']), dateText: String(r['日期'] || ''),
        subject: isBlank(r['主旨']) ? '' : String(r['主旨']),
        score: g.score, reasons: g.reasons.join('；') });
    });

    var byAcct = {};
    all.forEach(function (m) { (byAcct[m.account] = byAcct[m.account] || []).push(m); });
    var best = Object.keys(byAcct).map(function (acct) {
      var latest = byAcct[acct].slice().sort(function (a, b) { return b.date - a.date; }).slice(0, cfg.keepLatest);
      return latest.reduce(function (top, m) { return m.score > top.score ? m : top; });
    });
    var byClassSeat = function (a, b) { return a.cls === b.cls ? a.seat - b.seat : (a.cls < b.cls ? -1 : 1); };
    best.sort(byClassSeat);
    all.sort(function (a, b) { return byClassSeat(a, b) || a.date - b.date; });
    return { all: all, best: best, unmatched: Object.keys(unmatched).sort() };
  }

  /** 欄位字母 ↔ 欄號 */
  function colToNum(letters) {
    return String(letters).toUpperCase().split('').reduce(function (n, c) { return n * 26 + c.charCodeAt(0) - 64; }, 0);
  }
  function numToCol(n) {
    var s = '';
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }

  function cellText(cell) {
    var v = cell.value;
    if (v && typeof v === 'object') {
      if (v.richText) return v.richText.map(function (t) { return t.text; }).join('');
      if (v.result != null) return String(v.result);
      if (v.text != null) return String(v.text);
    }
    return v == null ? '' : String(v).trim();
  }

  /** 找第 1 列的「座號」「姓名」「帳號」欄號 */
  function headerCols(ws) {
    var cols = {};
    ws.getRow(1).eachCell(function (cell, n) {
      var t = cellText(cell);
      if (t === '座號' || t === '姓名' || t === '帳號') cols[t] = n;
    });
    return cols['座號'] && cols['姓名'] && cols['帳號'] ? cols : null;
  }

  /** 讀 ExcelJS 點名簿：每個工作表 = 一班，工作表名稱 = 班級 */
  function readRoster(wb) {
    var roster = {};
    wb.eachSheet(function (ws) {
      var cols = headerCols(ws);
      if (!cols) return;
      ws.eachRow(function (row, r) {
        if (r === 1) return;
        var acct = cellText(row.getCell(cols['帳號'])).toLowerCase();
        var seat = parseInt(cellText(row.getCell(cols['座號'])), 10);
        if (!acct || isNaN(seat)) return;
        roster[acct] = { cls: ws.name, seat: seat, name: cellText(row.getCell(cols['姓名'])) };
      });
    });
    return roster;
  }

  /** 決定寫入欄：指定欄空白或同名則用它，否則往右找第一個空白欄 */
  function pickColumn(ws, preferred, header) {
    var col = colToNum(preferred);
    var isFree = function (c) { var t = cellText(ws.getRow(1).getCell(c)); return t === '' || t === header; };
    if (isFree(col)) return col;
    col = Math.max(col, ws.columnCount) + 1;
    while (!isFree(col)) col++;
    return col;
  }

  /** 成績寫回點名簿，回傳每班寫入報告 */
  function writeScores(wb, best, opts) {
    var map = {};
    best.forEach(function (b) { map[b.account] = b; });
    var report = [];
    wb.eachSheet(function (ws) {
      var cols = headerCols(ws);
      if (!cols) return;
      var col = pickColumn(ws, opts.column, opts.header);
      var head = ws.getRow(1).getCell(col);
      var ref = ws.getRow(1).getCell(Math.max(1, col - 1));
      head.value = opts.header;
      if (ref.style) head.style = JSON.parse(JSON.stringify(ref.style));
      var filled = 0, total = 0;
      ws.eachRow(function (row, r) {
        if (r === 1) return;
        var acct = cellText(row.getCell(cols['帳號'])).toLowerCase();
        if (!acct) return;
        total++;
        var hit = map[acct];
        var seat = parseInt(cellText(row.getCell(cols['座號'])), 10);
        if (hit && hit.cls === ws.name && hit.seat === seat) { row.getCell(col).value = hit.score; filled++; }
      });
      report.push({ cls: ws.name, column: numToCol(col), filled: filled, total: total,
        moved: numToCol(col) !== String(opts.column).toUpperCase() });
    });
    return report;
  }

  var api = { DEFAULTS: DEFAULTS, norm: norm, gradeMessage: gradeMessage, gradeAll: gradeAll,
    parseDate: parseDate, accountOf: accountOf, colToNum: colToNum, numToCol: numToCol,
    readRoster: readRoster, writeScores: writeScores };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GraderCore = api;
})(this);
