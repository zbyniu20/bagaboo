// Mały pomocnik asercji dla testów w czystym Node: check(opis, warunek), done(nazwa) kończy z kodem 1 przy błędach.
let fails = 0, total = 0;
export function check(name, cond, extra) { total++; if (!cond) { fails++; console.log('FAIL ' + name + (extra !== undefined ? ' -> ' + extra : '')); } }
export function done(label) {
    if (fails) { console.log(fails + ' of ' + total + ' checks failed (' + label + ')'); process.exit(1); }
    console.log('ok   ' + label + ': ' + total + ' checks');
}
