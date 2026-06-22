const CODE_OFFSET = 0x00002D58;
const KEY = new Uint8Array([0x25, 0x1F, 0x1D, 0x17, 0x13, 0x11, 0x0B, 0x07]);

const CODE_REGISTRY: [string, string][] = [
    ["A", "А"], ["B", "Б"], ["C", "Ц"], ["D", "Д"], ["E", "Е"], ["F", "Ф"], ["G", "Г"], ["H", "Ю"],
    ["+", "+"], ["J", "Й"], ["K", "К"], ["L", "Л"], ["M", "М"], ["N", "Н"], ["\\", "\\"], ["P", "П"],
    ["Q", "Я"], ["R", "Р"], ["S", "С"], ["T", "Т"], ["U", "У"], ["V", "В"], ["W", "Ш"], ["X", "Х"],
    ["Y", "Ч"], ["Z", "Ж"], ["a", "а"], ["b", "б"], ["c", "ц"], ["d", "д"], ["e", "е"], ["f", "ф"],
    ["g", "г"], ["h", "ю"], ["i", "и"], ["j", "й"], ["k", "к"], ["&", "&"], ["m", "м"], ["n", "н"],
    ["o", "о"], ["p", "п"], ["q", "я"], ["r", "р"], ["s", "с"], ["t", "т"], ["u", "у"], ["v", "в"],
    ["w", "ш"], ["x", "х"], ["y", "ч"], ["z", "ж"], ["/", "/"], ["1", "1"], ["2", "2"], ["3", "3"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["?", "?"], ["!", "!"]
];

const REVERSE_LOOKUP_MAP: Record<string, number> = {};
CODE_REGISTRY.forEach((pair, index) => {
    REVERSE_LOOKUP_MAP[pair[0]] = index;
    REVERSE_LOOKUP_MAP[pair[1]] = index;
});

export interface DecodeResult {
    englishCode: string;
    russianCode: string;
}

function swapBits(byte1Index: number, byte2Index: number, byte1: number, byte2: number, bytes: Uint8Array): void {
    const bit1 = (bytes[byte1Index] >> byte1) & 1;
    const bit2 = (bytes[byte2Index] >> byte2) & 1;

    if (bit1 === 0) 
    	bytes[byte2Index] &= ~(1 << byte2);
    else 
    	bytes[byte2Index] |= (1 << byte2);

    if (bit2 === 0) 
    	bytes[byte1Index] &= ~(1 << byte1);
    else 
    	bytes[byte1Index] |= (1 << byte1);
}

function readCode(bytes: Uint8Array): { russian: string; english: string } {
    let intCode = 0;
    intCode |= ((bytes[8] & (0x1E000000 >> 25)) << 25);
    intCode |= ((bytes[9] & (0x01000000 >> 19)) << 19);
    intCode |= ((bytes[9] & (0x00001F00 >> 8)) << 8);
    intCode |= ((bytes[10] & (0x001F0000 >> 14)) << 14);
    intCode |= ((bytes[10] & (0x0000000C >> 2)) << 2);
    intCode |= ((bytes[11] & (0x00000003 << 4)) >> 4);

    const l1 = (intCode >> 24) & 0xFF;
    const d1 = (intCode >> 16) & 0xFF;
    const l2 = (intCode >> 8) & 0xFF;
    const d2 = (intCode >> 0) & 0xFF;

    const letters1 = CODE_REGISTRY[l1] || ["?", "?"];
    const letters2 = CODE_REGISTRY[l2] || ["?", "?"];

    return {
        russian: `${letters1[1]}${d1}${letters2[1]}${d2}`,
        english: `${letters1[0]}${d1}${letters2[0]}${d2}`
    };
}

export function decodeInternetCode(code: string): DecodeResult {
    if (code.length !== 16)
        throw new Error("Internet code must be 16 characters.");

    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        const val = REVERSE_LOOKUP_MAP[code.charAt(i)];

        if (val === undefined) 
            throw new Error(`Invalid character: ${code.charAt(i)}`);
            
        bytes[i] = val;
    }

    for (let i = 6; i > 0; i--) {
        swapBits(2 * i + Math.floor(i / 6), 15, i % 6, i - 1, bytes);
    }

    const index = (bytes[15] >> 3) & 0b111;
    const firstRoundKey = KEY[index];
    const secondRoundKey = KEY[KEY.length - 1 - index];

    for (let i = 30; i > 0; i--) {
        const m = (i * firstRoundKey + 45) % 90;
        const n = (i * secondRoundKey + 45) % 90;
        const p = m % 6;
        const q = n % 6;
        swapBits(Math.floor((m - p) / 6), Math.floor((n - q) / 6), p, q, bytes);
    }

    const thirdRoundKey = KEY[bytes[15] & 0b111];
    for (let i = 40; i > 0; i--) {
        const m = (i * thirdRoundKey) % 90;
        const n = m % 6;
        bytes[Math.floor((m - n) / 6)] ^= (1 << n);
    }

    const codes = readCode(bytes);
    return { englishCode: codes.english, russianCode: codes.russian, };
}

export function findCodeInSave(buffer: ArrayBuffer): DecodeResult | null {
    if (buffer.byteLength <= CODE_OFFSET) return null;

    const view = new DataView(buffer);
    let russianCode = "";
    let englishCode = "";

    for (let i = 0; i < 16; i++) {
        const b = view.getUint8(CODE_OFFSET + i);
        if (i % 4 === 0) {
            const index = (b > 26 ? b + 26 : b) - 1;
            const entry = CODE_REGISTRY[index];
            
            if (entry) {
                englishCode += entry[0];
                russianCode += entry[1];
            }
        }
    }

    return { englishCode, russianCode };
}
