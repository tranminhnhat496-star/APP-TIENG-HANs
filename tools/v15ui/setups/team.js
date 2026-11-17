const T = window.__v23._test;
const en = (typeof T.en23 === 'function') ? T.en23() : T.en23;
['dragon','fox','owl'].forEach(sp => { const p = T.newPet(sp); en.pets[p.id] = p; });
const ids = Object.keys(en.pets);
T.setTeamSlot(0, ids[0]); T.setTeamSlot(1, ids[1]); T.setTeamSlot(2, ids[2]);
window.__v23.openHub('team');
