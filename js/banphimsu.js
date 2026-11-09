// ============================================================
// BÀN PHÍM SỨ — nút sứ men bóng, gõ cứng như phím cơ. Không có khuôn mặt.
// Ba loại: 'trang' (sứ trắng), 'kintsugi' (vỡ rồi hàn vàng: vết nứt chạy liền qua
// nhiều phím), 'matchuoc' (quân Mạt chược: mặt ngà khắc bi, trúc, vạn, gió, rồng; thân hai lớp).
// Hoạ tiết vẽ bằng code trên canvas, gắn lên mặt trên của mỗi nút.
// ============================================================
import * as THREE from '../vendor/three/three.module.js';
import { hopBo } from './banphimslime.js?v=30';

const PX = 200, CAO = 0.5;            // điểm ảnh mỗi đơn vị phím, chiều cao nút
const COBAN = '#21469c';

// Mạng vết nứt chung cho cả bàn phím (toạ độ phím), để vết nứt đi xuyên qua nhiều nút
function taoVetNut() {
  let s = 23; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const ds = [];
  const mot = (x, z, huong, buoc, day) => {
    const d = [[x, z]];
    for (let i = 0; i < buoc; i++) {
      huong += (r() - 0.5) * 0.9;
      x += Math.cos(huong) * 0.14; z += Math.sin(huong) * 0.14; d.push([x, z]);
      if (day > 2.2 && r() < 0.05) mot(x, z, huong + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.7), 8 + Math.floor(r() * 14), day * 0.6);
    }
    ds.push({ d, day });
  };
  for (let i = 0; i < 18; i++) mot(-7.5 + r() * 15, -2.5 + r() * 5, r() * 6.28, 26 + Math.floor(r() * 26), 3 + r() * 1.8);
  return ds;
}

function veChu(x, nhan, W, H, mau, vien) {
  if (!nhan) return;
  x.font = `${nhan.length > 1 ? 600 : 700} ${nhan.length > 1 ? 34 : 78}px "Segoe UI", sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (vien) { x.lineJoin = 'round'; x.lineWidth = 12; x.strokeStyle = vien; x.strokeText(nhan, W / 2, H * 0.46); }
  x.fillStyle = mau; x.fillText(nhan, W / 2, H * 0.46);
}

// Phong cách Mạt chược: nền trắng ngà xen phím xanh ngọc, hàng số hai màu kèm số Hán đỏ,
// phím cách đỏ sóng vàng, chữ tròn đậm. Lấy ý từ các bộ nút mạt chược, không chép bộ nào.
const NGA = '#f8f4e8', XANH_LA = '#1f8a6b', NGOC_TOI = '#14604c', DO_SON = '#bb2b23', VANG = '#f3c552';
const PHIM_NGOC = new Set(['KeyQ', 'KeyT', 'KeyO', 'KeyA', 'KeyG', 'KeyL', 'KeyZ', 'KeyB']);
const PHIM_DO = new Set(['Space', 'Enter', 'ContextMenu']);
const SO_HAN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 0: '十' };
const FONT_TRON = '"Arial Rounded MT Bold", "Segoe UI", sans-serif', FONT_HAN = '"Microsoft YaHei", "SimHei", "Noto Sans CJK SC", serif';
const loaiMC = (ma, kt) => PHIM_DO.has(ma) ? 'do' : ma.startsWith('Digit') ? 'so' : (PHIM_NGOC.has(ma) || kt === undefined) ? 'ngoc' : 'nga';
function veMatChuoc(x, W, H, ma, nhan, kt) {
  const loai = loaiMC(ma, kt), chu = (txt, cx, cy, co, mau, font = FONT_TRON) => { x.font = `800 ${co}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = mau; x.fillText(txt, cx, cy); };
  if (loai === 'so') {                                 // hai màu: số Hán đỏ trên nền ngà, chữ số trắng trên ngọc
    x.fillStyle = NGA; x.fillRect(0, 0, W, H); x.fillStyle = XANH_LA; x.fillRect(0, H * 0.54, W, H * 0.46);
    chu(SO_HAN[ma[5]], W / 2, H * 0.28, 74, DO_SON, FONT_HAN); chu(nhan, W / 2, H * 0.77, 60, NGA);
    return;
  }
  if (loai === 'do') {
    x.fillStyle = DO_SON; x.fillRect(0, 0, W, H);
    if (ma === 'Space') {                              // sóng vàng hai đầu, chữ Phát ở giữa
      x.strokeStyle = VANG; x.lineWidth = 3.5;
      for (let i = -1; i * 46 < W + 46; i++) { if (Math.abs(i * 46 - W / 2) < 150) continue; for (const q of [34, 23, 12]) { x.beginPath(); x.arc(i * 46, H, q, Math.PI, 0); x.stroke(); } }
      chu('發', W / 2, H / 2 + 4, 104, VANG, FONT_HAN);
    } else chu(nhan, W / 2, H / 2 + 2, nhan.length > 1 ? 42 : 76, VANG);
    return;
  }
  x.fillStyle = loai === 'ngoc' ? XANH_LA : NGA; x.fillRect(0, 0, W, H);
  if (ma === 'Backquote') { x.strokeStyle = DO_SON; x.lineWidth = 6; x.strokeRect(W * 0.2, H * 0.14, W * 0.6, H * 0.72); chu('中', W / 2, H / 2 + 4, 86, DO_SON, FONT_HAN); return; }
  chu(nhan, W / 2, H / 2 + 3, nhan.length > 1 ? 42 : 100, loai === 'ngoc' ? NGA : NGOC_TOI);
  if (ma === 'KeyF' || ma === 'KeyJ') { x.fillStyle = NGOC_TOI; x.fillRect(W / 2 - 22, H - 26, 44, 7); }
}

