// 시험 글꼴 만들기 — node make.mjs (opentype.js 2.0.0 이 있어야 한다 — made.json needs). 만든 파일은 git 에 두지 않는다 — 목록 · sha256 은 made.json
// 글자 모양은 네모 하나뿐인 시험용 글꼴이다. 라이선스 칸 · fsType · 함께 둔 라이선스 파일만 다르게 만든다.
// 측정기 시험(measure.test.mjs)이 파일이 없으면 먼저 부른다. 여러 시험이 함께 불러도 되게 임시 파일에 쓰고 이름을 바꾼다
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ot from 'opentype.js';
const opentype = ot.default ?? ot;

const HERE = path.dirname(fileURLToPath(import.meta.url));
// 같은 바이트는 opentype.js 판에 달려 있다 — made.json needs 의 판(opentype.js@<판>)과 다르면 알린다(만들기는 한다)
const WANT = (JSON.parse(fs.readFileSync(path.join(HERE, 'made.json'), 'utf8')).needs || []).find((n) => n.startsWith('opentype.js@'))?.slice('opentype.js@'.length);
let GOT = null;
try { GOT = createRequire(import.meta.url)('opentype.js/package.json').version; } catch {}
if (WANT && GOT && GOT !== WANT) console.error(`! opentype.js ${GOT} — made.json 의 바이트는 ${WANT} 로 만든 것이다(npm install --no-save opentype.js@${WANT})`);
// 같은 바이트로 다시 만들어지게 — opentype.js 가 head 표 modified 에 지금 시각을 넣으므로 시각을 고정한다
const FIXED = Date.UTC(2026, 9, 1);
globalThis.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [FIXED])); } static now() { return FIXED; } };
const box = () => { const p = new opentype.Path(); p.moveTo(100, 0); p.lineTo(500, 0); p.lineTo(500, 700); p.lineTo(100, 700); p.close(); return p; };
export function font(chars, opts = {}) {
  const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 600, path: new opentype.Path() })];
  for (const c of [...new Set(chars)]) glyphs.push(new opentype.Glyph({ name: `u${c.codePointAt(0).toString(16)}`, unicode: c.codePointAt(0), advanceWidth: 600, path: box() }));
  const f = new opentype.Font({ familyName: opts.family || 'Criteria Test', styleName: 'Regular', unitsPerEm: 1000, ascender: 800, descender: -200, createdTimestamp: FIXED / 1000, glyphs, license: opts.license, licenseURL: opts.licenseURL, tables: { os2: { fsType: opts.fsType ?? 0 } } });
  return Buffer.from(f.toArrayBuffer());
}
export const write = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); const tmp = `${p}.${process.pid}.tmp`; fs.writeFileSync(tmp, data); fs.renameSync(tmp, p); };
const W = (rel, data) => write(path.join(HERE, rel), data);

// 직접 돌릴 때만 만든다(glyph-coverage 의 make.mjs 는 font() 만 불러 쓴다) — 링크로 이어진 자리(실제 경로가 다른 임시 폴더 등)도 같은 파일로 본다
const real = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  const abc = 'abcdefghijklmnopqrstuvwxyz';
  W('ofl/ofl.otf', font(abc, { family: 'Criteria Test OFL', license: 'This Font Software is licensed under the SIL Open Font License, Version 1.1.', licenseURL: 'https://openfontlicense.org' }));
  W('personal/personal.otf', font(abc, { family: 'Criteria Test Personal', license: 'Free for personal use only. Commercial use requires a separate license.', fsType: 2 }));
  W('apache/apache.otf', font(abc, { family: 'Criteria Test Apache', licenseURL: 'https://www.apache.org/licenses/LICENSE-2.0', fsType: 8 }));
  W('with-file/plain.otf', font(abc, { family: 'Criteria Test Plain' }));
  W('with-file/OFL.txt', 'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n');
  W('ko-deny/ko.otf', font(abc, { family: 'Criteria Test KO', license: '무료로 쓸 수 있으나 로고(CI · BI) 사용은 불가합니다.' }));
  W('none/none.otf', font(abc, { family: 'Criteria Test None' }));
  // 함께 허락하는 말 — 금지 문구로 잡히면 안 된다
  W('both/both.otf', font(abc, { family: 'Criteria Test Both', license: 'Free for personal use and commercial use. 100% free for commercial and non-commercial use. 상업적, 비상업적 용도 구분 없이 무료로 사용할 수 있습니다.' }));
  W('ofl-ko/ofl-ko.otf', font(abc, { family: 'Criteria Test OFL KO', license: 'SIL Open Font License 1.1. 상업적 · 비상업적 이용 모두 가능.' }));
  // 깨진 파일 — 'ttcf' 머리만 있는 14바이트(측정기는 던지지 않고 missing 에 적는다)
  W('broken/head.ttc', Buffer.concat([Buffer.from('ttcf'), Buffer.alloc(10)]));
  console.log('✓ 시험 글꼴', HERE);
}
