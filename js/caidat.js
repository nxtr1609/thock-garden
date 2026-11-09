'use strict';
// ============================================================
// NƠI CÀI ĐẶT CHUNG. Mỗi mục: khoa, loai (so/bat/chon), gt (mặc định);
// ten và nhãn lựa chọn là khoá trong bảng chữ (js/chu.js).
// Mục có an: true không hiện trong bảng cài đặt (đã có nút trên màn hình).
// ============================================================
window.CAI_DAT_MAU = [
  { the: 'tabSound', muc: [
    { khoa: 'boPhim', loai: 'chon', gt: 'kem', chon: ['kem', 'thock', 'clack', 'go'], ten: 'setKeySound' },
    { khoa: 'amPhim', loai: 'so', gt: 1.3, min: 0, max: 2, buoc: 0.05, ten: 'setKeyVol' },
    { khoa: 'tachTraiPhai', loai: 'so', gt: 0.6, min: 0, max: 1, buoc: 0.05, ten: 'setStereo' },
    { khoa: 'tiengSai', loai: 'bat', gt: true, ten: 'setErrSound' },
    { khoa: 'tiengSlime', loai: 'bat', gt: true, ten: 'setSlimeSound' },
    { khoa: 'tiengSu', loai: 'bat', gt: true, ten: 'setSuSound' },
    { khoa: 'nhacNen', loai: 'chon', gt: 'ai1', chon: ['ai1', 'ai2', 'tat'], ten: 'setMusic' },
    { khoa: 'amNen', loai: 'so', gt: 0.45, min: 0, max: 1, buoc: 0.05, ten: 'setMusicVol' },
    { khoa: 'amChung', loai: 'so', gt: 0.8, min: 0, max: 1, buoc: 0.05, ten: 'setMaster' },
    { khoa: 'daoDong', loai: 'so', gt: 4, an: true },
  ]},
  { the: 'tabKeyboard', muc: [
    { khoa: 'hienChu', loai: 'bat', gt: true, ten: 'setLegends' },
    { khoa: 'kieuChu', loai: 'chon', gt: 'goc', chon: ['goc', 'truoc', 'khiCan', 'giua'], ten: 'setGlassLegend' },
    { khoa: 'matSlime', loai: 'bat', gt: true, ten: 'setFaces' },
    { khoa: 'doCungSlime', loai: 'so', gt: 0.45, min: 0, max: 1, buoc: 0.05, ten: 'setFirm' },
    { khoa: 'doNhunSlime', loai: 'so', gt: 0.3, min: 0, max: 1, buoc: 0.05, ten: 'setDamp' },
    { khoa: 'quanTinh', loai: 'so', gt: 1, min: 0, max: 2.5, buoc: 0.1, ten: 'setInertia' },
    { khoa: 'thuPhong', loai: 'so', gt: 100, min: 60, max: 250, buoc: 5, ten: 'setZoom' },
    { khoa: 'coChu', loai: 'so', gt: 36, min: 24, max: 56, buoc: 2, ten: 'setTextSize' },
    { khoa: 'hienBanPhim', loai: 'bat', gt: true, an: true },
    { khoa: 'loaiPhim', loai: 'chon', gt: 'slime', an: true },
    { khoa: 'mauSlime', loai: 'chon', gt: 'ocean', an: true },
    { khoa: 'kieuSu', loai: 'chon', gt: 'trang', an: true },
    { khoa: 'phongCach', loai: 'chon', gt: 'vuon', an: true },
    { khoa: 'mauThuong', loai: 'chon', gt: 'tuyet', an: true },
    { khoa: 'led', loai: 'chon', gt: 'tat', an: true },
    { khoa: 'gocNhin', loai: 'chon', gt: '90', an: true },
    { khoa: 'ngonNgu', loai: 'chon', gt: 'en', an: true },
  ]},
];

window.CD = {};
window.CaiDat = (() => {
  const KHOA_LUU = 'gamenho_caidat_v3';
  const choLuu = !/[?&]thu=1/.test(location.search);  // ?thu=1: bot kiểm tra, không chạm dữ liệu thật
  function mauVe() { for (const t of CAI_DAT_MAU) for (const m of t.muc) CD[m.khoa] = m.gt; }
  function docLuu(khoa, macDinh) {
    if (!choLuu) return macDinh;
    try { const v = localStorage.getItem(khoa); return v ? JSON.parse(v) : macDinh; } catch (e) { return macDinh; }
  }
  function ghiLuu(khoa, giaTri) { if (choLuu) try { localStorage.setItem(khoa, JSON.stringify(giaTri)); } catch (e) {} }
  function nap() { mauVe(); const d = docLuu(KHOA_LUU, {}); for (const k in d) if (k in CD) CD[k] = d[k]; }
  const luu = () => ghiLuu(KHOA_LUU, CD);
  nap();
  return { nap, luu, mauVe, choLuu, docLuu, ghiLuu };
})();
