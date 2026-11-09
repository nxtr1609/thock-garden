// ============================================================
// BÀN PHÍM SLIME — khung bàn phím cứng, chỉ nút nhấn là thạch mềm đàn hồi.
// Ý tưởng lấy từ bản mẫu "Sperm Whale Jelly" (chất thạch: trong, màu đậm dần theo độ dày,
// lõi sữa bên trong, bọt khí bị kẹt; hai thông số Độ cứng / Độ nhún). Code tự viết.
// Mỗi nút là một khối lò xo: lún – phình ra hai bên – lắc ngang – lõm chỗ nhấn – gợn sóng;
// việc biến dạng làm trong vertex shader nên 61 nút vẫn nhẹ.
// ============================================================
import * as THREE from '../vendor/three/three.module.js';

const CAO = 0.62;       // chiều cao nút thạch
const BANG_MAU = {      // [màu thạch, màu đậm cho phím chức năng]
  ocean: ['#3f93ea', '#1d5fc0'], slate: ['#8197ab', '#3f5468'], lagoon: ['#2fc2b6', '#0b8282'],
  trang: ['#d6e6ff', '#aebfd6'],   // nút trắng: giữa trong thấy lõi sữa, viền xanh như ảnh mẫu
};
const CAM = '#ff8a4a';  // phím nhấn (Enter, Backspace, ☰)
const SUA = '#f3eee4';  // lõi sữa
const PHIM_CAM = new Set(['Enter', 'Backspace', 'ContextMenu']);

// Hộp bo tròn nhiều ô lưới (cần đỉnh ở giữa mặt trên thì mới lõm và gợn được)
const boHinh = new Map();
export function hopBo(w, d, h, r, thuon) {
  const k = [w, d, h, r, thuon].join();
  if (boHinh.has(k)) return boHinh.get(k);
  const sx = Math.min(26, Math.max(10, Math.round(w * 9)));   // đủ mịn để lõm và gợn, không dư đỉnh
  const g = new THREE.BoxGeometry(w, h, d, sx, 6, 10);
  const P = g.attributes.position, N = g.attributes.normal, v = new THREE.Vector3(), tr = new THREE.Vector3(), n = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    tr.set(THREE.MathUtils.clamp(v.x, -hx, hx), THREE.MathUtils.clamp(v.y, -hy, hy), THREE.MathUtils.clamp(v.z, -hz, hz));
    n.subVectors(v, tr);
    if (n.lengthSq() < 1e-9) n.fromBufferAttribute(N, i); else n.normalize();
    v.copy(tr).addScaledVector(n, r);
    const t = (v.y + h / 2) / h, lui = thuon * t;   // thuôn dần lên trên
    P.setXYZ(i, v.x * (1 - 2 * lui / w), v.y + h / 2, v.z * (1 - 2 * lui / d));
    N.setXYZ(i, n.x, n.y, n.z);
  }
  boHinh.set(k, g); return g;
}