export function taoBanPhimSu(PHIM, cha) {
  const nhom = new THREE.Group(); nhom.visible = false; cha.add(nhom);
  const NUT = {}, hit = [], nut = taoVetNut(), boTex = {};
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  const vlBong = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.28, 'rgba(255,255,255,.75)'); g.addColorStop(0.42, 'rgba(255,255,255,.12)'); g.addColorStop(0.6, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  })();

  BO_CUC_PHIM.forEach((hang) => {
    for (const [nhan, rong, ma, kt] of hang) {
      const p = PHIM[ma]; if (!p) continue;
      const w = rong - 0.1, d = 0.9;
      const mauMen = kt === undefined ? '#f1eee8' : '#fdfcf9';
      const mot = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.09, ior: 1.65, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.9 });
      const ben = new THREE.MeshPhysicalMaterial({ color: mauMen, roughness: 0.09, ior: 1.65, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.9 });
      // thứ tự mặt hộp: +x −x +y −y +z −z; họa tiết chỉ ở mặt trên (+y)
      const m = new THREE.Mesh(hopBo(w, d, CAO, 0.09, 0.05), [ben, ben, mot, ben, ben, ben]);
      m.position.set(p.x, 0, p.z); m.castShadow = true; m.receiveShadow = true; m.userData.ma = ma; nhom.add(m); hit.push(m);
      // vệt bóng của lớp men (giả phản chiếu đèn), đi theo nút
      const bong = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, d * 0.86), vlBong); bong.rotation.x = -Math.PI / 2; bong.position.y = CAO + 0.004; m.add(bong);
      NUT[ma] = { m, mot, ben, nhan: nhan === 'space' ? '' : nhan, w, d, kt, mauMen, p };
    }
  });

  // Thân quân Mạt chược: nửa trên ngà, nửa dưới xanh trúc như quân bài thật
  let texBenCache = null;
  function texBen() {
    if (texBenCache) return texBenCache;
    const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = NGA; x.fillRect(0, 0, 8, 128); x.fillStyle = XANH_LA; x.fillRect(0, 74, 8, 54); x.fillStyle = '#1f6a44'; x.fillRect(0, 74, 8, 4);
    return (texBenCache = tex(c, true));
  }
  function texCua(ma, kieu) {
    const k = kieu + ma; if (boTex[k]) return boTex[k];
    const n = NUT[ma], W = Math.max(40, Math.round(n.w * PX)), H = Math.round(n.d * PX);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = n.mauMen; x.fillRect(0, 0, W, H);
    let mask = null;
    if (kieu === 'kintsugi') {
      const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const y = c2.getContext('2d');
      // kênh đỏ = gờ nổi, xanh lá = độ nhám, xanh dương = kim loại
      y.fillStyle = 'rgb(0,41,0)'; y.fillRect(0, 0, W, H);
      const l = n.p.x - n.w / 2, t = n.p.z - n.d / 2;
      for (const ctx of [x, y]) { ctx.lineCap = ctx.lineJoin = 'round'; }
      const ve = (ctx, line, mau, them) => {
        ctx.strokeStyle = mau; ctx.lineWidth = line.day * them; ctx.beginPath();
        line.d.forEach(([a, b], i) => { const px = (a - l) * PX, py = (b - t) * PX; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke();
      };
      for (const line of nut) { ve(x, line, '#8d6a24', 1.5); ve(x, line, '#e8bf57', 1); ve(y, line, 'rgb(255,80,255)', 1.2); }
      mask = tex(c2, false);
    }
    if (kieu === 'matchuoc') veMatChuoc(x, W, H, ma, n.nhan, n.kt);
    if (kieu === 'matchuoc') { /* đã vẽ ở trên */ }
    else if (kieu === 'kintsugi') veChu(x, n.nhan, W, H, '#2e2a24', '#fdfcf9');
    else veChu(x, n.nhan, W, H, n.kt === undefined ? '#6d6a60' : '#39403f', null);
    return (boTex[k] = { map: tex(c, true), mask });
  }
  function capNhatKieu() {
    if (CD.kieuSu === 'hoalam') CD.kieuSu = 'matchuoc';   // bản cũ đã lưu
    const kieu = CD.kieuSu || 'trang', laMC = kieu === 'matchuoc';
    vlBong.opacity = laMC ? 0.18 : 0.55;
    for (const ma in NUT) {
      const n = NUT[ma], t = texCua(ma, kieu);
      n.mot.map = t.map; n.mot.metalnessMap = t.mask; n.mot.roughnessMap = t.mask; n.mot.bumpMap = t.mask;
      const lm = laMC ? loaiMC(ma, n.kt) : '';   // thân phím: ngọc/đỏ đặc, phím ngà có lớp đáy xanh như quân bài
      n.ben.map = lm === 'nga' || lm === 'so' ? texBen() : null;
      n.ben.color.set(lm === 'ngoc' ? XANH_LA : lm === 'do' ? DO_SON : lm ? '#ffffff' : n.mauMen); n.ben.needsUpdate = true;
      n.mot.metalness = t.mask ? 1 : 0; n.mot.roughness = t.mask ? 1 : 0.09; n.mot.bumpScale = t.mask ? 1.2 : 1; n.mot.needsUpdate = true;
    }
  }
  function buoc(can) {
    for (const ma in NUT) {
      const n = NUT[ma], p = n.p;
      n.m.position.y = p.y;
      for (const v of [n.mot, n.ben]) {
        if (ma === can) { v.emissive.set('#f2d24b'); v.emissiveIntensity = 0.32; }
        else if (p.ledRa > 0.01) { v.emissive.copy(p.ledMau); v.emissiveIntensity = p.ledRa * 0.7; }
        else v.emissiveIntensity = 0;
      }
    }
  }
  return { nhom, hit, buoc, capNhatKieu };
}
