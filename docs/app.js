document.addEventListener('DOMContentLoaded', () => {
  /* ── State ── */
  let lines = JSON.parse(localStorage.getItem('td_lines') || '[]');
  let deadlines = JSON.parse(localStorage.getItem('td_deadlines') || '[]');
  let dlFilter = 'all';

  const typeLabel = { train: '電車', subway: '地下鉄', bus: 'バス' };
  const typeClass = { train: 'badge-train', subway: 'badge-subway', bus: 'badge-bus' };
  const typeIcon  = { train: 'ti-train', subway: 'ti-train', bus: 'ti-bus' };
  const dlTypeLabel = { report: 'レポート', exam: '試験', assignment: '課題', other: 'その他' };

  /* ── DOM Elements ── */
  const topDate = document.getElementById('topDate');
  const sumLines = document.getElementById('sumLines');
  const sumDelays = document.getElementById('sumDelays');
  const sumUrgent = document.getElementById('sumUrgent');
  const sumTotal = document.getElementById('sumTotal');

  // Tabs
  const btnTabTransit = document.getElementById('btn-tab-transit');
  const btnTabDeadline = document.getElementById('btn-tab-deadline');
  const tabTransitSection = document.getElementById('tab-transit');
  const tabDeadlineSection = document.getElementById('tab-deadline');

  // Transit
  const lineInput = document.getElementById('lineInput');
  const typeSelect = document.getElementById('typeSelect');
  const btnAddLine = document.getElementById('btnAddLine');
  const transitList = document.getElementById('transitList');

  // Deadline
  const dlTitle = document.getElementById('dlTitle');
  const dlSubject = document.getElementById('dlSubject');
  const dlDate = document.getElementById('dlDate');
  const dlType = document.getElementById('dlType');
  const btnAddDL = document.getElementById('btnAddDL');
  const deadlineList = document.getElementById('deadlineList');
  const filterBtns = document.querySelectorAll('.filter-row .filter-btn');

  /* ── Search URL builder ── */
  function searchURL(name, type) {
    const q = encodeURIComponent(name + ' 運行情報');
    const urls = [];

    // 公式サイトマッピング
    const JRE = 'https://traininfo.jreast.co.jp/train_info/kanto.aspx';
    const METRO = 'https://www.tokyometro.jp/unkou/index.html';
    const TOEI  = 'https://www.kotsu.metro.tokyo.jp/subway/unkou.html';
    const map = {
      '山手線': JRE, '中央線': JRE, '京浜東北線': JRE, '総武線': JRE,
      '東海道線': JRE, '横須賀線': JRE, '埼京線': JRE, '常磐線': JRE,
      '南武線': JRE, '横浜線': JRE, '武蔵野線': JRE, '宇都宮線': JRE,
      '高崎線': JRE, '湘南新宿ライン': JRE, '上野東京ライン': JRE,
      'JR東日本': JRE,
      '東京メトロ': METRO, '銀座線': METRO, '丸ノ内線': METRO,
      '日比谷線': METRO, '東西線': METRO, '千代田線': METRO,
      '有楽町線': METRO, '半蔵門線': METRO, '南北線': METRO, '副都心線': METRO,
      '都営浅草線': TOEI, '都営三田線': TOEI, '都営新宿線': TOEI, '都営大江戸線': TOEI,
      '東急': 'https://www.tokyu.co.jp/railway/traffic_info/',
      '小田急': 'https://www.odakyu.jp/train/unkou/',
      '京急': 'https://www.keikyu.co.jp/train/operation/',
      '西武': 'https://www.seiburailway.jp/railways/operation/',
      '東武': 'https://www.tobu.co.jp/train/operation/',
      '京王': 'https://www.keio.co.jp/train/operation/',
      '相鉄': 'https://www.sotetsu.co.jp/train/operation/',
      '京成': 'https://www.keisei.co.jp/keisei/tetudou/unkou/index.php',
      '阪急': 'https://rail.hankyu.co.jp/railinfo/delay',
      'JR西日本': 'https://trafficinfo.westjr.co.jp/',
      'JR東海': 'https://traininfo.jr-central.co.jp/',
      'JR九州': 'https://www.jrkyushu.co.jp/train/info/',
      'JR北海道': 'https://www.jrhokkaido.co.jp/network/trafficinfo/',
      '名古屋市営地下鉄': 'https://www.kotsu.city.nagoya.jp/jp/pc/information/',
      '大阪メトロ': 'https://subway.osakametro.co.jp/train_info/',
      '福岡市地下鉄': 'https://subway.city.fukuoka.lg.jp/sp/train_info/',
      '札幌市営地下鉄': 'https://www.city.sapporo.jp/st/',
    };

    // 部分一致
    for (const [key, url] of Object.entries(map)) {
      if (name.includes(key) || key.includes(name)) {
        urls.push({ label: '公式運行情報', url });
        break;
      }
    }

    // Yahoo!路線
    urls.push({ label: 'Yahoo!路線', url: 'https://transit.yahoo.co.jp/traininfo/area/4/' });
    // Google検索
    urls.push({ label: 'Google検索', url: `https://www.google.com/search?q=${q}` });

    return urls;
  }

  /* ── Persist ── */
  function saveLines() { localStorage.setItem('td_lines', JSON.stringify(lines)); }
  function saveDeadlines() { localStorage.setItem('td_deadlines', JSON.stringify(deadlines)); }

  /* ── Init ── */
  const d = new Date();
  topDate.textContent = d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  dlDate.min = new Date().toISOString().split('T')[0];
  
  renderTransit();
  renderDeadlines();
  updateSummary();

  /* ── Tabs ── */
  btnTabTransit.addEventListener('click', () => {
    btnTabTransit.classList.add('active');
    btnTabDeadline.classList.remove('active');
    tabTransitSection.classList.add('active');
    tabDeadlineSection.classList.remove('active');
  });

  btnTabDeadline.addEventListener('click', () => {
    btnTabTransit.classList.remove('active');
    btnTabDeadline.classList.add('active');
    tabTransitSection.classList.remove('active');
    tabDeadlineSection.classList.add('active');
  });

  /* ── Transit Logic ── */
  function renderTransit() {
    if (!lines.length) {
      transitList.innerHTML = `<div class="empty"><i class="ti ti-train-off"></i>路線がまだ登録されていません<small>上のフォームから追加してください</small></div>`;
      return;
    }
    
    transitList.innerHTML = lines.map((line, i) => {
      const links = searchURL(line.name, line.type);
      const linksHTML = links.map(l =>
        `<a class="ext-link" href="${l.url}" target="_blank" rel="noopener"><i class="ti ti-external-link" style="font-size:12px"></i>${esc(l.label)}</a>`
      ).join('');

      const st = line.status || 'unknown';
      const noteVal = esc(line.note || '');
      const statusDisplay = st === 'normal'
        ? `<span class="info-pill pill-normal"><span class="status-dot dot-normal"></span>平常運転</span>`
        : st === 'delay'
        ? `<span class="info-pill pill-delay"><span class="status-dot dot-delay"></span>遅延あり${line.note ? ' — ' + noteVal : ''}</span>`
        : st === 'stop'
        ? `<span class="info-pill pill-stop"><span class="status-dot dot-stop"></span>運転見合わせ${line.note ? ' — ' + noteVal : ''}</span>`
        : `<span style="font-size:13px;color:var(--text-tertiary)">未確認 — 下のリンクで確認後、ステータスをセットしてください</span>`;

      return `<div class="transit-card" data-index="${i}">
        <div class="tc-header">
          <span class="tc-name">
            <i class="ti ${typeIcon[line.type]}" style="font-size:18px" aria-hidden="true"></i>
            ${esc(line.name)}
            <span class="type-badge ${typeClass[line.type]}">${typeLabel[line.type]}</span>
          </span>
          <div class="tc-actions">
            <button class="btn-del btn-del-line" data-index="${i}" aria-label="削除"><i class="ti ti-x"></i></button>
          </div>
        </div>

        <div style="margin-top:10px">${statusDisplay}</div>

        <div class="status-picker">
          <span>ステータスを更新：</span>
          <button class="status-btn ${st==='normal'?'active-normal':''}" data-index="${i}" data-status="normal">
            <span class="status-dot dot-normal"></span>平常運転
          </button>
          <button class="status-btn ${st==='delay'?'active-delay':''}" data-index="${i}" data-status="delay">
            <span class="status-dot dot-delay"></span>遅延
          </button>
          <button class="status-btn ${st==='stop'?'active-stop':''}" data-index="${i}" data-status="stop">
            <span class="status-dot dot-stop"></span>見合わせ
          </button>
        </div>

        ${st==='delay'||st==='stop' ? `<div class="status-note">
          <input type="text" class="status-note-input" data-index="${i}" placeholder="詳細メモ（例：人身事故のため約20分遅延）" value="${noteVal}" />
        </div>` : ''}

        <div class="external-links" style="margin-top:10px">${linksHTML}</div>
        ${line.updatedAt ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:8px">最終更新: ${esc(line.updatedAt)}</div>` : ''}
      </div>`;
    }).join('');

    // Attach dynamic events for cards
    document.querySelectorAll('.btn-del-line').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        deleteLine(idx);
      });
    });

    document.querySelectorAll('.status-picker .status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        const st = btn.getAttribute('data-status');
        setStatus(idx, st);
      });
    });

    document.querySelectorAll('.status-note-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(input.getAttribute('data-index'));
        setNote(idx, input.value);
      });
    });
  }

  function addLine() {
    const name = lineInput.value.trim();
    if (!name) return;
    lines.push({ name, type: typeSelect.value, status: 'unknown', note: '', updatedAt: '' });
    lineInput.value = '';
    saveLines();
    renderTransit();
    updateSummary();
  }

  function deleteLine(i) {
    lines.splice(i, 1);
    saveLines();
    renderTransit();
    updateSummary();
  }

  function setStatus(i, st) {
    lines[i].status = st;
    lines[i].updatedAt = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    if (st === 'normal') lines[i].note = '';
    saveLines();
    renderTransit();
    updateSummary();
  }

  function setNote(i, val) {
    lines[i].note = val;
    saveLines();
  }

  btnAddLine.addEventListener('click', addLine);
  lineInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLine();
  });

  /* ── Deadlines Logic ── */
  function getDays(dateStr) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  }

  function urgCls(days) {
    if (days < 0) return { bar: 'bar-past', val: 'days-past' };
    if (days <= 3) return { bar: 'bar-urgent', val: 'days-urgent' };
    if (days <= 7) return { bar: 'bar-soon', val: 'days-soon' };
    return { bar: 'bar-ok', val: 'days-ok' };
  }

  function filtered() {
    return deadlines.filter(d => {
      const days = getDays(d.date);
      if (dlFilter === 'urgent') return days >= 0 && days <= 3;
      if (dlFilter === 'week')   return days >= 0 && days <= 7;
      if (dlFilter === 'month')  return days >= 0 && days <= 31;
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function renderDeadlines() {
    if (!deadlines.length) {
      deadlineList.innerHTML = `<div class="empty"><i class="ti ti-clipboard-off"></i>提出物がまだ登録されていません</div>`;
      return;
    }
    const items = filtered();
    if (!items.length) {
      deadlineList.innerHTML = `<div class="empty"><i class="ti ti-filter-off"></i>該当する提出物はありません</div>`;
      return;
    }
    
    deadlineList.innerHTML = items.map(dl => {
      const days = getDays(dl.date);
      const c = urgCls(days);
      const txt = days < 0 ? '期限切れ' : days === 0 ? '今日！' : `あと${days}日`;
      const dateStr = new Date(dl.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
      const notif = days >= 0 && days <= 3 ? '<span class="notif">要注意</span>' : '';
      const idx = deadlines.indexOf(dl);
      
      return `<div class="dl-card">
        <div class="urgency-bar ${c.bar}"></div>
        <div class="dl-content">
          <div class="dl-title">${esc(dl.title)} ${notif}</div>
          <div class="dl-meta"><i class="ti ti-book" style="font-size:12px;margin-right:4px" aria-hidden="true"></i>${esc(dl.subject)} &nbsp;·&nbsp; ${dlTypeLabel[dl.type]}</div>
        </div>
        <div class="dl-right">
          <div class="days-val ${c.val}">${txt}</div>
          <div class="date-lbl">${dateStr}</div>
        </div>
        <button class="btn-del btn-del-dl" data-index="${idx}" aria-label="削除"><i class="ti ti-x"></i></button>
      </div>`;
    }).join('');

    // Attach dynamic events for DL cards
    document.querySelectorAll('.btn-del-dl').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        deleteDL(idx);
      });
    });
  }

  function addDeadline() {
    const title = dlTitle.value.trim();
    const date  = dlDate.value;
    if (!title || !date) {
      alert('名前と締め切り日を入力してください');
      return;
    }
    deadlines.push({
      title,
      subject: dlSubject.value.trim() || '科目未設定',
      date,
      type: dlType.value
    });
    dlTitle.value = '';
    dlSubject.value = '';
    dlDate.value = '';
    saveDeadlines();
    renderDeadlines();
    updateSummary();
  }

  function deleteDL(i) {
    deadlines.splice(i, 1);
    saveDeadlines();
    renderDeadlines();
    updateSummary();
  }

  btnAddDL.addEventListener('click', addDeadline);
  dlTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDeadline();
  });

  // Filter Buttons Action
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dlFilter = btn.getAttribute('data-filter');
      renderDeadlines();
    });
  });

  /* ── Summary ── */
  function updateSummary() {
    sumLines.textContent = lines.length;
    sumDelays.textContent = lines.filter(l => l.status === 'delay' || l.status === 'stop').length;
    sumUrgent.textContent = deadlines.filter(d => {
      const v = getDays(d.date);
      return v >= 0 && v <= 3;
    }).length;
    
    const now = new Date();
    const me = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    sumTotal.textContent = deadlines.filter(d => {
      const dd = new Date(d.date);
      return dd >= now && dd <= me;
    }).length;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
