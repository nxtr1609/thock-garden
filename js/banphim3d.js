// ============================================================
// BÀN PHÍM 3D — bàn phím ảo dựng bằng three.js.
// Phím thường: nhựa. Phím A S D F: nút THUỶ TINH có hệ sinh thái nhỏ bên trong
// (mảnh ghép dùng lại từ bản mẫu thu_nut/). Nhấn phím: nút lún, mảnh bên trong nảy,
// cánh hoa / lá / bụi bắn ra rơi theo trọng lực, bật vào vách thuỷ tinh.
// Game gọi: BanPhim3D.nhan(ma, kq) · giu(ma, bat) · datCan(ma) · hien(bat)
// ============================================================
import * as THREE from '../vendor/three/three.module.js';
import { taoBanPhimSlime } from './banphimslime.js?v=30';
import { taoBanPhimSu } from './banphimsu.js?v=32';
import { taoBanPhimThuong } from './banphimthuong.js?v=30';

// Bàn phím Sa bàn: mọi nút chữ là thuỷ tinh, bên trong là một góc vườn nhỏ (mảnh ghép 3D nhẹ nhàng)
const NUT_MANH = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => 'Key' + c));
const vung = document.getElementById('vung-phim');
const cv = document.createElement('canvas'); cv.id = 'ban-phim-3d'; vung.appendChild(cv);

// ---------- Máy vẽ, cảnh, ánh sáng ----------
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
let tiLeVe = Math.min(1, devicePixelRatio);   // độ phân giải; máy yếu sẽ tự hạ dần
let banVe = 120;                               // còn bao nhiêu khung cần vẽ: bàn phím đứng yên thì không vẽ lại
renderer.setPixelRatio(tiLeVe);
renderer.transmissionResolutionScale = 0.75;   // lớp nhìn xuyên kính/thạch vẽ ở độ phân giải thấp hơn cho nhẹ
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;        // bóng đổ chỉ tính lại khi đổi bàn phím
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(22, 2.5, 0.1, 200);

(() => { // bản đồ phản chiếu cho thuỷ tinh
  const phong = new THREE.Scene();
  phong.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: '#cfc8b8', side: THREE.BackSide })));
  const den = (x, y, z, w, h, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); phong.add(m); };
  den(0, 8, 2, 8, 4, '#ffffff'); den(-7, 3, 4, 3, 5, '#fff6e0'); den(7, 4, -3, 3, 4, '#e8f4ff');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(phong, 0.03).texture;
})();
scene.add(new THREE.HemisphereLight('#fffaf0', '#8a8272', 1.0));
const mt = new THREE.DirectionalLight('#fff4e0', 2.0);
mt.position.set(4, 10, 6); mt.castShadow = true; mt.shadow.mapSize.set(1024, 1024); mt.shadow.radius = 3; mt.shadow.bias = -0.0005;
Object.assign(mt.shadow.camera, { left: -9, right: 9, top: 5, bottom: -5, near: 1, far: 30 });
scene.add(mt);

