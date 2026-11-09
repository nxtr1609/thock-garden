// ============================================================
// BÀN PHÍM THƯỜNG — nút nhựa bình thường, nhiều màu để chọn (MAU_THUONG trong bai.js).
// ============================================================
import * as THREE from '../vendor/three/three.module.js';
import { hopBo } from './banphimslime.js?v=30';

export function taoBanPhimThuong(PHIM, cha) {
  const nhom = new THREE.Group(); nhom.visible = false; cha.add(nhom);
  const NUT = {}, hit = [], boChu = new Map();
  function vlChu(nhan, mau, w) {
    const k = nhan + mau;
    if (!boChu.has(k)) {
      const c = document.createElement('canvas'); c.width = Math.round(128 * w); c.height = 128; const x = c.getContext('2d');
      x.font = `600 ${nhan.length > 1 ? 34 : 68}px "Segoe UI", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = mau; x.fillText(nhan, c.width / 2, 66);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      boChu.set(k, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    }
    return boChu.get(k);
  }
  BO_CUC_PHIM.forEach((hang) => {
    for (const [nhan, rong, ma, kt] of hang) {
      const p = PHIM[ma]; if (!p) continue;
      const w = rong - 0.1, d = 0.9, vl = new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.5 });
      const m = new THREE.Mesh(hopBo(w, d, 0.5, 0.09, 0.07), vl);
      m.position.set(p.x, 0, p.z); m.castShadow = true; m.receiveShadow = true; m.userData.ma = ma; nhom.add(m); hit.push(m);
      const nhan2 = nhan === 'space' ? '' : nhan, chu = new THREE.Mesh(new THREE.PlaneGeometry(0.62 * Math.min(rong, 2.2), 0.62));
      chu.rotation.x = -Math.PI / 2; chu.position.y = 0.503; chu.scale.setScalar(kt === undefined ? 0.8 : 0.72); m.add(chu);
      NUT[ma] = { m, vl, chu, nhan: nhan2, rong, kt, p };
    }
  });
  function capNhatMau() {
    const hex = (MAU_THUONG.find(c => c[0] === CD.mauThuong) || MAU_THUONG[0])[1], goc = new THREE.Color(hex);
    const toi = (goc.r * 0.3 + goc.g * 0.59 + goc.b * 0.11) < 0.28, mauChu = toi ? '#f3f1ea' : '#20262b';
    const hsl = {}; goc.getHSL(hsl);
    const phu = new THREE.Color().setHSL(hsl.h, hsl.s * 0.9, Math.max(0, Math.min(1, hsl.l + (toi ? 0.09 : -0.1))));  // phím chức năng đậm/nhạt hơn một chút
    for (const ma in NUT) {
      const n = NUT[ma]; n.vl.color.copy(n.kt === undefined ? phu : goc);
      n.chu.material = vlChu(n.nhan, mauChu, Math.min(n.rong, 2.2));
    }
  }
  function buoc(can) {
    for (const ma in NUT) {
      const n = NUT[ma], p = n.p; n.m.position.y = p.y;
      if (ma === can) { n.vl.emissive.set('#f2d24b'); n.vl.emissiveIntensity = 0.3; }
      else if (p.ledRa > 0.01) { n.vl.emissive.copy(p.ledMau); n.vl.emissiveIntensity = p.ledRa * 0.8; }
      else n.vl.emissiveIntensity = 0;
    }
  }
  return { nhom, hit, buoc, capNhatMau };
}
