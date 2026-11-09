'use strict';
// ============================================================
// ÂM THANH: tiếng gõ phím ASMR (nhiều biến thể, chọn ngẫu nhiên) + nhạc nền chill lặp.
// Tất cả tạo bằng Audio Studio, nhúng base64 (am_thanh/*.js).
// ============================================================
window.AmThanh = (() => {
  let ctx = null, nutChung, nutPhim, nutNen;
  const buf = {};        // 'thock' → [AudioBuffer...], 'ai1' → AudioBuffer
  const dsNguon = new Set();
  let nguonNen = null, loaiNen = null;

  function khoiTao() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    // bộ nén cuối: chặn tiếng vỡ khi âm lượng đẩy lên cao
    const nen = ctx.createDynamicsCompressor(); nen.threshold.value = -6; nen.ratio.value = 6; nen.knee.value = 6; nen.attack.value = 0.002; nen.release.value = 0.15;
    nutChung = ctx.createGain(); nutChung.connect(nen); nen.connect(ctx.destination);
    nutPhim = ctx.createGain(); nutPhim.connect(nutChung);
    nutNen = ctx.createGain(); nutNen.connect(nutChung);
    capNhatAmLuong();
    for (const nhom in (window.TIENG_PHIM_B64 || {})) {
      buf[nhom] = [];
      TIENG_PHIM_B64[nhom].forEach((b64, i) => giaiMa(b64, b => { buf[nhom][i] = b; }));
    }
    for (const id in (window.NHAC_NEN_B64 || {})) giaiMa(NHAC_NEN_B64[id], b => { buf[id] = b; });
    return ctx;
  }
  const dangChay = () => !!ctx && ctx.state === 'running';
  const bayGio = () => (ctx ? ctx.currentTime : 0);

  function giaiMa(b64, xong) {
    try {
      const s = atob(b64), u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      ctx.decodeAudioData(u.buffer).then(xong).catch(e => console.warn('Không giải mã được âm thanh', e));
    } catch (e) { console.warn('Lỗi âm thanh', e); }
  }

  function capNhatAmLuong() {
    if (!ctx) return;
    nutChung.gain.value = CD.amChung;
    nutPhim.gain.value = CD.amPhim * 1.6; // tiếng gõ ngắn nên nghe nhỏ hơn nhạc — khuếch đại sẵn
    nutNen.gain.value = CD.amNen;
  }

  function theoDoi(nguon, nut) {
    const muc = { nguon, nut }; dsNguon.add(muc);
    nguon.onended = () => { dsNguon.delete(muc); try { nut.disconnect(); } catch (e) {} };
    if (dsNguon.size > 32) { const cu = dsNguon.values().next().value; try { cu.nguon.stop(); } catch (e) {} dsNguon.delete(cu); }
  }

  // loai: 'chu' (phím thường) | 'cach' (phím cách) | 'lon' (enter, shift…) | 'sai' (gõ sai)
  // viTri: { x: -1 (trái) … 1 (phải), cao: hệ số cao độ theo hàng phím }
  const truocDo = {};
  function phatPhim(loai, viTri = { x: 0, cao: 1 }) {
    if (!dangChay()) return;
    if (loai === 'sai' && !CD.tiengSai) return;
    const tiengSlime = CD.loaiPhim === 'slime' && CD.tiengSlime && loai !== 'sai' && buf.slime;
    const tiengSu = CD.loaiPhim === 'su' && CD.tiengSu && loai !== 'sai' && buf.su;
    const nhom = tiengSlime ? 'slime' : tiengSu ? 'su' : loai === 'chu' ? CD.boPhim : loai;
    const ds = (buf[nhom] || []).filter(Boolean);
    if (!ds.length) return;
    let i = Math.floor(Math.random() * ds.length);
    if (ds.length > 1 && i === truocDo[nhom]) i = (i + 1) % ds.length; // tránh lặp đúng một tiếng
    truocDo[nhom] = i;
    const src = ctx.createBufferSource(); src.buffer = ds[i];
    const d = CD.daoDong / 100;
    src.playbackRate.value = ((tiengSlime || tiengSu) && loai !== 'chu' ? 0.78 : 1) * (viTri.cao || 1) * (1 + (Math.random() * 2 - 1) * d); // phím lớn bằng slime: trầm hơn
    const g = ctx.createGain(); g.gain.value = (1 - Math.random() * 0.15);
    src.connect(g);
    let cuoi = g;
    if (ctx.createStereoPanner && CD.tachTraiPhai > 0) {
      const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, (viTri.x || 0) * CD.tachTraiPhai));
      g.connect(p); cuoi = p;
    }
    cuoi.connect(nutPhim);
    src.start(); theoDoi(src, cuoi);
  }

  // Nhạc nền: lặp liền; đổi loại thì mờ dần bản cũ.
  function capNhatNen() {
    if (!dangChay()) return;
    const muon = CD.nhacNen === 'tat' ? null : CD.nhacNen;
    if (muon === loaiNen && (nguonNen || !muon)) return;
    if (muon && !buf[muon]) return; // chưa giải mã xong
    tatNen();
    if (!muon) return;
    const src = ctx.createBufferSource(); src.buffer = buf[muon]; src.loop = true;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.5);
    src.connect(g); g.connect(nutNen); src.start();
    nguonNen = { src, g }; loaiNen = muon; theoDoi(src, g);
  }
  function tatNen() {
    if (!nguonNen) { loaiNen = null; return; }
    const { src, g } = nguonNen, now = ctx.currentTime;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.8);
    try { src.stop(now + 0.9); } catch (e) {}
    nguonNen = null; loaiNen = null;
  }

  return { khoiTao, dangChay, bayGio, capNhatAmLuong, phatPhim, capNhatNen, tatNen,
           get loaiNen() { return loaiNen; }, get soNguon() { return dsNguon.size; }, get ctx() { return ctx; },
           get sanSang() { return Object.keys(buf).length; } };
})();
