/**
 * Reviewed step skeleton for two-addend addition. Only {a,b} change per instance.
 * Used for text_steps numeric_entry — not LLM prose.
 */
import { columnWorking, onesDigit } from './additionLayout.js';

const asAbsInt = (n) => Math.trunc(Math.abs(Number(n) || 0));

export const additionWorkedSteps = (a, b) => {
  const left = asAbsInt(a);
  const right = asAbsInt(b);
  const work = columnWorking(left, right);
  const onesA = onesDigit(left);
  const onesB = onesDigit(right);
  const onesSum = onesA + onesB;
  const onesWrite = onesSum % 10;
  const carry = work.onesCarry;

  const steps = [
    {
      id: 'align',
      text: `Line up ${left} and ${right}. Ones under ones.`,
      reveal: 'addends'
    },
    {
      id: 'ones',
      text:
        carry > 0
          ? `${onesA} + ${onesB} = ${onesSum}. Write ${onesWrite}.`
          : `${onesA} + ${onesB} = ${onesSum}. Write ${onesSum} in the ones.`,
      reveal: 'ones'
    },
    {
      id: 'carry',
      text: carry > 0 ? `Carry ${carry} to the tens.` : 'Nothing to carry.',
      reveal: 'carry'
    },
    {
      id: 'sum',
      text: `The total is ${work.sum}.`,
      reveal: 'sum'
    }
  ];
  return steps;
};

export const additionWorkedStepTexts = (a, b) => additionWorkedSteps(a, b).map((s) => s.text);
