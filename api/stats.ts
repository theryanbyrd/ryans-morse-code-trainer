// GET /api/stats — public, anonymised aggregate usage statistics.
import { getNum, scard, ALPHABET, K, storeEnabled } from './_lib';

type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

export default async function handler(_req: unknown, res: Res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (!storeEnabled) {
    res.status(200).json({ enabled: false, message: 'Analytics storage is not configured.' });
    return;
  }

  const [answers, correct, learned, completes, sessions, learners] = await Promise.all([
    getNum(K.answers),
    getNum(K.correct),
    getNum(K.learned),
    getNum(K.completes),
    getNum(K.sessions),
    scard('rmct:anon'),
  ]);

  const perLetter = await Promise.all(
    ALPHABET.map(async (l) => {
      const [att, cor] = await Promise.all([getNum(K.att(l)), getNum(K.cor(l))]);
      return { letter: l, attempts: att, correct: cor, accuracy: att ? Math.round((cor / att) * 100) : 0 };
    }),
  );

  res.status(200).json({
    enabled: true,
    sessions,
    learners,
    answers,
    correct,
    accuracy: answers ? Math.round((correct / answers) * 100) : 0,
    lettersLearned: learned,
    courseCompletions: completes,
    perLetter,
  });
}
