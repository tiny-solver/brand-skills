// 시험 글꼴 만들기 — node make.mjs (opentype.js 2.0.0 이 있어야 한다 — made.json needs · 만드는 법은 font-license/fixtures/make.mjs 와 같다). 만든 파일은 git 에 두지 않는다 — 목록 · sha256 은 made.json
// latin.otf = 영문 대소문자 · 숫자 · 문장 부호 몇 · hangul.otf = '작은 상자' 네 글자 + 'hello' 소문자
// broken-cmap.otf = hangul.otf 의 cmap 하위 표 자리를 파일 밖으로 바꾼 것 · broken-head.ttc = 'ttcf' 머리만 있는 14바이트
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { font, write } from '../../font-license/fixtures/make.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const latin = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?';
write(path.join(HERE, 'latin.otf'), font(latin, { family: 'Criteria Test Latin', license: 'This Font Software is licensed under the SIL Open Font License, Version 1.1.' }));
const hangul = font('작은상자hello', { family: 'Criteria Test Hangul', license: 'This Font Software is licensed under the SIL Open Font License, Version 1.1.' });
write(path.join(HERE, 'hangul.otf'), hangul);
// cmap 의 첫 인코딩 기록 오프셋(표 머리 4바이트 뒤 · 기록 안 4바이트 뒤)을 0xfffffff0 으로
const broken = Buffer.from(hangul), tables = broken.readUInt16BE(4);
for (let i = 0; i < tables; i++) {
  const r = 12 + i * 16;
  if (broken.toString('latin1', r, r + 4) === 'cmap') broken.writeUInt32BE(0xfffffff0, broken.readUInt32BE(r + 8) + 4 + 4);
}
write(path.join(HERE, 'broken-cmap.otf'), broken);
write(path.join(HERE, 'broken-head.ttc'), Buffer.concat([Buffer.from('ttcf'), Buffer.alloc(10)]));
console.log('✓ 시험 글꼴', HERE);
