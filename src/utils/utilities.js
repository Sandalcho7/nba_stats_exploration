import crypto from 'crypto';

export function generateId(one, two, three) {
    const data = `${one}|${two}|${three}`;
    const hash = crypto.createHash('md5').update(data).digest();
    return Math.abs(hash.readInt32BE(0));
}

export function normalizePlayerName(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeAustrianName(name) {
    const austrianAccents = {
        ä: 'ae',
        ö: 'oe',
        ü: 'ue',
        ß: 'ss',
    };

    return name.replace(/[äöüß]/g, (match) => austrianAccents[match]);
}
