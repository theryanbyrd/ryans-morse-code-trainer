// 20 realistic HF CW (Morse) QSO scenarios. Each is a scripted back-and-forth:
// turns you SEND ('s' — you key it) alternate with turns you RECEIVE ('r' — you
// copy it by ear). Text is authentic ham shorthand:
//   CQ = calling · DE = "this is" · K = over (any) · KN = over (named only)
//   R = roger · RST/599 = signal report · = (BT) = break/separator
//   TU/TNX = thanks · UR = your · OP/NAME = operator · QTH = location
//   HW? = how copy? · FB = fine business · GM/GA/GE = good morning/aft/eve
//   QRL? = is freq busy? · QRZ? = who's calling? · QSY = change freq
//   QRM = interference · QRN = static · QSB = fading · QRP = low power
//   QRS = send slower · QSL = confirm · PSE = please · AGN = again
//   73 = best regards · 72 = 73 for QRP · 88 = love · SK = end of contact
//   CL = closing down · /P = portable · /M = mobile

export type QsoTurn = { d: 's' | 'r'; t: string };
export type QsoScenario = { id: string; title: string; tag: string; turns: QsoTurn[] };

/** The operator's own callsign used throughout the scenarios. */
export const MY_CALL = 'K7RB';

/**
 * Normalize a transmission for lenient copy-checking: the learner shouldn't need
 * to type the "=" break or "/" slash exactly. BT (=) and / become spaces, other
 * punctuation is dropped, case and spacing are normalized.
 */
