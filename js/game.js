'use strict';
// ============================================================
// VÒNG CHƠI: chọn bài ở dải trên cùng → gõ → kết quả. Bàn phím 3D là đối tượng chính.
// Hai loại bài: "Phím tự do" (dãy ký tự thích ứng theo phím hay sai) và "Bài đánh chữ"
// (nội dung có sẵn, hoặc người chơi dán vào).
// ============================================================
(() => {
  const $ = (id) => document.getElementById(id);
  const elMenu = $('menu'), elKetQua = $('ket-qua'), elDongChu = $('dong-chu'), elDongTrong = $('dong-chu-trong'), elDock = $('dock'), elKhung = $('khung-phu');
  const KHOA_KY_LUC = 'gamenho_kyluc_v2', KHOA_YEU = 'gamenho_phimyeu_v2', KHOA_TU_NHAP = 'gamenho_tunhap_v1';
  const GIOI_HAN_TU = 200;

  const G = {
    trangThai: 'menu', muc: null, van: null, chuoi: 0, chuoiMax: 0,
    kyLuc: CaiDat.docLuu(KHOA_KY_LUC, {}), yeu: CaiDat.docLuu(KHOA_YEU, {}), tuNhap: CaiDat.docLuu(KHOA_TU_NHAP, ''),
  };
  const bayGio = () => (window.QUAY ? window.QUAY.t : performance.now() / 1000);

  // ---------- Bàn phím: tra mã phím ↔ ký tự ----------
  const VI_TRI = {}, KY_TU = {}, MA_CUA = {}, CO_PHIM = new Set();
  BO_CUC_PHIM.forEach((hang, hi) => {
    let u = 0;
    for (const [, rong, ma, kt] of hang) {
      VI_TRI[ma] = { x: ((u + rong / 2) / 15) * 2 - 1, cao: 1 + (2 - hi) * 0.012 };
      if (kt !== undefined) { KY_TU[ma] = kt; MA_CUA[kt] = ma; }
      CO_PHIM.add(ma); u += rong;
    }
  });
  const giuPhim = (ma, bat) => { if (window.BanPhim3D) BanPhim3D.giu(ma, bat); };
  const bao3D = (ma, kq) => { if (window.BanPhim3D) BanPhim3D.nhan(ma, kq); };
  const loaiTieng = (ma) => ma === 'Space' ? 'cach' : PHIM_LON.has(ma) ? 'lon' : 'chu';
  const maCan = () => { if (G.trangThai !== 'choi') return null; const ch = G.van.chuoi[G.van.i]; return ch === undefined ? null : MA_CUA[ch === ' ' ? ' ' : ch.toUpperCase()]; };

  // ---------- Phím tự do: thích ứng theo phím hay gõ sai ----------
  // Mỗi chữ cái có độ sai e (trung bình trượt). Chữ nào e cao hiện nhiều hơn; gõ quen thì e giảm và hiện ít lại.
  const CHU_CAI = 'abcdefghijklmnopqrstuvwxyz';
  const trongSo = (c) => { const k = G.yeu[c]; return k ? 0.4 + k.e * 9 + (k.n < 6 ? 0.6 : 0) : 1.4; };
  function ghiNhanPhim(c, sai) {
    if (!CHU_CAI.includes(c)) return;
    const k = G.yeu[c] || (G.yeu[c] = { n: 0, e: 0.12 });
    k.n++; k.e = k.e * 0.88 + (sai ? 0.12 : 0);
  }
  function taoDayTuDo(soCum = 11) {
    const chon = (truoc) => {
      let tong = 0; const ds = [...CHU_CAI].filter(c => c !== truoc).map(c => { const w = trongSo(c); tong += w; return [c, w]; });
      let r = Math.random() * tong;
      for (const [c, w] of ds) { r -= w; if (r <= 0) return c; }
      return ds[0][0];
    };
    const cum = [];
    for (let i = 0; i < soCum; i++) { let s = '', tr = ''; const dai = 3 + Math.floor(Math.random() * 3); for (let k = 0; k < dai; k++) { tr = chon(tr); s += tr; } cum.push(s); }
    return cum.join(' ');
  }

  // ---------- Dòng chữ cần gõ ----------
  let oChu = [];
  function dungDongChu() {
    elDongTrong.innerHTML = ''; oChu = [];
    if (!G.van) return;
    for (const ch of G.van.chuoi) {
      const s = document.createElement('span'); s.className = 'chu-go' + (ch === ' ' ? ' cach' : ''); s.textContent = ch === ' ' ? '·' : ch;
      elDongTrong.appendChild(s); oChu.push(s);
    }
    canDongChu(true);
  }
  function canDongChu(ngay) {
    if (!G.van) return;
    const s = oChu[Math.min(G.van.i, oChu.length - 1)]; if (!s) return;
    oChu.forEach((o, k) => { o.classList.toggle('xong', k < G.van.i); o.classList.toggle('ke', k === G.van.i); });
    elDongTrong.style.transition = ngay ? 'none' : '';
    elDongTrong.style.transform = `translateX(${(elDongChu.clientWidth * 0.35 - (s.offsetLeft + s.offsetWidth / 2)).toFixed(1)}px)`;
  }
  function nhayDo() { const s = oChu[G.van.i]; if (s) { s.classList.remove('sai-nhay'); void s.offsetWidth; s.classList.add('sai-nhay'); } }

  // ---------- Bắt đầu / kết thúc ----------
  function batDau(muc) {
    AmThanh.khoiTao(); capNhatNhacBat();
    if (muc.tuDo) muc = { ...muc, van: taoDayTuDo() };
    G.muc = muc; G.trangThai = 'choi';
    G.van = { chuoi: muc.van, i: 0, batDau: 0, xong: 0, dung: 0, sai: 0, saiCho: false };
    G.chuoi = 0; G.chuoiMax = 0;
    elMenu.classList.add('an'); elKetQua.classList.add('an'); elDongChu.classList.remove('an');
    dungDongChu(); capNhatGoiY(); capNhatTren();
  }
  function veMenu() {
    if (G.trangThai === 'choi') CaiDat.ghiLuu(KHOA_YEU, G.yeu);
    G.trangThai = 'menu'; G.van = null; G.muc = null; dungDongChu();
    elKetQua.classList.add('an'); elMenu.classList.remove('an'); elDongChu.classList.add('an');
    dungMenu(); capNhatGoiY(); capNhatTren();
  }
  const dinhGiay = (s) => s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)} s`;
  function ketThuc() {
    const v = G.van; v.xong = bayGio(); G.trangThai = 'ketqua';
    CaiDat.ghiLuu(KHOA_YEU, G.yeu);
    const giay = v.xong - v.batDau;
    const wpm = Math.round((v.chuoi.length / 5) / Math.max(0.01, giay / 60)), cx = Math.round(100 * v.dung / Math.max(1, v.dung + v.sai));
    let dongKL = '';
    if (G.muc.tuDo) {
      const yeu = [...new Set(v.chuoi.replace(/ /g, ''))].filter(c => G.yeu[c] && G.yeu[c].e > 0.12).sort((a, b) => G.yeu[b].e - G.yeu[a].e).slice(0, 5);
      if (yeu.length) dongKL = `<div>${t('weak')}: <b class="yeu">${yeu.join(' ').toUpperCase()}</b></div>`;
    } else if (G.muc.id !== 'tunhap') {
      const cu = G.kyLuc[G.muc.id];
      if (!cu || giay < cu.giay) { G.kyLuc[G.muc.id] = { giay, wpm, chinhXac: cx }; CaiDat.ghiLuu(KHOA_KY_LUC, G.kyLuc); dongKL = `<div class="ky-luc-moi">★ ${t('newBest')}</div>`; }
      else dongKL = `<div>${t('best')}: <b>${dinhGiay(cu.giay)}</b></div>`;
    }
    elKetQua.innerHTML = `<div class="so-lon">⏱ ${dinhGiay(giay)}</div>${dongKL}
      <div>${t('speed')}: <b>${wpm}</b> ${t('wpm')}</div><div>${t('acc')}: <b>${cx}%</b></div><div>${t('errs')}: <b>${v.sai}</b></div>
      <div class="hang-nut"><button data-lenh="lai">${G.muc.tuDo ? t('next') : t('again')} <kbd>Enter</kbd></button><button data-lenh="menu">${t('menu')} <kbd>Esc</kbd></button></div>`;
    elKetQua.classList.remove('an'); elDongChu.classList.add('an');
    capNhatTren();
  }
  elKetQua.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) b.dataset.lenh === 'lai' ? batDau(G.muc) : veMenu(); });

  // ---------- Gõ ----------
  function nhanPhim(ma) {
    AmThanh.khoiTao(); capNhatNhacBat();
    const vt = VI_TRI[ma] || { x: 0, cao: 1 }, kt = KY_TU[ma];
    AmThanh.phatPhim(loaiTieng(ma), vt);
    if (G.trangThai !== 'choi' || kt === undefined) { bao3D(ma, 'tudo'); return; }
    const v = G.van, ch = v.chuoi[v.i], can = ch === ' ' ? ' ' : ch.toUpperCase();
    if (!v.batDau) v.batDau = bayGio();
    if (kt === can) {
      if (!v.saiCho) ghiNhanPhim(ch, false);
      v.i++; v.dung++; v.saiCho = false; G.chuoi++; G.chuoiMax = Math.max(G.chuoiMax, G.chuoi);
      bao3D(ma, 'dung'); canDongChu(false);
      if (v.i >= v.chuoi.length) ketThuc();
    } else {
      if (!v.saiCho) { ghiNhanPhim(ch, true); v.saiCho = true; }
      AmThanh.phatPhim('sai', vt); v.sai++; G.chuoi = 0;
      bao3D(ma, 'sai'); nhayDo();
    }
  }

  // ---------- Mỗi khung hình ----------
  function capNhat() { AmThanh.capNhatNen(); }
  function ve() {
    if (G.van && G.trangThai !== 'menu') {
      const v = G.van, giay = v.batDau ? ((v.xong || bayGio()) - v.batDau) : 0, kl = G.kyLuc[G.muc.id];
      const h = `<b>${G.muc.ten}</b> ⏱ ${dinhGiay(giay)}` + (kl && !G.muc.tuDo ? ` <span class="mo">· ${t('best')} ${dinhGiay(kl.giay)}</span>` : '');
      if ($('thong-tin').innerHTML !== h) $('thong-tin').innerHTML = h;
    }
    if (window.BanPhim3D) BanPhim3D.datCan(maCan());
  }
  function capNhatTren() { if (G.trangThai === 'menu') $('thong-tin').innerHTML = `<b class="ten-game">${TEN_GAME}</b>`; }

  // ---------- Chọn bài ----------
  const dsBai = () => [{ id: 'tudo', ten: t('free'), tuDo: true }, ...DS_VAN];
  function dungMenu() {
    const ds = dsBai();
    elMenu.innerHTML = ds.map((m, i) => {
      const kl = G.kyLuc[m.id];
      return `<button class="${m.tuDo ? 'chinh' : ''}" data-i="${i}" title="${m.tuDo ? t('freeHint') : ''}"><kbd>${i + 1}</kbd> ${m.ten}${kl ? `<span class="kl">${dinhGiay(kl.giay)}</span>` : ''}</button>`;
    }).join('') + `<button class="them" data-i="nhap"><kbd>${ds.length + 1}</kbd> + ${t('yourText')}</button>`;
  }
  function chon(i) { if (i === 'nhap') moNhap(); else { const m = dsBai()[i]; if (m) batDau(m); } }
  elMenu.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) chon(b.dataset.i === 'nhap' ? 'nhap' : +b.dataset.i); });

  // ---------- Dán nội dung riêng ----------
  // Chỉ giữ ký tự gõ được không cần Shift; chữ có dấu thành không dấu.
  const lamSach = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9 ,.;'\/\-=\[\]\\`\s]/g, '').replace(/\s+/g, ' ').trim();
  const demTu = (s) => (s ? s.split(' ').length : 0);
  function moNhap() {
    elKhung.innerHTML = `<div class="hop"><h3>${t('pasteTitle')}</h3><textarea id="o-nhap" spellcheck="false">${G.tuNhap.replace(/</g, '&lt;')}</textarea>
      <div class="dem"><span id="dem-tu"></span><small>${t('pasteHint')}</small></div>
      <div class="hang-nut"><button id="nut-bat-dau" class="chinh">${t('start')}</button><button data-dong="1">${t('cancel')}</button></div></div>`;
    elKhung.classList.remove('an');
    const o = $('o-nhap'), capNhatDem = () => {
      const n = demTu(lamSach(o.value)), qua = n > GIOI_HAN_TU;
      $('dem-tu').textContent = `${n} / ${GIOI_HAN_TU} ${t('words')}${qua ? ' · ' + t('tooLong') : ''}`; $('dem-tu').classList.toggle('qua', qua);
      $('nut-bat-dau').disabled = n === 0 || qua;
    };
    o.addEventListener('input', capNhatDem); capNhatDem(); o.focus();
    $('nut-bat-dau').addEventListener('click', () => {
      const v = lamSach(o.value); G.tuNhap = o.value; CaiDat.ghiLuu(KHOA_TU_NHAP, G.tuNhap);
      dongKhung(); batDau({ id: 'tunhap', ten: t('yourText'), van: v });
    });
  }
  function moGhiCong() {
    elKhung.innerHTML = `<div class="hop"><h3>${t('credits')}</h3><div class="ghi-cong">
      <p>3D: three.js (MIT), by the three.js authors.</p>
      <p>Music &amp; sound: AI-generated with Stable Audio 3 by Stability AI, via Audio Studio MCP by KanaWorks_AI.</p>
      <p>Built with Claude (Anthropic).</p></div>
      <div class="hang-nut"><button data-dong="1">${t('close')}</button></div></div>`;
    elKhung.classList.remove('an');
  }
  function dongKhung() { elKhung.classList.add('an'); elKhung.innerHTML = ''; }
  elKhung.addEventListener('click', (e) => { if (e.target.dataset.dong || e.target === elKhung) dongKhung(); });

  // ---------- Thanh chọn bàn phím (dưới cùng) ----------
  const MAU_SLIME = [['ocean', '#3f93ea'], ['slate', '#8197ab'], ['lagoon', '#2fc2b6'], ['trang', '#f3eee4']];
  const nut = (act, val, nhan, dang) => `<button class="${dang ? 'dang' : ''}" data-act="${act}" data-val="${val}">${nhan}</button>`;
  const cham = (act, val, mau, dang) => `<button class="cham ${dang ? 'dang' : ''}" data-act="${act}" data-val="${val}" style="background:${mau}"></button>`;
  function dungDock() {
    const loai = CD.loaiPhim;
    let phu = '';
    if (loai === 'kinh') phu = ['vuon', 'bien', 'dong'].map(k => nut('phongCach', k, t(k), CD.phongCach === k)).join('');
    if (loai === 'slime') phu = MAU_SLIME.map(([k, m]) => cham('mauSlime', k, m, CD.mauSlime === k)).join('');
    if (loai === 'su') phu = ['trang', 'kintsugi', 'matchuoc'].map(k => nut('kieuSu', k, t('su_' + k), CD.kieuSu === k)).join('');
    if (loai === 'thuong') phu = MAU_THUONG.map(([k, m]) => cham('mauThuong', k, m, CD.mauThuong === k)).join('');
    const the = (ten, nd) => `<div class="nhom"><div class="tieu-de">${ten}</div><div class="hang">${nd}</div></div>`;
    const tenLed = { tat: 'ledOff', go: 'ledType', cauVong: 'ledWave' };
    elDock.innerHTML = the(t('keyboard'), ['slime', 'kinh', 'su', 'thuong'].map(k => nut('loaiPhim', k, t(k), loai === k)).join(''))
      + the(t('style'), phu)
      + the('LED', ['tat', 'go', 'cauVong'].map(k => nut('led', k, t(tenLed[k]).split(': ')[1], CD.led === k)).join(''))
      + the(t('angle'), ['30', '45', '60', '90'].map(g => nut('goc', g, g + '°', CD.gocNhin === g)).join('') + nut('goc', 've', '⟲', false));
  }
  elDock.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const { act, val } = b.dataset, B = window.BanPhim3D;
    if (act === 'goc') { if (val === 've') { CD.gocNhin = '90'; CD.thuPhong = 100; } else CD.gocNhin = val; if (B) B.veGoc(); }
    else { CD[act] = val; if (B) B.doiLoai(); }
    CaiDat.luu(); dungDock(); if (BangChinh.mo) BangChinh.dung();
  });

  // ---------- Thanh trên, ngôn ngữ ----------
  function capNhatGoiY() { $('goi-y').textContent = G.trangThai === 'choi' ? t('hintPlay') : t('hintMenu'); }
  function capNhatChuTren() {
    $('nut-cai-dat').textContent = t('settings'); $('nut-ghi-cong').textContent = t('credits');
    capNhatGoiY(); capNhatNhacBat(); dungDock(); capNhatTren();
    if (G.trangThai === 'menu') dungMenu();
    if (BangChinh.mo) BangChinh.dung();
  }
  $('chon-ngon-ngu').innerHTML = DS_NGON_NGU.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  $('chon-ngon-ngu').value = CD.ngonNgu;
  $('chon-ngon-ngu').addEventListener('change', (e) => { CD.ngonNgu = e.target.value; CaiDat.luu(); capNhatChuTren(); e.target.blur(); });
  $('nut-cai-dat').addEventListener('click', (e) => { BangChinh.batTat(); e.target.blur(); });
  $('nut-ghi-cong').addEventListener('click', (e) => { moGhiCong(); e.target.blur(); });
  function capNhatHien() {
    document.documentElement.style.setProperty('--co-chu', CD.coChu + 'px');
    if (window.BanPhim3D) BanPhim3D.hien(CD.hienBanPhim);
    if (G.van) requestAnimationFrame(() => canDongChu(true));
  }
  function capNhatNhacBat() { const e = $('nhac-bat'); e.textContent = t('sound'); e.classList.toggle('an', AmThanh.dangChay()); }

  // ---------- Phím ----------
  function chonSo(n) { const ds = dsBai(); if (n >= 1 && n <= ds.length) chon(n - 1); else if (n === ds.length + 1) chon('nhap'); }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea')) { if (e.code === 'Escape') dongKhung(); return; }
    if (!elKhung.classList.contains('an')) { if (e.code === 'Escape') dongKhung(); return; }
    if (e.code === 'F2') { e.preventDefault(); BangChinh.batTat(); return; }
    if (e.code === 'F3') { e.preventDefault(); CD.hienBanPhim = !CD.hienBanPhim; CaiDat.luu(); capNhatHien(); return; }
    if (e.code === 'Escape') { if (BangChinh.mo) BangChinh.an(); else veMenu(); return; }
    const soPhu = /^Numpad(\d)$/.exec(e.code);
    if (soPhu && G.trangThai !== 'choi') { chonSo(+soPhu[1]); return; }
    if (!CO_PHIM.has(e.code)) return;
    if ((e.ctrlKey || e.metaKey) && !/^(Control|Meta)/.test(e.code)) return;
    e.preventDefault(); giuPhim(e.code, true);
    if (e.repeat) return;
    if (e.code === 'Enter' && G.trangThai === 'ketqua') { nhanPhim(e.code); batDau(G.muc); return; }
    const so = /^Digit(\d)$/.exec(e.code);
    if (so && G.trangThai === 'menu') { nhanPhim(e.code); chonSo(+so[1]); return; }
    nhanPhim(e.code);
  });
  document.addEventListener('keyup', (e) => { if (CO_PHIM.has(e.code)) giuPhim(e.code, false); });
  document.addEventListener('pointerdown', () => { AmThanh.khoiTao(); capNhatNhacBat(); });
  document.addEventListener('visibilitychange', () => { const c = AmThanh.ctx; if (c) document.hidden ? c.suspend() : c.resume(); });
  addEventListener('resize', () => canDongChu(true));
  addEventListener('blur', () => { for (const ma of CO_PHIM) giuPhim(ma, false); });

  BangChinh.khiDoi = (k) => {
    AmThanh.capNhatAmLuong(); capNhatHien();
    if (window.BanPhim3D) { if (k === 'thuPhong' || k === '*') BanPhim3D.veGoc(); if (k === '*') BanPhim3D.doiLoai(); }
    if (k === '*') dungDock();
  };

  // ---------- Khởi động ----------
  capNhatChuTren(); capNhatHien(); veMenu();
  (function khung() { if (!window.QUAY) { capNhat(); ve(); } requestAnimationFrame(khung); })();

  window.GAME = { G, capNhat, ve, nhanPhim, batDau, veMenu, giuPhim, capNhatHien, taoDayTuDo, lamSach };
})();