// Chất thạch: trong suốt, màu đậm dần theo độ dày, viền sáng, có biến dạng trong vertex shader
function vlThach(mau, u) {
  const c = new THREE.Color(mau);
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, roughness: 0.1, ior: 1.12, thickness: 0.26,
    attenuationColor: c, attenuationDistance: 0.2, clearcoat: 1, clearcoatRoughness: 0.07,
    specularIntensity: 1, envMapIntensity: 1.1,
  });
  m.userData.u = u; m.userData.mau = c;
  m.customProgramCacheKey = () => 'thach-v1';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = `
      uniform float uNen, uLom, uGon, uPha, uCao, uBan; uniform vec2 uLech;
      vec3 bien(vec3 p) {
        float t = clamp(p.y / uCao, 0.0, 1.0);
        float nen = uNen * smoothstep(0.0, 0.35, t);
        vec3 q = p;
        q.y *= 1.0 - nen;
        q.xz *= 1.0 + uNen * 0.6 * sin(3.14159 * t);          // ép xuống thì phình ra (giữ thể tích)
        q.xz += uLech * t * t;                                 // lắc ngang, chân nút đứng yên
        float tren = smoothstep(0.55, 1.0, t), r = length(p.xz) / uBan;
        q.y -= uLom * tren * exp(-r * r * 2.6);                // lõm chỗ ngón tay nhấn
        q.y += uGon * tren * sin(r * 11.0 - uPha) * exp(-r * 1.4); // gợn sóng toả ra
        return q;
      }
    ` + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `
        vec3 objectNormal = normal;
        { vec3 a = abs(normal.y) < 0.9 ? vec3(0., 1., 0.) : vec3(1., 0., 0.);
          vec3 T = normalize(cross(normal, a)), B = cross(normal, T);
          float e = 0.012; vec3 p0 = bien(position);
          objectNormal = normalize(cross(bien(position + T * e) - p0, bien(position + B * e) - p0));
          if (dot(objectNormal, normal) < 0.0) objectNormal = -objectNormal; }`)
      .replace('#include <begin_vertex>', 'vec3 transformed = bien(position);');
    sh.fragmentShader = sh.fragmentShader
      // giữa nút trong để thấy lõi sữa và khuôn mặt, viền đậm màu như viền kính trong ảnh mẫu
      .replace('material.thickness = thickness;', 'material.thickness = thickness * (0.12 + 1.6 * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 1.4));')
      // ánh sáng toả trong khối thạch ở viền
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += attenuationColor * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5) * 0.45;`);
  };
  return m;
}

// Khuôn mặt vẽ bằng code, nền trong suốt (alphaTest để vẫn nhìn được xuyên qua thạch)
const MAU_MAT = '#1d3a52';
function veMat(kieu, goc = 0) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = x.strokeStyle = MAU_MAT; x.lineWidth = 8; x.lineCap = x.lineJoin = 'round';
  const cham = (a, b, r = 9) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
  const cung = (a, b, r, t0, t1) => { x.beginPath(); x.arc(a, b, r, t0, t1); x.stroke(); };
  const hai = () => { cham(42, 52); cham(86, 52); };
  if (kieu === 'cuoi') { hai(); cung(64, 66, 22, 0.15 * Math.PI, 0.85 * Math.PI); }
  if (kieu === 'meo') { hai(); cung(53, 76, 11, 0, Math.PI); cung(75, 76, 11, 0, Math.PI); }
  if (kieu === 'luoi') { hai(); x.fillStyle = '#ff7f96'; x.beginPath(); x.ellipse(74, 92, 11, 15, 0, 0, 7); x.fill(); cung(64, 66, 22, 0.15 * Math.PI, 0.85 * Math.PI); }
  if (kieu === 'cuoiTo') { hai(); x.beginPath(); x.arc(64, 70, 22, 0, Math.PI); x.closePath(); x.fill(); }
  if (kieu === 'nhay') { cham(42, 52); cung(86, 58, 12, 1.15 * Math.PI, 1.85 * Math.PI); cung(64, 66, 22, 0.15 * Math.PI, 0.85 * Math.PI); }
  if (kieu === 'ngot') { cung(42, 58, 12, 1.15 * Math.PI, 1.85 * Math.PI); cung(86, 58, 12, 1.15 * Math.PI, 1.85 * Math.PI); cung(64, 74, 12, 0.15 * Math.PI, 0.85 * Math.PI); }
  if (kieu === 'o') { hai(); cung(64, 86, 10, 0, 7); }
  const duong = (...d) => { x.beginPath(); d.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); };
  if (kieu === 'phang') { hai(); duong([48, 86], [80, 86]); }                       // :|
  if (kieu === 'xd') { duong([30, 42], [52, 62]); duong([52, 42], [30, 62]); duong([76, 42], [98, 62]); duong([98, 42], [76, 62]); x.beginPath(); x.arc(64, 72, 22, 0, Math.PI); x.closePath(); x.fill(); }  // xD
  if (kieu === 'khoc') { duong([30, 46], [54, 46]); duong([42, 46], [42, 58]); duong([74, 46], [98, 46]); duong([86, 46], [86, 58]); x.strokeStyle = '#5fb2ff'; duong([42, 64], [42, 96]); duong([86, 64], [86, 96]); x.strokeStyle = MAU_MAT; cung(64, 100, 12, 1.2 * Math.PI, 1.8 * Math.PI); }  // T_T
  if (kieu === 'owo') { x.lineWidth = 7; cung(42, 54, 12, 0, 7); cung(86, 54, 12, 0, 7); cung(55, 84, 9, 0, Math.PI); cung(73, 84, 9, 0, Math.PI); }  // OwO
  if (kieu === 'uwu') { cung(42, 48, 13, 0.1 * Math.PI, 0.9 * Math.PI); cung(86, 48, 13, 0.1 * Math.PI, 0.9 * Math.PI); cung(55, 84, 9, 0, Math.PI); cung(73, 84, 9, 0, Math.PI); }  // uwu
  if (kieu === 'chan') { duong([30, 54], [54, 54]); duong([74, 54], [98, 54]); duong([52, 88], [76, 88]); }  // -_-
  if (kieu === 'v') { hai(); duong([54, 74], [64, 92], [74, 74]); }                 // :v
  if (kieu === 'kinh') { x.lineWidth = 6; x.fillRect(26, 44, 32, 20); x.fillRect(70, 44, 32, 20); duong([58, 50], [70, 50]); x.lineWidth = 8; cung(64, 72, 18, 0.2 * Math.PI, 0.8 * Math.PI); }  // 8)
  if (kieu === 'hon') { hai(); x.lineWidth = 6; duong([60, 72], [72, 80], [60, 88]); x.fillStyle = '#ff7f96'; x.beginPath(); x.arc(94, 88, 6, 0, 7); x.arc(102, 88, 6, 0, 7); x.fill(); }  // :*
  if (kieu === 'ngu') { duong([30, 54], [54, 54]); duong([74, 54], [98, 54]); cung(64, 86, 8, 0, 7); x.lineWidth = 5; x.font = '700 24px sans-serif'; x.fillText('z', 100, 32); x.fillText('z', 112, 18); }  // ngủ gật
  if (kieu === 'then') { hai(); cung(64, 76, 12, 0.15 * Math.PI, 0.85 * Math.PI); x.fillStyle = '#ff9db0'; for (const a of [26, 102]) { x.beginPath(); x.ellipse(a, 72, 11, 6, 0, 0, 7); x.fill(); } }  // má hồng
  if (kieu === 'dau') { // gõ sai: >_<
    x.beginPath(); x.moveTo(30, 42); x.lineTo(52, 54); x.lineTo(30, 66); x.moveTo(98, 42); x.lineTo(76, 54); x.lineTo(98, 66); x.stroke();
    x.beginPath(); x.moveTo(46, 90); x.lineTo(82, 90); x.stroke();
  }
  if (kieu === 'choang') { // chóng mặt: mắt xoáy, miệng lượn
    x.lineWidth = 5;
    for (const cx of [42, 86]) {
      x.beginPath();
      for (let i = 0; i <= 44; i++) { const a = goc + i * 0.42, r = 1 + i * 0.36; const px = cx + Math.cos(a) * r, py = 52 + Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    x.lineWidth = 7; x.beginPath();
    for (let i = 0; i <= 28; i++) { const px = 44 + i * 40 / 28, py = 92 + Math.sin(i * 0.67 + goc) * 5; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, roughness: 0.5 });
}
const KIEU_MAT = ['cuoi', 'meo', 'luoi', 'cuoiTo', 'nhay', 'ngot', 'o', 'phang', 'xd', 'khoc', 'owo', 'uwu', 'chan', 'v', 'kinh', 'hon', 'ngu', 'then'];

export function taoBanPhimSlime(PHIM, cha) {
  const nhom = new THREE.Group(); nhom.visible = false; cha.add(nhom);
  const NUT = {}, hit = [];
  const vlMat = {}; KIEU_MAT.concat('dau').forEach(k => { vlMat[k] = veMat(k); });
  const vlChoang = [0, 1, 2, 3].map(i => veMat('choang', i * Math.PI / 2));
  const hinhMat = new THREE.PlaneGeometry(0.44, 0.44);
  const vlSua = new THREE.MeshStandardMaterial({ color: SUA, roughness: 0.6 });
  const vlBot = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0.1 });
  const hinhBot = new THREE.SphereGeometry(1, 8, 6);
  let s = 11; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;

  function nhanSua(chu, w, nho) { // mặt lõi sữa có chữ (đục, để nhìn được xuyên qua thạch); nho = chữ nhỏ ở góc, nhường chỗ cho khuôn mặt
    const c = document.createElement('canvas'); c.width = Math.round(128 * w); c.height = 128;
    const x = c.getContext('2d'); x.fillStyle = SUA; x.fillRect(0, 0, c.width, 128);
    x.font = `800 ${nho ? (chu.length > 1 ? 24 : 40) : (chu.length > 1 ? 40 : 84)}px "Segoe UI", sans-serif`; x.textAlign = nho ? 'left' : 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#26363a'; if (nho) x.fillText(chu, 10, 26); else x.fillText(chu, c.width / 2, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
  }

  BO_CUC_PHIM.forEach((hang) => {
    for (const [nhan, rong, ma, kt] of hang) {
      const p = PHIM[ma]; if (!p) continue;
      const w = rong - 0.1, d = 0.9;
      const u = { uNen: { value: 0 }, uLom: { value: 0 }, uGon: { value: 0 }, uPha: { value: 0 }, uCao: { value: CAO }, uBan: { value: Math.min(w, d) / 2 }, uLech: { value: new THREE.Vector2() } };
      const loai = PHIM_CAM.has(ma) ? 'cam' : kt === undefined ? 'dam' : 'chinh';
      const vl = vlThach('#3f93ea', u);
      const m = new THREE.Mesh(hopBo(w, d, CAO, 0.17, 0.06), vl);
      m.position.set(p.x, 0, p.z); m.userData.ma = ma; nhom.add(m); hit.push(m);
      // lõi sữa + chữ + bọt khí bị kẹt
      const loi = new THREE.Group(); loi.position.set(p.x, 0.05, p.z); nhom.add(loi);
      const lw = Math.max(0.5, w - 0.3), ld = 0.58;  // lõi sữa to, viền thạch mỏng bao quanh
      const khoi = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.2, ld), vlSua); khoi.position.y = 0.1; loi.add(khoi);
      const nhanChu = nhan === 'space' ? '' : nhan;
      const vlNho = nhanSua(nhanChu, lw / ld, true), vlTo = nhanSua(nhanChu, lw / ld, false);
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(lw, ld), vlNho); mat.rotation.x = -Math.PI / 2; mat.position.y = 0.202; loi.add(mat);
      const kieu = KIEU_MAT[Math.floor(r() * KIEU_MAT.length)];
      const mt = new THREE.Mesh(hinhMat, vlMat[kieu]); mt.rotation.x = -Math.PI / 2; mt.position.set(0.03, 0.206, 0.05); loi.add(mt);
      if (ma === 'KeyF' || ma === 'KeyJ') { const g = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: '#7d8a8a' })); g.position.set(0, 0.213, 0.15); loi.add(g); }
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(hinhBot, vlBot); b.scale.setScalar(0.012 + r() * 0.02);
        b.position.set((r() - 0.5) * (w - 0.3), 0.34 + r() * 0.14, (r() - 0.5) * 0.55); loi.add(b);
      }
      NUT[ma] = { m, vl, u, loi, loai, x: p.x, z: p.z, c: 0, vc: 0, lx: 0, lz: 0, vx: 0, vz: 0, gon: 0, pha: 0, do: 0, keoX: 0, keoZ: 0, mt, kieu, choang: 0, dau: 0, mat, vlNho, vlTo };
    }
  });

  function capNhatMau() {
    const [chinh, dam] = BANG_MAU[CD.mauSlime] || BANG_MAU.ocean;
    for (const ma in NUT) {
      const n = NUT[ma], c = n.loai === 'cam' ? CAM : n.loai === 'dam' ? dam : chinh;
      n.vl.attenuationColor.set(c); n.vl.userData.mau.set(c);
    }
  }
  capNhatMau();

  const DO = new THREE.Color('#ff3b30'), VANG = new THREE.Color('#f2d24b'), tam = new THREE.Color();
  function buoc(dt, can, dong) {
    const pha = Math.floor(performance.now() / 90) % 4;   // khung hình mắt xoáy
    const coMat = CD.matSlime !== false;
    const k = 60 + 500 * CD.doCungSlime, c0 = 2 + 22 * CD.doNhunSlime;   // độ cứng, độ nhún
    const h = dt / 4;
    for (const ma in NUT) {
      const n = NUT[ma], dich = PHIM[ma].giu ? 0.42 : 0;
      // Quán tính: bàn phím bị xoay/dời thì đỉnh nút chạy theo chậm hơn chân nút (nút xa tâm văng mạnh hơn)
      let vx0 = 0, vz0 = 0, ly = 0;
      if (dong) {
        const K = CD.quanTinh;
        vx0 = (dong.lx * 0.35 + dong.ay * n.z * 0.3) * K;
        vz0 = (dong.lz * 0.35 - dong.ay * n.x * 0.3 + dong.ax * 0.5) * K;
        const gh = (v) => Math.max(-6, Math.min(6, v)); vx0 = gh(vx0); vz0 = gh(vz0);
        n.vx += vx0; n.vz += vz0; n.vc += gh(dong.ax * n.z * 0.3 * K);
        if (Math.abs(vx0) + Math.abs(vz0) > 3.2) n.choang = Math.max(n.choang, 1.3);   // lắc mạnh quá thì chóng mặt
        ly = dong.w2 * 0.006 * K;   // quay nhanh: đỉnh nút ngả ra ngoài
      }
      const dichX = n.keoX + Math.max(-0.3, Math.min(0.3, ly * n.x)), dichZ = n.keoZ + Math.max(-0.3, Math.min(0.3, ly * n.z));
      for (let i = 0; i < 4; i++) {   // chia nhỏ bước cho lò xo không bị vỡ
        n.vc += (-(n.c - dich) * k - n.vc * c0) * h; n.c += n.vc * h;
        n.vx += (-(n.lx - dichX) * k * 0.7 - n.vx * c0) * h; n.lx += n.vx * h;
        n.vz += (-(n.lz - dichZ) * k * 0.7 - n.vz * c0) * h; n.lz += n.vz * h;
      }
      n.c = Math.max(-0.22, Math.min(0.7, n.c));
      n.lx = Math.max(-0.5, Math.min(0.5, n.lx)); n.lz = Math.max(-0.5, Math.min(0.5, n.lz));
      // khuôn mặt: gõ sai nhăn lại, vừa bị nhấn hay bị lắc thì chóng mặt
      n.choang = Math.max(0, n.choang - dt); n.dau = Math.max(0, n.dau - dt);
      n.mt.visible = coMat; n.mat.material = coMat ? n.vlNho : n.vlTo;
      if (coMat) n.mt.material = n.dau > 0 ? vlMat.dau : n.choang > 0 ? vlChoang[pha] : vlMat[n.kieu];
      n.gon *= Math.exp(-dt * 3.2); n.pha += dt * 26; n.do = Math.max(0, n.do - dt * 3);
      n.u.uNen.value = n.c; n.u.uLech.value.set(n.lx, n.lz);
      n.u.uLom.value = Math.max(0, n.c) * 0.32; n.u.uGon.value = n.gon; n.u.uPha.value = n.pha;
      // lõi sữa đi theo khối thạch
      n.loi.scale.y = 1 - Math.max(-0.2, n.c) * 0.75;
      n.loi.position.x = n.x + n.lx * 0.3; n.loi.position.z = n.z + n.lz * 0.3;
      // phím cần gõ ánh vàng, gõ sai ửng đỏ
      tam.copy(n.vl.userData.mau);
      const led = PHIM[ma];
      if (led.ledRa > 0.01) { tam.lerp(led.ledMau, Math.min(1, led.ledRa * 1.1)); n.vl.emissive.copy(led.ledMau); n.vl.emissiveIntensity = led.ledRa * 0.55; }
      else n.vl.emissiveIntensity = 0;
      if (ma === can) tam.lerp(VANG, 0.94);
      if (n.do > 0) tam.lerp(DO, Math.min(1, n.do));
      n.vl.attenuationColor.copy(tam);
    }
  }
  // kq: 'dung' | 'sai' | 'tudo'
  function nhan(ma, kq) {
    const a = NUT[ma]; if (!a) return;
    const manh = kq === 'sai' ? 0.7 : 1;
    a.vc += 7 * manh; a.gon = Math.min(0.05, a.gon + 0.035);
    a.vx += (r() - 0.5) * 3; a.vz += (r() - 0.5) * 3;
    if (kq === 'sai') { a.do = 1; a.dau = 0.8; } else a.choang = Math.max(a.choang, 0.75);
    for (const m in NUT) {        // nút bên cạnh chỉ rung nhẹ; khung bàn phím thì đứng yên
      if (m === ma) continue;
      const n = NUT[m], dx = n.x - a.x, dz = n.z - a.z, kc = Math.hypot(dx, dz);
      if (kc > 2.4) continue;
      const luc = Math.exp(-kc / 0.8);
      n.vc += 1.1 * luc; n.vx += (dx / kc) * 2.4 * luc; n.vz += (dz / kc) * 2.4 * luc;
    }
  }
  function keo(ma, x, z) { const n = NUT[ma]; if (n) { n.keoX = Math.max(-0.45, Math.min(0.45, x)); n.keoZ = Math.max(-0.45, Math.min(0.45, z)); } }
  return { nhom, hit, buoc, nhan, keo, capNhatMau };
}
