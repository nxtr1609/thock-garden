'use strict';
// ============================================================
// ĐOẠN VĂN ĐỂ GÕ và BỐ CỤC BÀN PHÍM ẢO
// ============================================================

// Đoạn văn tiếng Anh tự viết (chữ thường, không dấu câu cho bản thử).
window.DS_VAN = [
  { id: 'hanggiua', ten: 'Home row', muc: 'de', van: 'a sad lad had a glass flask' },
  { id: 'hangtren', ten: 'Top row', muc: 'de', van: 'we write pretty poetry to our quiet typewriter' },
  { id: 'hatmam', ten: 'The seed', muc: 'vua', van: 'the seed wakes up in the warm soil and reaches for the light' },
  { id: 'mua', ten: 'Soft rain', muc: 'vua', van: 'soft rain falls on the hill and the river sings to the old trees' },
  { id: 'thuvien', ten: 'Old library', muc: 'kho', van: 'the old library smells of paper and rain, and every shelf hides a story nobody has read in years' },
  { id: 'cao', ten: 'Little fox', muc: 'kho', van: 'a little fox walks through the tall grass looking for a quiet place to sleep' },
];

// Màu của bàn phím thường
window.MAU_THUONG = [['tuyet', '#f2efe8'], ['than', '#2c3036'], ['duong', '#2a4f8f'], ['la', '#3f7d5a'], ['do', '#c8423a'], ['cam', '#ee8a3c'], ['vang', '#f1c94f'], ['hong', '#f2a7bd'], ['tim', '#a58bd8'], ['bacha', '#a8dcc8']];

// Bàn phím ảo kiểu thật — mọi phím đều nhấn được (sáng lên + kêu).
// [nhãn, độ rộng (đơn vị phím), mã phím của trình duyệt (event.code), ký tự gõ ra (nếu có)]
window.BO_CUC_PHIM = (() => {
  const chu = (s) => s.split('').map(c => [c, 1, 'Key' + c, c]);
  return [
    [['`', 1, 'Backquote', '`'], ...'1234567890'.split('').map(d => [d, 1, 'Digit' + d, d]), ['-', 1, 'Minus', '-'], ['=', 1, 'Equal', '='], ['⌫', 2, 'Backspace']],
    [['tab', 1.5, 'Tab'], ...chu('QWERTYUIOP'), ['[', 1, 'BracketLeft', '['], [']', 1, 'BracketRight', ']'], ['\\', 1.5, 'Backslash', '\\']],
    [['caps', 1.75, 'CapsLock'], ...chu('ASDFGHJKL'), [';', 1, 'Semicolon', ';'], ["'", 1, 'Quote', "'"], ['enter', 2.25, 'Enter']],
    [['shift', 2.25, 'ShiftLeft'], ...chu('ZXCVBNM'), [',', 1, 'Comma', ','], ['.', 1, 'Period', '.'], ['/', 1, 'Slash', '/'], ['shift', 2.75, 'ShiftRight']],
    [['ctrl', 1.25, 'ControlLeft'], ['win', 1.25, 'MetaLeft'], ['alt', 1.25, 'AltLeft'], ['space', 6.25, 'Space', ' '],
     ['alt', 1.25, 'AltRight'], ['fn', 1.25, 'Fn'], ['☰', 1.25, 'ContextMenu'], ['ctrl', 1.25, 'ControlRight']],
  ];
})();
// Phím lớn có thanh cân bằng → tiếng trầm hơn
window.PHIM_LON = new Set(['Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight']);
