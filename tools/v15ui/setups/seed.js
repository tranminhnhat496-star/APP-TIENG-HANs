localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}));
const raw = localStorage.getItem('hanvocab.v1');
if (raw) { const S = JSON.parse(raw); S.xp = 12500; S.v7 = S.v7 || {}; S.v7.gems = 42; S.v7.en15 = S.v7.en15 || {}; S.v7.en15.langChoice = true; localStorage.setItem('hanvocab.v1', JSON.stringify(S)); }
