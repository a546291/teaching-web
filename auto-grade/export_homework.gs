/**
 * 雲端郵件作業匯出程式（Google Apps Script）
 * 功能：搜尋學生寄來的作業信，檢查信中雲端資料夾連結，結果寫入新的 Google 試算表。
 * 權限：只讀取信件與雲端檔案，不寄信、不刪信、不修改任何檔案或權限。
 * 使用：修改下方「設定區」→ 選擇 exportHomework → 執行 → 從執行記錄開啟試算表 → 下載 CSV。
 */

// ===== 設定區 =====
const TEACHER_EMAIL = 'yourname@tmail.hc.edu.tw'; // 老師收件信箱
const START_DATE = '2026/09/01';                  // 只搜尋此日期之後的信（yyyy/MM/dd）
const KEYWORDS = '(作業 OR drive.google.com)';     // 信件須包含的關鍵字
const MAX_THREADS = 300;                          // 最多讀取的對話串數
// ==================

const IMAGE_PREFIX = 'image/';
const HEADER = [
  '寄件者', '寄件信箱', '日期', '主旨', '內文',
  '雲端連結', '連結類型', '匿名可開啟', '資料夾名稱',
  '一般存取權', '存取權限', '檔案數', '圖片檔名', '錯誤'
];

function exportHomework() {
  const query = `to:${TEACHER_EMAIL} after:${START_DATE} ${KEYWORDS} -from:me`;
  const threads = GmailApp.search(query, 0, MAX_THREADS);
  const rows = [HEADER];

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      const fromRaw = msg.getFrom();
      if (fromRaw.indexOf(TEACHER_EMAIL) >= 0) return;
      const body = msg.getPlainBody() || '';
      rows.push([
        fromRaw.replace(/<.*>/, '').replace(/"/g, '').trim(),
        (fromRaw.match(/<([^>]+)>/) || [null, fromRaw])[1],
        Utilities.formatDate(msg.getDate(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'),
        msg.getSubject(),
        body.slice(0, 2000)
      ].concat(inspectLink(body)));
    });
  });

  const ss = SpreadsheetApp.create('作業匯出_' +
    Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmm'));
  ss.getActiveSheet().getRange(1, 1, rows.length, HEADER.length).setValues(rows);
  Logger.log('完成，共 %s 封信。試算表：%s', rows.length - 1, ss.getUrl());
}

/** 找出內文第一個雲端連結，回傳：連結、類型、匿名可開啟、名稱、存取權、權限、檔案數、圖片檔名、錯誤 */
function inspectLink(body) {
  const m = body.match(/(?:https?:)?\/\/drive\.google\.com\/[^\s<>"）)]+/);
  if (!m) return ['', '無連結', '', '', '', '', '', '', ''];

  const link = m[0];
  const idMatch = link.match(/\/folders\/([\w-]+)/) || link.match(/\/d\/([\w-]+)/) || link.match(/[?&]id=([\w-]+)/);
  const kind = /\/folders\//.test(link) ? '資料夾' : (/\/file\/d\//.test(link) ? '檔案' : '其他');
  const result = [link, kind, anonymousCheck(link), '', '', '', '', '', ''];
  if (!idMatch) { result[8] = '找不到ID'; return result; }

  try {
    const item = kind === '檔案' ? DriveApp.getFileById(idMatch[1]) : DriveApp.getFolderById(idMatch[1]);
    result[3] = item.getName();
    result[4] = String(item.getSharingAccess());
    result[5] = String(item.getSharingPermission());
    if (kind !== '檔案') {
      const names = [];
      let count = 0;
      const files = item.getFiles();
      while (files.hasNext()) {
        const f = files.next();
        count++;
        if (f.getMimeType().indexOf(IMAGE_PREFIX) === 0) names.push(f.getName());
      }
      result[6] = count;
      result[7] = names.join(' | ');
    }
  } catch (e) {
    result[8] = String(e.message || e);
  }
  return result;
}

/** 以未登入狀態開啟連結：200 表示「知道連結的任何人均可檢視」 */
function anonymousCheck(link) {
  const url = link.indexOf('//') === 0 ? 'https:' + link : link;
  try {
    const res = UrlFetchApp.fetch(url, { followRedirects: false, muteHttpExceptions: true });
    const code = res.getResponseCode();
    const loc = String(res.getHeaders()['Location'] || '');
    if (code === 200) return '是';
    if (loc.indexOf('accounts.google.com') >= 0 || loc.indexOf('ServiceLogin') >= 0) return '否(需登入)';
    return '否(' + code + ')';
  } catch (e) {
    return '錯誤:' + e.message;
  }
}