export function normalizeQso(s: string): string {
  return s
    .toUpperCase()
    .replace(/[=/]/g, ' ')
    .replace(/[?.,+]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const QSO_SCENARIOS: QsoScenario[] = [
  {
    id: 'answer-cq',
    title: 'Answer a CQ',
    tag: 'Basic',
    turns: [
      { d: 'r', t: 'CQ CQ CQ DE W1ABC W1ABC K' },
      { d: 's', t: 'W1ABC DE K7RB K7RB K' },
      { d: 'r', t: 'K7RB DE W1ABC = GA UR RST 599 = OP TOM QTH MA = HW? K' },
      { d: 's', t: 'W1ABC DE K7RB = TU TOM UR RST 579 = OP RYAN QTH UT = K' },
      { d: 'r', t: 'K7RB DE W1ABC = FB RYAN TNX QSO = 73 SK' },
      { d: 's', t: 'W1ABC DE K7RB = 73 SK' },
    ],
  },
  {
    id: 'call-cq',
    title: 'Call CQ',
    tag: 'Basic',
    turns: [
      { d: 's', t: 'CQ CQ CQ DE K7RB K7RB K' },
      { d: 'r', t: 'K7RB DE N5DX N5DX K' },
      { d: 's', t: 'N5DX DE K7RB = GM UR RST 599 = NAME RYAN QTH UT = HW? K' },
      { d: 'r', t: 'K7RB DE N5DX = TU RST 559 = NAME BOB QTH TX = K' },
      { d: 's', t: 'N5DX DE K7RB = FB BOB TNX = 73 SK' },
      { d: 'r', t: 'K7RB DE N5DX = 73 EE' },
    ],
  },
  {
    id: 'qrl-check',
    title: 'QRL? then call CQ',
    tag: 'Etiquette',
    turns: [
      { d: 's', t: 'QRL? DE K7RB' },
      { d: 'r', t: 'QRL DE G4XYZ' },
      { d: 's', t: 'R QSY TU' },
      { d: 's', t: 'CQ CQ DE K7RB K7RB K' },
      { d: 'r', t: 'K7RB DE K9AA K' },
      { d: 's', t: 'K9AA DE K7RB = UR 599 NAME RYAN K' },
      { d: 'r', t: 'K7RB DE K9AA = UR 599 NAME AL = 73' },
      { d: 's', t: 'TU AL 73 SK' },
    ],
  },
  {
    id: 'contest',
    title: 'Contest exchange',
    tag: 'Contest',
    turns: [
      { d: 's', t: 'CQ TEST DE K7RB K7RB TEST' },
      { d: 'r', t: 'K7RB DE VE3ZZ' },
      { d: 's', t: 'VE3ZZ 599 007 007' },
      { d: 'r', t: 'QSL 599 042 042' },
      { d: 's', t: 'TU QRZ DE K7RB TEST' },
    ],
  },
  {
    id: 'ragchew-rig',
    title: 'Ragchew: rig & antenna',
    tag: 'Ragchew',
    turns: [
      { d: 'r', t: 'K7RB DE DL1XX = GE RYAN = UR RST 579 = RIG FT991 5W = ANT DIPOLE = HW? K' },
      { d: 's', t: 'DL1XX DE K7RB = FB HANS = RIG K3 100W = ANT VERTICAL = WX SUNNY = K' },
      { d: 'r', t: 'K7RB DE DL1XX = TU = WX RAIN HR = QSB NW = 73 SK' },
      { d: 's', t: 'DL1XX DE K7RB = TU HANS = 73 DX SK' },
      { d: 'r', t: 'K7RB DE DL1XX = 73 EE' },
    ],
  },
  {
    id: 'work-dx',
    title: 'Work some DX',
    tag: 'DX',
    turns: [
      { d: 's', t: 'CQ DX CQ DX DE K7RB K' },
      { d: 'r', t: 'K7RB DE JA1QRP JA1QRP K' },
      { d: 's', t: 'JA1QRP DE K7RB = UR 559 559 = NAME RYAN = K' },
      { d: 'r', t: 'K7RB DE JA1QRP = R UR 579 = NAME KEN = TU NEW ONE 73' },
      { d: 's', t: 'JA1QRP DE K7RB = TU KEN FB DX = 73 SK' },
    ],
  },
  {
    id: 'pota',
    title: 'POTA activation',
    tag: 'POTA',
    turns: [
      { d: 's', t: 'CQ POTA CQ POTA DE K7RB/P K' },
      { d: 'r', t: 'K7RB DE W4AB W4AB K' },
      { d: 's', t: 'W4AB DE K7RB = UR 599 = QTH PARK K1234 = K' },
      { d: 'r', t: 'K7RB DE W4AB = TU 599 = QSL PARK = 73' },
      { d: 's', t: 'W4AB DE K7RB = TU 73 QRZ POTA SK' },
    ],
  },
  {
    id: 'sota',
    title: 'SOTA summit',
    tag: 'SOTA',
    turns: [
      { d: 's', t: 'CQ SOTA DE K7RB/P K' },
      { d: 'r', t: 'K7RB DE N0XX N0XX K' },
      { d: 's', t: 'N0XX DE K7RB = 599 = SUMMIT W7U/SL001 = K' },
      { d: 'r', t: 'K7RB DE N0XX = 599 = TNX SUMMIT = 72 SK' },
      { d: 's', t: 'N0XX DE K7RB = 72 QRP SK' },
    ],
  },
  {
    id: 'qrp',
    title: 'QRP to QRP',
    tag: 'QRP',
    turns: [
      { d: 'r', t: 'K7RB DE K2QRP = UR 449 QSB = PWR 5W = HW? K' },
      { d: 's', t: 'K2QRP DE K7RB = R 449 = ES PWR 3W QRP = NAME RYAN K' },
      { d: 'r', t: 'K7RB DE K2QRP = FB QRP TO QRP = NAME JIM = 72 SK' },
      { d: 's', t: 'K2QRP DE K7RB = 72 TU JIM SK' },
      { d: 'r', t: 'K7RB DE K2QRP = 72 EE' },
    ],
  },
  {
    id: 'qrm',
    title: 'Rough conditions',
    tag: 'Conditions',
    turns: [
      { d: 'r', t: 'K7RB DE F5AB = UR RST 339 QRM = PSE AGN K' },
      { d: 's', t: 'F5AB DE K7RB = UR RST 559 559 = QTH UT UT = AGN? K' },
      { d: 'r', t: 'K7RB DE F5AB = R QSL 559 = TU = QRN HVY = 73 SK' },
      { d: 's', t: 'F5AB DE K7RB = QSL 73 SK' },
      { d: 'r', t: 'K7RB DE F5AB = 73 EE' },
    ],
  },
  {
    id: 'qsl-info',
    title: 'QSL card info',
    tag: 'Ragchew',
    turns: [
      { d: 's', t: 'CQ DE K7RB K7RB K' },
      { d: 'r', t: 'K7RB DE VK2XX K' },
      { d: 's', t: 'VK2XX DE K7RB = UR 599 NAME RYAN K' },
      { d: 'r', t: 'K7RB DE VK2XX = 599 NAME STEVE = QSL VIA LOTW HW? K' },
      { d: 's', t: 'VK2XX DE K7RB = QSL LOTW OK TU = 73 SK' },
      { d: 'r', t: 'K7RB DE VK2XX = R LOTW = 73 SK' },
    ],
  },
  {
    id: 'answer-qrz',
    title: 'Answer a QRZ?',
    tag: 'Basic',
    turns: [
      { d: 'r', t: 'QRZ? DE W8XX K' },
      { d: 's', t: 'W8XX DE K7RB K7RB K' },
      { d: 'r', t: 'K7RB DE W8XX = UR 579 QTH OH = NAME JEN K' },
      { d: 's', t: 'W8XX DE K7RB = TU JEN 579 = QTH UT NAME RYAN K' },
      { d: 'r', t: 'K7RB DE W8XX = FB 73 SK' },
      { d: 's', t: 'W8XX DE K7RB = 73 SK' },
    ],
  },
  {
    id: 'skcc',
    title: 'Straight-key (SKCC)',
    tag: 'SKCC',
    turns: [
      { d: 's', t: 'CQ SKCC DE K7RB K' },
      { d: 'r', t: 'K7RB DE K3SK K3SK K' },
      { d: 's', t: 'K3SK DE K7RB = 589 = NAME RYAN SKCC 12345 K' },
      { d: 'r', t: 'K7RB DE K3SK = 579 = NR 6789 FB = SK' },
      { d: 's', t: 'K3SK DE K7RB = TU 73 SK' },
    ],
  },
  {
    id: 'weather',
    title: 'Ragchew: weather',
    tag: 'Ragchew',
    turns: [
      { d: 'r', t: 'K7RB DE W6WX = GE = UR 599 = WX FOGGY 12C = NAME SAM K' },
      { d: 's', t: 'W6WX DE K7RB = FB SAM = WX CLR 20C = NAME RYAN = K' },
      { d: 'r', t: 'K7RB DE W6WX = TU RYAN = GUD DX = 73 EE' },
      { d: 's', t: 'W6WX DE K7RB = 73 SK' },
      { d: 'r', t: 'K7RB DE W6WX = EE' },
    ],
  },
  {
    id: 'elmer',
    title: 'Help a new op (QRS)',
    tag: 'Elmer',
    turns: [
      { d: 'r', t: 'K7RB DE KD9NEW = PSE QRS = IM NEW K' },
      { d: 's', t: 'KD9NEW DE K7RB = R QRS OK = UR 599 = NAME RYAN K' },
      { d: 'r', t: 'K7RB DE KD9NEW = TU RYAN = 559 = NAME MAX = 1ST CW QSO' },
      { d: 's', t: 'KD9NEW DE K7RB = FB MAX GL ON CW = 73 SK' },
      { d: 'r', t: 'K7RB DE KD9NEW = TU 73' },
    ],
  },
  {
    id: 'mobile',
    title: 'Work a mobile station',
    tag: 'Basic',
    turns: [
      { d: 'r', t: 'CQ CQ DE N7MOB/M N7MOB/M K' },
      { d: 's', t: 'N7MOB DE K7RB K7RB K' },
      { d: 'r', t: 'K7RB DE N7MOB = UR 559 MOBILE = QTH I80 UT = K' },
      { d: 's', t: 'N7MOB DE K7RB = TU 559 = 73 SAFE TRVL SK' },
      { d: 'r', t: 'K7RB DE N7MOB = 73 SK' },
    ],
  },
  {
    id: 'closing',
    title: 'Station closing down (CL)',
    tag: 'Ragchew',
    turns: [
      { d: 's', t: 'CQ DE K7RB K7RB K' },
      { d: 'r', t: 'K7RB DE G0OLD G0OLD K' },
      { d: 's', t: 'G0OLD DE K7RB = 599 NAME RYAN K' },
      { d: 'r', t: 'K7RB DE G0OLD = 599 NAME JOHN = MUST QRT XYL CALLS HI = 73 CL' },
      { d: 's', t: 'G0OLD DE K7RB = HI HI = 73 GB SK' },
    ],
  },
  {
    id: 'pileup',
    title: 'DXpedition pileup (split)',
    tag: 'DX',
    turns: [
      { d: 'r', t: 'QRZ DX DE 3B8ABC UP K' },
      { d: 's', t: 'K7RB K7RB' },
      { d: 'r', t: 'K7RB 599' },
      { d: 's', t: 'TU 599 599' },
      { d: 'r', t: 'QRZ UP DE 3B8ABC' },
    ],
  },
  {
    id: 'how-copy',
    title: 'How copy? (repeats)',
    tag: 'Conditions',
    turns: [
      { d: 's', t: 'N4SIG DE K7RB = UR RST 339 QSB = HW CPY? K' },
      { d: 'r', t: 'K7RB DE N4SIG = R UR ALSO 339 = QRN HR = PSE NAME AGN K' },
      { d: 's', t: 'N4SIG DE K7RB = NAME RYAN RYAN = QTH UT = K' },
      { d: 'r', t: 'K7RB DE N4SIG = TU RYAN = 73 SK' },
      { d: 's', t: 'N4SIG DE K7RB = 73 SK' },
    ],
  },
  {
    id: 'antenna',
    title: 'Ragchew: antenna project',
    tag: 'Ragchew',
    turns: [
      { d: 'r', t: 'K7RB DE W0ANT = UR 599 = JUST PUT UP NEW BEAM 3EL YAGI = HW? K' },
      { d: 's', t: 'W0ANT DE K7RB = FB = BIG SIG = I RUN DIPOLE ON 40M = K' },
      { d: 'r', t: 'K7RB DE W0ANT = TU = TRY A VERT NEXT = GUD LUCK = 73 SK' },
      { d: 's', t: 'W0ANT DE K7RB = TU FER TIPS = 73 SK' },
      { d: 'r', t: 'K7RB DE W0ANT = 73 EE' },
    ],
  },
];
