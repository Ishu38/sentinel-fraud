const ML_BLOCK = 0.85;
const ML_REVIEW = 0.70;
const ML_CHALLENGE = 0.50;

export function decide({ ml, rules }) {
  const p = ml.fraud_probability;
  const reasons = [...(rules?.reasons ?? [])];

  if (rules?.block) {
    reasons.push({ code: 'RULE_BLOCK', detail: 'rules required block' });
    return { verdict: 'BLOCK', reasons, mlProbability: p };
  }

  if (p >= ML_BLOCK) {
    reasons.push({ code: 'ML_CRITICAL', detail: `p=${p.toFixed(4)} ≥ ${ML_BLOCK}` });
    return { verdict: 'BLOCK', reasons, mlProbability: p };
  }

  if (p >= ML_REVIEW) {
    reasons.push({ code: 'ML_HIGH', detail: `p=${p.toFixed(4)} ≥ ${ML_REVIEW}` });
    return { verdict: 'REVIEW', reasons, mlProbability: p };
  }

  if (p >= ML_CHALLENGE || rules?.challenge) {
    if (p >= ML_CHALLENGE) {
      reasons.push({ code: 'ML_ELEVATED', detail: `p=${p.toFixed(4)} ≥ ${ML_CHALLENGE}` });
    }
    return { verdict: 'CHALLENGE', reasons, mlProbability: p };
  }

  return {
    verdict: 'ALLOW',
    reasons: reasons.length ? reasons : [{ code: 'CLEAN', detail: `p=${p.toFixed(4)}` }],
    mlProbability: p,
  };
}

export const decisionThresholds = { ML_BLOCK, ML_REVIEW, ML_CHALLENGE };
