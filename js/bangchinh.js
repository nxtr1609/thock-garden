'use strict';
// BẢNG CÀI ĐẶT (F2): thẻ theo mục, tự lưu trong trình duyệt.
window.BangChinh = (() => {
  const el = document.getElementById('bang-chinh');
  let theDang = 0, khiDoi = () => {};
  function dongMuc(m) {
    const v = CD[m.khoa]; let o = '';
    if (m.loai === 'so') o = `<input type="range" min="${m.min}" max="${m.max}" step="${m.buoc}" value="${v}" data-khoa="${m.khoa}"><span class="bc-so" id="so-${m.khoa}">${v}</span>`;
    else if (m.loai === 'bat') o = `<input type="checkbox" ${v ? 'checked' : ''} data-khoa="${m.khoa}">`;
    else o = `<select data-khoa="${m.khoa}">${m.chon.map(g => `<option value="${g}" ${g === v ? 'selected' : ''}>${t('opt_' + g)}</option>`).join('')}</select>`;
    return `<div class="bc-muc"><label>${t(m.ten)}</label><div class="bc-dk">${o}</div></div>`;
  }
  function dung() {
    el.innerHTML = `
      <div class="bc-dau" id="bc-dau"><b>${t('settings')}</b><button class="bc-x" data-lenh="dong">✕</button></div>
      <div class="bc-the">${CAI_DAT_MAU.map((m, i) => `<button class="${i === theDang ? 'dang' : ''}" data-the="${i}">${t(m.the)}</button>`).join('')}</div>
      <div class="bc-than">${CAI_DAT_MAU[theDang].muc.filter(m => !m.an).map(dongMuc).join('')}</div>
      <div class="bc-cuoi"><button data-lenh="macdinh">${t('reset')}</button></div>`;
  }
  const timMuc = (k) => { for (const a of CAI_DAT_MAU) for (const m of a.muc) if (m.khoa === k) return m; };
  el.addEventListener('input', (e) => {
    const k = e.target.dataset.khoa; if (!k) return;
    const m = timMuc(k);
    CD[k] = m.loai === 'so' ? parseFloat(e.target.value) : m.loai === 'bat' ? e.target.checked : e.target.value;
    if (m.loai === 'so') document.getElementById('so-' + k).textContent = CD[k];
    CaiDat.luu(); khiDoi(k);
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.the) { theDang = +b.dataset.the; dung(); return; }
    if (b.dataset.lenh === 'dong') an();
    if (b.dataset.lenh === 'macdinh') { const nn = CD.ngonNgu; CaiDat.mauVe(); CD.ngonNgu = nn; CaiDat.luu(); dung(); khiDoi('*'); }
  });
  let keo = null;
  el.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#bc-dau') || e.target.closest('button')) return;
    const r = el.getBoundingClientRect(); keo = { dx: e.clientX - r.left, dy: e.clientY - r.top }; el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => { if (keo) { el.style.left = (e.clientX - keo.dx) + 'px'; el.style.top = (e.clientY - keo.dy) + 'px'; el.style.right = 'auto'; } });
  el.addEventListener('pointerup', () => { keo = null; });
  function hien() { dung(); el.classList.remove('an'); }
  function an() { el.classList.add('an'); }
  return { hien, an, batTat() { el.classList.contains('an') ? hien() : an(); }, dung, get mo() { return !el.classList.contains('an'); }, set khiDoi(f) { khiDoi = f; } };
})();