// ---------- Hình khối nút (hộp bo góc, thuôn lên trên) ----------
function hinhChuNhatBo(w, d, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return s;
}
const boNho = new Map();
function hinhNut(w, d, h, thuon = 0.14, vat = 0.05) {
  const k = [w, d, h, thuon].join();
  if (boNho.has(k)) return boNho.get(k);
  const g = new THREE.ExtrudeGeometry(hinhChuNhatBo(w - 2 * vat, d - 2 * vat, 0.1), { depth: h - 2 * vat, bevelEnabled: true, bevelSize: vat, bevelThickness: vat, bevelSegments: 3, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); g.translate(0, vat, 0);
  const p = g.attributes.position;
  // thuôn: mép trên lùi vào một khoảng như nhau ở mọi cạnh (phím dài không bị bóp méo)
  for (let i = 0; i < p.count; i++) { const lui = thuon * 0.45 * (p.getY(i) / h); p.setX(i, p.getX(i) * (1 - 2 * lui / w)); p.setZ(i, p.getZ(i) * (1 - 2 * lui / d)); }
  g.computeVertexNormals();
  boNho.set(k, g); return g;
}
const nhanBo = new Map();
// Nhãn nhỏ: miếng kem bo tròn có chữ, như nhãn trên nút phím artisan
const nhanNhoBo = new Map();
function nhanNho(chu) {
  if (!nhanNhoBo.has(chu)) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.beginPath(); x.roundRect(10, 14, 110, 110, 26); x.fill();
    x.fillStyle = '#f6f3ea'; x.beginPath(); x.roundRect(6, 6, 110, 110, 26); x.fill();
    x.font = '800 74px "Segoe UI", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#2c3a3a'; x.fillText(chu, 61, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    nhanNhoBo.set(chu, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), nhanNhoBo.get(chu));
  m.rotation.x = -Math.PI / 2; return m;
}
function chuNhan(nhan, mau, w, vien = null) {
  const k = nhan + mau + w + vien;
  if (!nhanBo.has(k)) {
    const c = document.createElement('canvas'); c.width = Math.round(128 * w); c.height = 128;
    const x = c.getContext('2d'); const nho = nhan.length > 1;
    x.font = `${vien ? 800 : 600} ${nho ? 34 : 70}px "Segoe UI", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (vien) { x.lineJoin = 'round'; x.lineWidth = 14; x.strokeStyle = vien; x.strokeText(nhan, c.width / 2, 66); }
    x.fillStyle = mau; x.fillText(nhan, c.width / 2, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    nhanBo.set(k, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62 * w, 0.62), nhanBo.get(k));
  m.rotation.x = -Math.PI / 2; return m;
}

// ---------- Vật liệu ----------
const M = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r, flatShading: true });
const VL = {
  dat: M('#7a5a3c', 1), da: M('#9a9890'), da2: M('#b8b4a8'), than: M('#6b4a2f'),
  la: M('#4f8f4a'), la2: M('#6aa850'), reu: M('#5e9a48'), canh: M('#8a6a40'),
  nam: M('#d8553f', 0.6), namChan: M('#f1e9d6'), tho: M('#f4f1ea', 0.9), thoTai: M('#f2c6c6'),
  hoa: ['#f2d24b', '#f08aa8', '#ffffff', '#b98cf0', '#ff9a52'].map(c => M(c, 0.6)),
  buom: new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: 0.6, side: THREE.DoubleSide }),
  vo: new THREE.MeshStandardMaterial({ color: '#e7e2d6', roughness: 0.7 }),
  vien: new THREE.MeshBasicMaterial({ color: '#f2d24b', transparent: true, opacity: 0.95 }),
};
const thuyTinh = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', transmission: 1, roughness: 0.0, ior: 1.3, thickness: 0.12,
  attenuationColor: new THREE.Color('#e8fff4'), attenuationDistance: 3, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2,
});

// ---------- Mảnh ghép hệ sinh thái (giống thu_nut/) ----------
const R = (seed) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const MAT_DAT = 0.26, CAO_KINH = 0.78, RONG_KINH = 1.0;
// Mỗi mảnh gộp thành MỘT khối (màu theo đỉnh) để 26 nút vẫn nhẹ: mỗi mảnh chỉ tốn 1 lần vẽ
const VL_MANH = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
function gop(ds) { // [hình, màu, x, y, z, co x, co y, co z, xoay x, xoay z]
  const P = [], N = [], C = [], m = new THREE.Matrix4(), c = new THREE.Color();
  for (const [g0, mau, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0] of ds) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(m); c.set(mau);
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); C.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
const Ic = (r, d = 1) => new THREE.IcosahedronGeometry(r, d), Non = (r, h, s = 7) => new THREE.ConeGeometry(r, h, s), Tru = (a, b, h, s = 6) => new THREE.CylinderGeometry(a, b, h, s);
const MAU_HOA = ['#f0708f', '#ffffff', '#f3c02f', '#a77be0', '#f27a3d'];
// Ba phong cách của bàn phím Sa bàn: màu đất, màu lõi đất, vỏ, tấm lót, kính, hạt bắn
const PHONG_CACH = {
  vuon: { co: '#6aa850', dat: '#7a5a3c', vo: '#aebf9e', lot: '#6d8063', phim: '#b4c4a2', dam: '#8aa678', kinh: '#e8fff4', hat: ['#f0708f', '#f3c02f', '#ffffff', '#74ad56'] },
  bien: { co: '#e6d3a4', dat: '#bca272', vo: '#a9cfe0', lot: '#5e8aa3', phim: '#a8cfdf', dam: '#6fa9c4', kinh: '#b7e6ff', hat: ['#bfe9ff', '#ffffff', '#6fd0e8'] },
  dong: { co: '#f3f7fb', dat: '#a8b6c4', vo: '#d6e1ec', lot: '#8498ac', phim: '#cfdbe6', dam: '#a8bccd', kinh: '#eaf4ff', hat: ['#ffffff', '#e4f0fb', '#cfe2f5'] },
};
const PC = () => PHONG_CACH[CD.phongCach] || PHONG_CACH.vuon;
const hinhManh = new Map();
function hinhCua(loai) {
  if (hinhManh.has(loai)) return hinhManh.get(loai);
  const THAN = '#7a5a3c', L1 = '#4f8f46', L2 = '#74ad56', L3 = '#2f6f42';
  let d = [];
  if (loai === 'da') d = [[Ic(0.05, 0), '#b9b5a9', 0, 0.02, 0, 1, 0.6, 1]];
  if (loai === 'canh') d = [[Tru(0.004, 0.006, 0.12, 4), '#8a6a40', 0, 0.03, 0, 1, 1, 1, 0, 1.2]];
  if (loai === 'reu') d = [[Ic(0.1, 1), L1, 0, 0, 0, 1, 0.42, 1], [Ic(0.06, 1), L2, 0.05, 0.015, 0.02, 1, 0.5, 1]];
  if (loai === 'co') d = [[Non(0.014, 0.13, 4), L1, 0, 0.06, 0], [Non(0.012, 0.1, 4), L2, 0.025, 0.045, 0.01, 1, 1, 1, 0.2, -0.3], [Non(0.012, 0.09, 4), L3, -0.024, 0.04, -0.008, 1, 1, 1, -0.2, 0.3]];
  if (loai.startsWith('hoa')) { const c = MAU_HOA[+loai[3]]; d = [[Tru(0.005, 0.006, 0.12, 4), L3, 0, 0.06, 0], [Ic(0.032, 1), c, 0, 0.125, 0, 1, 0.65, 1], [Ic(0.013, 0), '#f3c34e', 0, 0.143, 0]]; }
  if (loai === 'cay') d = [[Tru(0.016, 0.022, 0.09, 6), THAN, 0, 0.045, 0], [Non(0.12, 0.15, 8), L3, 0, 0.14, 0], [Non(0.092, 0.13, 8), L1, 0, 0.22, 0], [Non(0.06, 0.1, 8), L2, 0, 0.29, 0]];
  if (loai === 'caytron') d = [[Tru(0.014, 0.02, 0.13, 6), THAN, 0, 0.065, 0], [Ic(0.105, 1), L1, 0, 0.2, 0], [Ic(0.07, 1), L2, 0.05, 0.25, 0.03]];
  if (loai === 'xuongrong') d = [[Tru(0.038, 0.042, 0.17, 8), L3, 0, 0.085, 0], [Ic(0.038, 1), L3, 0, 0.17, 0], [Tru(0.016, 0.016, 0.06, 6), L1, 0.06, 0.11, 0, 1, 1, 1, 0, -1.1], [Tru(0.016, 0.016, 0.05, 6), L1, 0.085, 0.14, 0], [Ic(0.02, 1), '#f6b7c4', 0, 0.215, 0]];
  if (loai === 'nam') d = [[Tru(0.016, 0.02, 0.07, 6), '#f4ecdb', 0, 0.035, 0], [new THREE.SphereGeometry(0.05, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#e58a78', 0, 0.065, 0, 1, 0.8, 1], [Ic(0.009, 0), '#fff7ea', 0.022, 0.1, 0.012]];
  if (loai === 'tho') d = [[Ic(0.04, 1), '#f7f3ea', 0, 0.04, 0, 1, 0.85, 1.25], [Ic(0.027, 1), '#f7f3ea', 0, 0.075, 0.04], [Tru(0.006, 0.006, 0.04, 4), '#f2c6c6', -0.012, 0.115, 0.035], [Tru(0.006, 0.006, 0.04, 4), '#f2c6c6', 0.012, 0.115, 0.035]];
  // Đáy biển
  if (loai === 'rong') d = [[Non(0.02, 0.2, 5), '#2f8f6b', 0, 0.1, 0, 1, 1, 1, 0.12, 0.1], [Non(0.016, 0.16, 5), '#48a97c', 0.035, 0.08, 0.01, 1, 1, 1, -0.1, -0.2]];
  if (loai === 'sanho') d = [[Tru(0.016, 0.024, 0.14, 6), '#f0708f', 0, 0.07, 0], [Tru(0.011, 0.014, 0.1, 6), '#f58aa3', 0.045, 0.13, 0, 1, 1, 1, 0, -0.6], [Tru(0.011, 0.014, 0.09, 6), '#f58aa3', -0.04, 0.12, 0.01, 1, 1, 1, 0, 0.6], [Ic(0.016, 0), '#ffc2d0', 0.08, 0.17, 0], [Ic(0.016, 0), '#ffc2d0', -0.07, 0.15, 0.01]];
  if (loai === 'sanho2') d = [[Ic(0.07, 1), '#f3a25b', 0, 0.05, 0, 1, 0.85, 1], [Ic(0.04, 1), '#f7bd81', 0.05, 0.08, 0.03], [Ic(0.034, 1), '#f7bd81', -0.05, 0.075, -0.02]];
  if (loai === 'saobien') d = [0, 1, 2, 3, 4].map(i => [Non(0.02, 0.07, 4), '#ef7f4e', Math.cos(i * 1.257) * 0.035, 0.012, Math.sin(i * 1.257) * 0.035, 1, 1, 0.5, 1.57, i * 1.257 - 1.57]);
  if (loai === 'vo') d = [[new THREE.SphereGeometry(0.04, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#fff1dc', 0, 0, 0, 1, 0.7, 1.2]];
  if (loai === 'ca') d = [[Ic(0.04, 1), '#ffb13d', 0, 0, 0, 1.4, 0.8, 0.5], [Non(0.03, 0.05, 3), '#ff8e2b', -0.07, 0, 0, 0.5, 1, 1, 0, -1.57], [Ic(0.006, 0), '#1d2a35', 0.034, 0.008, 0.018]];
  // Mùa đông
  if (loai === 'ucTuyet') d = [[Ic(0.1, 1), '#fbfdff', 0, 0, 0, 1, 0.4, 1], [Ic(0.06, 1), '#eef4fa', 0.05, 0.015, 0.02, 1, 0.5, 1]];
  if (loai === 'thongtuyet') d = [[Tru(0.016, 0.022, 0.09, 6), THAN, 0, 0.045, 0], [Non(0.12, 0.15, 8), '#3f7a62', 0, 0.14, 0], [Non(0.086, 0.09, 8), '#f4f8fc', 0, 0.18, 0], [Non(0.09, 0.13, 8), '#4b8a70', 0, 0.22, 0], [Non(0.056, 0.08, 8), '#f4f8fc', 0, 0.28, 0]];
  if (loai === 'caykho') d = [[Tru(0.012, 0.02, 0.2, 5), '#7a6554', 0, 0.1, 0], [Tru(0.006, 0.009, 0.09, 4), '#7a6554', 0.03, 0.17, 0, 1, 1, 1, 0, -0.7], [Tru(0.006, 0.009, 0.08, 4), '#7a6554', -0.03, 0.15, 0, 1, 1, 1, 0, 0.8], [Ic(0.018, 0), '#f4f8fc', 0, 0.21, 0]];
  if (loai === 'nguoituyet') d = [[Ic(0.055, 1), '#fbfdff', 0, 0.05, 0], [Ic(0.038, 1), '#fbfdff', 0, 0.13, 0], [Non(0.008, 0.04, 4), '#f0883a', 0, 0.135, 0.05, 1, 1, 1, 1.57, 0], [Tru(0.03, 0.03, 0.03, 8), '#3a4652', 0, 0.175, 0]];
  const g = gop(d); hinhManh.set(loai, g); return g;
}
function manh(loai) { const o = new THREE.Mesh(hinhCua(loai), VL_MANH); o.castShadow = true; return o; }
// Công thức một góc vườn: ít mảnh, mọc dần theo sức sống (-1 = chỉ hiện khi đất khô)
function congThuc(rnd) {
  if (CD.phongCach === 'bien') {
    const chon = (ds) => ds[Math.floor(rnd() * ds.length)];
    return [['vo', 0], ['rong', 0], ['rong', 0], [chon(['sanho', 'sanho2']), 0], [chon(['sanho', 'sanho2', 'saobien']), 0], ['saobien', 0], ['da', 0], ...(rnd() < 0.5 ? [['ca', 0]] : [])];
  }
  if (CD.phongCach === 'dong') {
    const chon = (ds) => ds[Math.floor(rnd() * ds.length)];
    return [['ucTuyet', 0], ['ucTuyet', 0], ['thongtuyet', 0], [chon(['thongtuyet', 'caykho', 'nguoituyet']), 0], ['da', 0], [chon(['ucTuyet', 'caykho']), 0]];
  }
  const chon = (ds) => ds[Math.floor(rnd() * ds.length)], hoa = () => 'hoa' + Math.floor(rnd() * 5);
  const chinh = chon(['cay', 'caytron', 'caytron', 'xuongrong', 'nam']), phu = chon(['caytron', 'cay', 'nam', hoa(), hoa()]);
  return [['da', 0], ['canh', -1], ['reu', 6], ['reu', 16], ['co', 12], ['co', 30], [hoa(), 34], [hoa(), 50], [chinh, 44], [phu, 70], ...(rnd() < 0.22 ? [['tho', 86]] : [])];
}
const MAU_HAT = { dung: ['#f2d24b', '#f08aa8', '#ffffff', '#6aa850', '#4f8f4a', '#b98cf0'], sai: ['#9c8058', '#7a5a3c', '#b59a62'] };

// ---------- Dựng bàn phím ----------
const U = 1.0, KHE = 0.1, CAO_NHUA = 0.5;
// Màu phím: kem + phím chức năng xám ấm + điểm nhấn cam / bạc hà (theo ảnh tham khảo người dùng gửi)
const MAU_PHIM = { chu: '#f3eedf', chucNang: '#b4c4a2', cam: '#8aa678', bacHa: '#d9e3c8' };  // tông xanh lá dịu như ảnh tham khảo
const PHIM_CAM = new Set(['Enter', 'Backspace', 'ContextMenu']), PHIM_BAC_HA = new Set(['Space', 'Tab', 'CapsLock']);
const PHIM = {};    // mã → { goc, nhan, vien, vl, kinh?, y, v, giu, nhayDo }
const banPhim = new THREE.Group(); scene.add(banPhim);
// Vỏ hai lớp: khung ngoài sáng + tấm lót tối giữa các phím (khe tối làm phím nổi khối hơn)
const vo = new THREE.Mesh(hinhNut(15.9, 5.9, 0.6, 0, 0.2), new THREE.MeshStandardMaterial({ color: '#e4ded1', roughness: 0.45, metalness: 0.15 }));
vo.position.y = -0.63; vo.receiveShadow = true; vo.castShadow = true; banPhim.add(vo);
const LOT_TOI = '#3a3f3d', LOT_SANG = '#e9e4d9'; // tấm lót: tối cho bàn phím thường, sáng cho thạch (thạch trên nền tối sẽ đen đi)
const lot = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.05, 5.2), new THREE.MeshStandardMaterial({ color: LOT_TOI, roughness: 0.8 }));
lot.position.y = -0.03; lot.receiveShadow = true; banPhim.add(lot);
const hitTargets = [];

function taoNutKinh(nhanChu, seed) {
  const g = new THREE.Group();
  const datKhoi = new THREE.Mesh(new THREE.BoxGeometry(0.76, MAT_DAT - 0.04, 0.76), VL.dat);
  datKhoi.position.y = 0.02 + (MAT_DAT - 0.04) / 2; datKhoi.receiveShadow = true; g.add(datKhoi);
  const matCo = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 0.76), new THREE.MeshStandardMaterial({ color: '#b59a62', roughness: 1, flatShading: true }));
  matCo.position.y = MAT_DAT - 0.005; matCo.receiveShadow = true; g.add(matCo);
  const ds = [];
  const rnd = R(seed);
  // bướm (hiện khi đất tươi)
  const buom = (rnd() < 0.35 ? [0] : []).map(i => {   // bướm chỉ ở vài nút cho nhẹ
    const b = new THREE.Group();
    const canh = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.035), VL.buom); w.position.x = s * 0.025; const ga = new THREE.Group(); ga.add(w); b.add(ga); return ga; });
    b.scale.setScalar(0.001); g.add(b);
    return { b, canh, pha: i * 2.7 + rnd() };
  });
  const vk = voKinh(g, nhanChu);
  const kq = { g, matCo, ds, buom, ...vk, song: 100, hien: 100, seed };
  return kq;
}
// Vỏ thuỷ tinh + chữ + hạt bắn ra khi nhấn (dùng chung cho mọi nút thuỷ tinh)
// Gieo các mảnh theo phong cách đang chọn (đổi phong cách thì gieo lại)
function gieoVuon(k) {
  for (const p of k.ds) k.g.remove(p.m);
  k.ds.length = 0;
  const rnd = R(k.seed), cho = [];
  for (const [loai, nguong] of congThuc(rnd)) {
    let px, pz, n = 0;
    do { px = (rnd() - 0.5) * 0.6; pz = (rnd() - 0.5) * 0.6; n++; }
    while (n < 30 && cho.some(([a, b]) => Math.hypot(a - px, b - pz) < (['cay', 'caytron', 'thongtuyet', 'sanho'].includes(loai) ? 0.22 : 0.11)));
    cho.push([px, pz]);
    const m = manh(loai); m.position.set(px, MAT_DAT, pz); m.rotation.y = rnd() * Math.PI * 2; m.scale.setScalar(1.45); k.g.add(m);
    k.ds.push({ m, loai, nguong, tre: rnd() * 6, oy: 0, ov: 0, pha: rnd() * 6, x0: px, z0: pz, nhay: null, cho: 1 + rnd() * 3 });
  }
}
function voKinh(g, nhanChu) {
  const hat = Array.from({ length: 10 }, () => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.016), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.7 }));
    m.visible = false; m.castShadow = true; g.add(m);
    return { m, v: new THREE.Vector3(), w: new THREE.Vector3(), song: 0 };
  });
  const kinh = new THREE.Mesh(hinhNut(RONG_KINH - 0.06, RONG_KINH - 0.06, CAO_KINH, 0.14, 0.06), thuyTinh);
  kinh.castShadow = true; g.add(kinh);
  // chữ trên nút thuỷ tinh: đậm, màu tối, viền trắng dày để nổi trên nền sa bàn rối mắt
  // Ba kiểu chữ (chọn trong F2 → Hiển thị → Kiểu chữ trên nút thuỷ tinh):
  // chuGiua: chữ đậm viền trắng giữa mặt nút (kiểu cũ; kiểu "chỉ hiện khi cần" cũng dùng chữ này)
  const chuGiua = chuNhan(nhanChu, '#1f2a2b', 1, 'rgba(255,255,255,0.95)'); chuGiua.position.y = CAO_KINH + 0.004; chuGiua.scale.setScalar(0.72); g.add(chuGiua);
  // chuGoc: nhãn nhỏ màu kem ở góc trên bên trái, giữa nút để trống cho sa bàn
  const chuGoc = nhanNho(nhanChu); chuGoc.position.set(-0.27, CAO_KINH + 0.005, -0.27); g.add(chuGoc);
  // chuTruoc: chữ in ở mặt đứng phía trước, sát chân nút (hợp góc nhìn 30–60°)
  const chuTruoc = chuNhan(nhanChu, '#1f2a2b', 1, 'rgba(255,255,255,0.95)'); chuTruoc.rotation.set(0, 0, 0);
  chuTruoc.position.set(0, 0.6, (RONG_KINH - 0.06) / 2 - 0.02); chuTruoc.scale.setScalar(0.5); g.add(chuTruoc); // cao lên để phím hàng dưới không che
  return { hat, kinh, chuGiua, chuGoc, chuTruoc };
}
const TEX_LED = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
BO_CUC_PHIM.forEach((hang, hi) => {
  let u = 0;
  for (const [nhan, rong, ma, kt] of hang) {
    const cx = -7.5 + u + rong / 2, cz = (hi - 2) * U; u += rong;
    const goc = new THREE.Group(); goc.position.set(cx, 0, cz); banPhim.add(goc);
    const nhanG = new THREE.Group(); goc.add(nhanG);
    const w = rong * U - KHE, d = U - KHE;
    const vien = new THREE.Mesh(new THREE.ShapeGeometry(hinhChuNhatBo(w + 0.16, d + 0.16, 0.14)), VL.vien.clone());
    vien.rotation.x = -Math.PI / 2; vien.position.y = 0.004; vien.visible = false; goc.add(vien);
    const p = { goc, nhan: nhanG, vien, y: 0, v: 0, giu: false, nhayDo: 0, x: cx, z: cz };
    if (NUT_MANH.has(ma)) {
      const k = taoNutKinh(nhan, 17 + Object.keys(PHIM).length * 31);
      k.g.scale.setScalar(d / RONG_KINH);
      nhanG.add(k.g); p.kinh = k;
      if (ma === 'KeyF' || ma === 'KeyJ') { const gai = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: '#7f8a70' })); gai.position.set(0, CAO_KINH * (d / RONG_KINH) + 0.012, 0.24); nhanG.add(gai); }
      k.kinh.userData.ma = ma; hitTargets.push(k.kinh);
    } else {
      const mauNen = PHIM_CAM.has(ma) ? MAU_PHIM.cam : PHIM_BAC_HA.has(ma) ? MAU_PHIM.bacHa : kt === undefined ? MAU_PHIM.chucNang : MAU_PHIM.chu;
      const vl = new THREE.MeshPhysicalMaterial({ color: mauNen, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.5 });
      const m = new THREE.Mesh(hinhNut(w, d, CAO_NHUA, 0.18, 0.08), vl);
      m.castShadow = true; m.receiveShadow = true; m.userData.ma = ma; nhanG.add(m); hitTargets.push(m);
      const chu = chuNhan(nhan === 'space' ? '' : nhan, PHIM_CAM.has(ma) ? '#fff6ee' : kt === undefined ? '#6d6a60' : '#2c3a3a', Math.min(rong, 2.2));
      chu.position.y = CAO_NHUA + 0.003; chu.scale.setScalar(kt === undefined ? 0.8 : 0.7); nhanG.add(chu);
      if (ma === 'KeyF' || ma === 'KeyJ') { const gai = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: '#8c958f' })); gai.position.set(0, CAO_NHUA + 0.01, 0.24); nhanG.add(gai); }
      p.vl = vl; p.chu = chu; p.nhomMau = PHIM_CAM.has(ma) ? 'dam' : (!PHIM_BAC_HA.has(ma) && kt === undefined) ? 'phim' : '';
    }
    // LED: quầng sáng hắt lên tấm lót quanh chân phím
    Object.assign(p, { led: 0, ledHue: 0, ledRa: 0, ledMau: new THREE.Color() });
    p.quangLed = new THREE.Mesh(new THREE.PlaneGeometry(rong * U + 0.95, U + 0.95), new THREE.MeshBasicMaterial({ map: TEX_LED, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.quangLed.rotation.x = -Math.PI / 2; p.quangLed.position.y = 0.002; p.quangLed.visible = false; goc.add(p.quangLed);
    PHIM[ma] = p;
  }
});

// ---------- Khung hình, kích thước, máy quay ----------
// Máy quay quay quanh một điểm nhìn: kéo chuột trái (chỗ trống) = xoay, kéo nút giữa / lăn chuột = phóng gần-xa,
// kéo chuột phải = dời. Nhấp đúp chỗ trống = về góc ban đầu.
const nhin = { muc: new THREE.Vector3(), r: 40, theta: 0, phi: 0.95, daChinh: false };
const nhinGoc = {};
function datMay() {
  banVe = Math.max(banVe, 110);
  const sp = Math.sin(nhin.phi);
  camera.position.set(nhin.muc.x + nhin.r * sp * Math.sin(nhin.theta), nhin.muc.y + nhin.r * Math.cos(nhin.phi), nhin.muc.z + nhin.r * sp * Math.cos(nhin.theta));
  camera.lookAt(nhin.muc);
}
function kichThuoc() {
  // Khung vẽ phủ toàn màn hình nên phóng to thế nào cũng không bị cắt; bàn phím là đối tượng chính.
  const W = innerWidth, H = innerHeight, TREN = 108, DUOI = 106;   // chừa dải trên (chữ, nút) và dải dưới (gợi ý)
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  renderer.setSize(W, H, false); banVe = Math.max(banVe, 30);
  camera.aspect = W / H;
  camera.setViewOffset(W, H, 0, -(TREN - DUOI) / 2, W, H);        // dời hình xuống giữa vùng trống
  camera.updateProjectionMatrix();
  const goc = THREE.MathUtils.degToRad(Math.min(89.5, +(CD.gocNhin || 90))), phi = Math.PI / 2 - goc;
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), th = tv * camera.aspect;
  const Dw = 8.15 / (th * (W - 48) / W), Dh = (3.15 * Math.cos(phi) + 0.8 * Math.sin(phi)) / (tv * (H - TREN - DUOI) / H);
  const D = Math.max(Dw, Dh) * 1.06;
  Object.assign(nhinGoc, { muc: new THREE.Vector3(0, -0.1, 0.05), r: D * 100 / (CD.thuPhong || 100), theta: 0, phi });
  if (!nhin.daChinh) { nhin.muc.copy(nhinGoc.muc); Object.assign(nhin, { r: nhinGoc.r, theta: nhinGoc.theta, phi: nhinGoc.phi }); }
  datMay();
}
function veGoc() { // đổi góc bằng nút là đặt lại máy quay, không tính là lắc bàn phím
  nhin.daChinh = false; kichThuoc();
  Object.assign(dd, { theta: nhin.theta, phi: nhin.phi, x: nhin.muc.x, z: nhin.muc.z, wy: 0, wx: 0, vx: 0, vz: 0 });
}
addEventListener('resize', kichThuoc); kichThuoc();

// ---------- Vật lý & hệ sinh thái ----------
const muot = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const KHO = new THREE.Color('#b59a62'), XANH = new THREE.Color('#6aa850');
function banHat(k, kieu, so) {
  const mau = kieu === 'dung' ? PC().hat : MAU_HAT[kieu];
  let n = 0;
  for (const h of k.hat) {
    if (h.song > 0) continue;
    h.song = 1.6 + Math.random() * 0.6;
    h.m.visible = true; h.m.material.color.set(mau[Math.floor(Math.random() * mau.length)]);
    h.m.position.set((Math.random() - 0.5) * 0.5, (k.tam ? 0.35 : MAT_DAT + 0.04), (Math.random() - 0.5) * 0.5);
    const manh = kieu === 'dung' ? 1 : 0.55;
    h.v.set((Math.random() - 0.5) * 1.2, (1.3 + Math.random() * 0.9) * manh, (Math.random() - 0.5) * 1.2);
    h.w.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
    if (++n >= so) break;
  }
}
function capNhatKinh(k, dt, t) {
  k.hien += (k.song - k.hien) * Math.min(1, dt * 2);
  if (k.tam) { // nút chứa sa bàn trong kho: nảy theo lò xo, tươi/héo theo sức sống
    k.tuoi.value = muot(k.hien / 70);
    k.ov += (-k.oy * 140 - k.ov * 8) * dt; k.oy += k.ov * dt;
    k.tam.position.y = 0.06 + Math.max(0, k.oy) * 0.5;
    const co = 1 + Math.max(0, k.oy) * 0.25; k.tam.scale.set(1, co, 1);
  }
  if (k.matCo) k.matCo.material.color.copy(KHO).lerp(XANH, muot(k.hien / 60));
  for (const p of k.ds) {
    let s = p.nguong < 0 ? 1 - muot((k.hien - 8) / 14) : muot((k.hien - p.nguong - p.tre) / 8);
    if (p.nguong === 0) s = 1;
    const sc = p.m.scale.x + (Math.max(0.001, s * 1.45) - p.m.scale.x) * Math.min(1, dt * 6);  // 1.45: mảnh to hơn cho dễ nhìn
    p.m.scale.setScalar(sc); p.m.visible = sc > 0.01;
    // lò xo: mảnh nảy lên khi phím bị nhấn rồi đứng yên lại
    p.ov += (-p.oy * 140 - p.ov * 8) * dt; p.oy += p.ov * dt;
    // thỏ nhảy lung tung
    if (p.loai === 'tho' && sc > 0.5) {
      if (!p.nhay) { p.cho -= dt; if (p.cho <= 0) { const a = p.m.position.clone(); const b = new THREE.Vector3((Math.random() - 0.5) * 0.5, MAT_DAT, (Math.random() - 0.5) * 0.5); p.nhay = { a, b, t: 0 }; p.m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); } }
      else { p.nhay.t += dt / 0.35; const u = Math.min(1, p.nhay.t); p.m.position.lerpVectors(p.nhay.a, p.nhay.b, u); p.m.position.y = MAT_DAT + Math.sin(u * Math.PI) * 0.09 + p.oy; if (u >= 1) { p.nhay = null; p.cho = 0.6 + Math.random() * 2.2; } }
    } else p.m.position.y = MAT_DAT + Math.max(0, p.oy) + (p.loai === 'ca' ? 0.25 + Math.sin(t * 1.5 + p.pha) * 0.03 : 0);
    if (p.loai === 'co' || p.loai === 'rong' || p.loai.startsWith('hoa')) p.m.rotation.z = Math.sin(t * 1.8 + p.pha) * 0.08 + p.ov * 0.04;
  }
  const tuoi = muot((k.hien - 68) / 10);
  for (const b of k.buom) {
    const s = b.b.scale.x + (Math.max(0.001, tuoi) - b.b.scale.x) * Math.min(1, dt * 3);
    b.b.scale.setScalar(s); b.b.visible = s > 0.01;
    const q = t * 0.8 + b.pha;
    b.b.position.set(Math.sin(q) * 0.24, 0.48 + Math.sin(q * 2.3) * 0.08, Math.cos(q * 0.9) * 0.24);
    b.b.rotation.y = -q;
    const v = Math.sin(t * 18 + b.pha) * 0.9; b.canh[0].rotation.y = v; b.canh[1].rotation.y = -v;
  }
  for (const h of k.hat) {
    if (h.song <= 0) continue;
    h.song -= dt;
    h.v.y -= 4.2 * dt; h.m.position.addScaledVector(h.v, dt);
    h.m.rotation.x += h.w.x * dt; h.m.rotation.y += h.w.y * dt;
    const P = h.m.position, VACH = 0.34;
    if (P.y < MAT_DAT + 0.01) { P.y = MAT_DAT + 0.01; h.v.y *= -0.35; h.v.x *= 0.6; h.v.z *= 0.6; h.w.multiplyScalar(0.5); }
    if (P.y > CAO_KINH - 0.06) { P.y = CAO_KINH - 0.06; h.v.y *= -0.4; }
    if (Math.abs(P.x) > VACH) { P.x = Math.sign(P.x) * VACH; h.v.x *= -0.5; }
    if (Math.abs(P.z) > VACH) { P.z = Math.sign(P.z) * VACH; h.v.z *= -0.5; }
    h.m.scale.setScalar(Math.min(1, h.song * 2));
    if (h.song <= 0) h.m.visible = false;
  }
}

let can = null, hienThi = true, truoc = performance.now();
// Một bước khung hình (dùng chung cho vòng lặp thường và khi quay video từng khung)
// Đổi loại bàn phím: 'kinh' (nhựa + nút sa bàn) hoặc 'slime'. Khung bàn phím dùng chung.
let slime = null, dangSlime = false, su = null, dangSu = false, thuong = null, dangThuong = false;
let pcDang = null;
function datPhongCach() {
  if (pcDang === CD.phongCach) return;
  pcDang = CD.phongCach; const pc = PC();
  XANH.set(pc.co); VL.dat.color.set(pc.dat); thuyTinh.attenuationColor.set(pc.kinh);
  for (const ma in PHIM) { const q = PHIM[ma]; if (q.kinh) gieoVuon(q.kinh); if (q.nhomMau) q.vl.color.set(pc[q.nhomMau]); }
}
function apDungLoai() {
  banVe = Math.max(banVe, 120); renderer.shadowMap.needsUpdate = true;
  dangSlime = CD.loaiPhim === 'slime';
  if (dangSlime && !slime) slime = taoBanPhimSlime(PHIM, banPhim);
  if (slime) { slime.nhom.visible = dangSlime; slime.capNhatMau(); }
  dangSu = CD.loaiPhim === 'su';
  if (dangSu && !su) su = taoBanPhimSu(PHIM, banPhim);
  if (su) { su.nhom.visible = dangSu; if (dangSu) su.capNhatKieu(); }
  renderer.toneMappingExposure = dangSu ? (CD.kieuSu === 'matchuoc' ? 0.92 : 1.35) : 1;   // men sứ cần sáng hơn cho trắng
  dangThuong = CD.loaiPhim === 'thuong';
  if (dangThuong && !thuong) thuong = taoBanPhimThuong(PHIM, banPhim);
  if (thuong) { thuong.nhom.visible = dangThuong; if (dangThuong) thuong.capNhatMau(); }
  for (const ma in PHIM) PHIM[ma].nhan.visible = !dangSlime && !dangSu && !dangThuong;
  if (CD.loaiPhim === 'kinh') datPhongCach();
  lot.material.color.set(dangSlime ? (CD.led && CD.led !== 'tat' ? '#30353a' : LOT_SANG) : dangSu || dangThuong ? LOT_TOI : PC().lot);
  vo.material.color.set(CD.loaiPhim === 'kinh' ? PC().vo : dangSu && CD.kieuSu === 'matchuoc' ? '#5d3a24' : '#e4ded1');  // bật LED thì tấm lót tối để thấy ánh sáng
}
const diaHit = () => (dangSlime ? slime.hit : dangSu ? su.hit : dangThuong ? thuong.hit : hitTargets);
// Bàn phím bị xoay/dời (kéo chuột) cũng là nó đang chuyển động: đo gia tốc mỗi khung để các nút chịu quán tính
const dd = { theta: nhin.theta, phi: nhin.phi, x: nhin.muc.x, z: nhin.muc.z, wy: 0, wx: 0, vx: 0, vz: 0 };
function doChuyenDong(dt) {
  if (dt <= 0) return null;
  const gh = (v) => Math.max(-30, Math.min(30, v));
  const wy = gh((nhin.theta - dd.theta) / dt), wx = gh((nhin.phi - dd.phi) / dt), vx = gh((nhin.muc.x - dd.x) / dt), vz = gh((nhin.muc.z - dd.z) / dt);
  const kq = { ay: wy - dd.wy, ax: wx - dd.wx, lx: vx - dd.vx, lz: vz - dd.vz, w2: wy * wy };
  Object.assign(dd, { theta: nhin.theta, phi: nhin.phi, x: nhin.muc.x, z: nhin.muc.z, wy, wx, vx, vz });
  return kq;
}
// Bàn phím Sa bàn: nút nhựa nảy nhẹ, mảnh trong nút thuỷ tinh xóc lên, hạt đang bay bị văng theo
function rungSaBan(p, d) {
  const K = CD.quanTinh, m = Math.min(4, (Math.abs(d.ay) * Math.hypot(p.x, p.z) * 0.3 + Math.abs(d.lx) * 0.35 + Math.abs(d.lz) * 0.35 + Math.abs(d.ax) * 0.5) * K);
  if (m < 0.05) return;
  p.v -= m * 0.35;
  if (!p.kinh) return;
  for (const s of p.kinh.ds) s.ov += m * (0.3 + Math.random() * 0.5);
  if (p.kinh.tam) p.kinh.ov += m * 0.5;
  for (const h of p.kinh.hat) if (h.song > 0) { h.v.x += d.lx * 0.3; h.v.z += d.lz * 0.3; }
  if (m > 1.6) banHat(p.kinh, 'dung', 3);
}
let demGo = 0;
// LED mỗi phím: 'go' = sáng lên màu mới khi bị gõ rồi tắt dần; 'cauVong' = sóng cầu vồng chạy, gõ thì sáng bừng
function capNhatLed(p, dt, t) {
  const che = CD.led || 'tat';
  p.led = Math.max(0, p.led - dt * 1.5);
  if (che === 'tat') { p.ledRa = 0; p.quangLed.visible = false; return; }
  let muc = p.led, hue = p.ledHue;
  if (che === 'cauVong') { const nen = ((p.x + p.z) * 0.035 - t * 0.14) % 1; muc = Math.max(0.42, p.led); if (p.led < 0.05) hue = (nen + 1) % 1; }
  p.ledMau.setHSL(hue, 0.95, 0.58); p.ledRa = muc;
  p.quangLed.visible = muc > 0.01; p.quangLed.material.opacity = muc * 0.9; p.quangLed.material.color.copy(p.ledMau);
}
function buocKhung(dt, t) {
  const dong = doChuyenDong(dt);
  if (dangSlime) slime.buoc(dt, can, dong);
  {
    for (const ma in PHIM) {
      const p = PHIM[ma];
      const dich = p.giu ? -0.1 : 0;
      p.v += (-(p.y - dich) * 260 - p.v * 16) * dt; p.y += p.v * dt;   // phím lún xuống rồi bật lại có nảy
      p.nhan.position.y = p.y;
      capNhatLed(p, dt, t);
      if (dangSlime) { p.vien.visible = false; continue; }
      if (p.nhayDo > 0) { p.nhayDo -= dt; }
      p.vien.visible = ma === can || p.nhayDo > 0 || p.ledRa > 0.02;
      if (p.vien.visible) { if (p.nhayDo > 0) p.vien.material.color.set('#e0685a'); else if (ma === can) p.vien.material.color.set('#f2d24b'); else p.vien.material.color.copy(p.ledMau); }
      if (p.vl) { if (ma === can) { p.vl.emissive.set('#f2d24b'); p.vl.emissiveIntensity = 0.25; } else if (p.ledRa > 0.01) { p.vl.emissive.copy(p.ledMau); p.vl.emissiveIntensity = p.ledRa * 0.85; } else p.vl.emissive.set('#000000'); }
      if (dong) rungSaBan(p, dong);
      if (p.kinh && CD.loaiPhim === 'kinh') {
        capNhatKinh(p.kinh, dt, t);
        const kieu = CD.kieuChu || 'goc', an = CD.hienChu === false;
        p.kinh.chuGoc.visible = !an && kieu === 'goc';
        p.kinh.chuTruoc.visible = !an && kieu === 'truoc';
        p.kinh.chuGiua.visible = !an && (kieu === 'giua' || (kieu === 'khiCan' && (ma === can || p.giu)));
      }
    }
    if (dangSu) su.buoc(can);
    if (dangThuong) thuong.buoc(can);
    renderer.render(scene, camera);
  }
}
let lePhim = false, demDo = 0, tongDo = 0;
function khung(tg) {
  const tho = (tg - truoc) / 1000, dt = Math.min(0.05, tho), t = tg / 1000; truoc = tg;
  if (hienThi && !window.QUAY) {
    // Đứng yên thì không vẽ. Riêng LED cầu vồng và cây cỏ đung đưa cần chạy liên tục (cây cỏ chỉ cần 30 khung/giây).
    lePhim = !lePhim;
    const lienTuc = CD.led === 'cauVong' || (CD.loaiPhim === 'kinh' && lePhim);
    if (banVe > 0 || lienTuc) {
      if (banVe > 0) banVe--;
      buocKhung(dt, t);
      // Máy yếu: đo thời gian mỗi khung, chậm liên tục thì tự hạ độ phân giải
      if (tho < 0.2) { tongDo += tho; if (++demDo >= 40) { if (tongDo / demDo > 0.03 && tiLeVe > 0.65) { tiLeVe = Math.max(0.65, tiLeVe - 0.1); renderer.setPixelRatio(tiLeVe); kichThuoc(); } demDo = 0; tongDo = 0; } }
    }
  }
  requestAnimationFrame(khung);
}
requestAnimationFrame(khung);

// ---------- Chuột: nhấn phím, xoay, phóng, dời ----------
const ray = new THREE.Raycaster(), chuot = new THREE.Vector2();
let dangGiu = null, keo = null, keoNut = null;
function diemChuot(e) {
  const r = cv.getBoundingClientRect();
  chuot.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(chuot, camera);
}
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerdown', (e) => {
  diemChuot(e);
  if (e.button === 0) {
    const hit = ray.intersectObjects(diaHit(), false)[0];
    if (hit) { dangGiu = hit.object.userData.ma; keoNut = { x: e.clientX, y: e.clientY }; window.GAME.giuPhim(dangGiu, true); window.GAME.nhanPhim(dangGiu); return; }
  }
  if (e.button === 1) e.preventDefault();
  keo = { nut: e.button, x: e.clientX, y: e.clientY, theta: nhin.theta, phi: nhin.phi, r: nhin.r, muc: nhin.muc.clone() };
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', (e) => {
  if (dangGiu && dangSlime && keoNut) { const k = nhin.r * 0.0012; slime.keo(dangGiu, (e.clientX - keoNut.x) * k, (e.clientY - keoNut.y) * k); }  // kéo nút thạch cho lắc
  if (!keo) return;
  const dx = e.clientX - keo.x, dy = e.clientY - keo.y;
  nhin.daChinh = true;
  if (keo.nut === 0) {                       // xoay
    nhin.theta = keo.theta - dx * 0.006;
    nhin.phi = Math.min(1.45, Math.max(0.12, keo.phi - dy * 0.005));
  } else if (keo.nut === 1) {                // phóng gần / xa
    nhin.r = Math.min(90, Math.max(2.5, keo.r * Math.exp(dy * 0.006)));
  } else {                                   // dời
    const k = keo.r * 0.0012;
    const phai = new THREE.Vector3(Math.cos(nhin.theta), 0, -Math.sin(nhin.theta));
    const toi = new THREE.Vector3(Math.sin(nhin.theta), 0, Math.cos(nhin.theta));
    nhin.muc.copy(keo.muc).addScaledVector(phai, -dx * k).addScaledVector(toi, -dy * k);
  }
  datMay();
});
cv.addEventListener('pointerup', () => { keo = null; });
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  diemChuot(e);
  // phóng về phía điểm dưới con trỏ (để soi gần đúng nút mình muốn)
  const mat = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1), diem = new THREE.Vector3();
  const kHe = Math.exp(Math.sign(e.deltaY) * 0.12);
  const rMoi = Math.min(90, Math.max(2.5, nhin.r * kHe));
  if (ray.ray.intersectPlane(mat, diem) && rMoi < nhin.r) nhin.muc.lerp(diem, 1 - rMoi / nhin.r);
  nhin.r = rMoi; nhin.daChinh = true; datMay();
}, { passive: false });
cv.addEventListener('dblclick', (e) => { diemChuot(e); if (!ray.intersectObjects(diaHit(), false)[0]) veGoc(); });
addEventListener('pointerup', () => { if (dangGiu) { if (slime) slime.keo(dangGiu, 0, 0); keoNut = null; window.GAME.giuPhim(dangGiu, false); dangGiu = null; } });

// ---------- Giao tiếp với game ----------
window.BanPhim3D = {
  // kq: 'dung' (gõ đúng) | 'sai' (gõ sai) | 'tudo' (gõ chơi ngoài lượt)
  nhan(ma, kq) {
    const p = PHIM[ma]; if (!p) return;
    banVe = Math.max(banVe, 110);
    p.v -= 1.2;
    p.led = 1; p.ledHue = kq === 'sai' ? 0 : (demGo++ * 0.083) % 1;   // mỗi lần gõ một màu mới; gõ sai màu đỏ
    if (dangSlime) { slime.nhan(ma, kq); return; }
    if (kq === 'sai') p.nhayDo = 0.35;
    // rung lan ra cả bàn phím: nút thuỷ tinh càng gần phím vừa nhấn càng nảy mạnh
    for (const m in PHIM) {
      const q = PHIM[m]; if (!q.kinh) continue;
      const kc = Math.hypot(q.x - p.x, q.z - p.z), luc = (m === ma ? 1 : 0.45 * Math.exp(-kc / 2.2)) * (kq === 'sai' ? 0.7 : 1);
      for (const s of q.kinh.ds) s.ov += luc * (0.6 + Math.random() * 0.8);
      if (q.kinh.tam) q.kinh.ov += luc * 0.9;
    }
    if (p.kinh) {
      banHat(p.kinh, kq === 'sai' ? 'sai' : 'dung', kq === 'dung' ? 10 : 5);
    }
  },
  giu(ma, bat) { const p = PHIM[ma]; if (p && p.giu !== bat) { p.giu = bat; banVe = Math.max(banVe, 60); } },
  datCan(ma) { if (can !== ma) { can = ma; banVe = Math.max(banVe, 10); } },
  doiLoai: apDungLoai,
  hien(bat) { apDungLoai(); hienThi = bat; cv.classList.toggle('an', !bat); if (bat) kichThuoc(); },
  buocKhung, PHIM, renderer, scene, camera, nhin, datMay, veGoc, ve: () => renderer.render(scene, camera),
};
window.GAME && window.GAME.capNhatHien && window.GAME.capNhatHien();
