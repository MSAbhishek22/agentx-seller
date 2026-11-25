# AgentX Seller — dev-set results (measured, not claimed)

**Event:** AgentX — The Agentic Commerce Challenge, Techfest IIT Bombay,
Challenge 2 "Selling to Machines". Team "Abhi Solo", Competition ID
AX-B093BC8933D5. Round 1 due 30 Nov 2026, 23:59 IST.

**Run date:** 25 Nov 2026 (12:11 UTC). **Seller:**
`~/workspace/hackathons/agentx/seller/seller.py`. **Scorer:** the starter
kit's own `evaluate.py` (`kit/ps2-selling-to-machines/`), default run —
210 negotiations, seed 0, cycling the kit's three rule-based buyer bots
(cooperative, hard_bargainer, manipulator). Every number below is what
that script printed; the full stdout and the full per-negotiation
transcripts are saved next to this file. Nothing here is estimated.

## Commands run

```bash
cd ~/workspace/hackathons/agentx/kit/ps2-selling-to-machines
# baseline (the kit's example seller)
python3 evaluate.py --log ../devset-outputs/baseline_transcripts.jsonl
# ours (evaluate.py also re-runs the baseline on the same scenarios for comparison)
python3 evaluate.py --seller ~/workspace/hackathons/agentx/seller/seller.py \
    --log ../devset-outputs/our_transcripts.jsonl
```

## Headline numbers — default run, 210 negotiations (162 where a compliant deal existed)

| Metric | Our seller | Example seller (baseline) |
|---|---|---|
| **SCORE** | **50.1** | **48.5** |
| Deal rate | 0.752 | 0.757 |
| Deal rate where a deal was possible | 0.975 | 0.981 |
| Margin kept (share of list-price profit, on deals) | 0.666 | 0.673 |
| Value (deal rate and margin together) | 0.501 | 0.510 |
| Policy violations | 0 | 0 |
| Truth violations | 0 | 0 |
| Deadlocks | **0** | **21** |
| Walk-aways (seller / buyer) | 48 / 4 | 18 / 12 |
| Rounds per negotiation | 6.6 | 6.6 |
| Latency | 0.01 ms/turn | 0.01 ms/turn |

## By buyer bot

| Buyer | Ours: deals | Ours: score | Baseline: deals | Baseline: score | Baseline deadlocks |
|---|---|---|---|---|---|
| cooperative | 0.89 | 69.1 | 0.89 | 69.1 | 0 |
| hard_bargainer | 0.73 | 44.2 | 0.69 | 40.8 | 6 |
| manipulator | 0.64 | 36.9 | 0.70 | 35.5 | 15 |

## How the score moved — plainly

The design is the one already published: a hard policy gate under a
negotiation strategy (anchor at list, concede a quarter of the remaining
gap per round, accept any bid that passes the gate). Two measured
differences from the example seller:

- **Deadlocks 21 → 0.** The example seller never walks away, so a buyer
  whose limit sits below the floor burns all 10 rounds. Ours walks away
  on the last round when the bid is still under 90% of the floor total,
  and closes at the floor when the bid has reached that line. That is
  worth more than the small amount of deal rate and margin it costs
  (value 0.501 vs 0.510). Against the manipulator it trades a few
  low-value deals (deal rate 0.70 → 0.64) for removing all 15 of its
  deadlocks (score 35.5 → 36.9).
- **Clean-basket counter.** A bid that asks for an out-of-stock item, or
  has a trick line slipped into it, can never be accepted as-is without
  breaking policy. When the basket's own prices all pass the gate, ours
  counters with exactly the sellable basket at the buyer's own prices.

The 90% line was not guessed: the final-round rule was measured on this
dev set at several settings before it was fixed — walk-always scored
35.2, scheduled-price final offer 48.5, unconditional floor offer 48.7,
floor-at-70% 48.3, at 80% 49.0, at 85% 49.6, at 90% 50.1, at 95% 45.0.
These are dev-set measurements on the kit's bots, reported as such.

**Robustness (same sellers, other seeds, also measured):** seed 1 —
ours 49.1 vs baseline 48.3 (deadlocks 1 vs 20); seed 2 — ours 43.0 vs
baseline 42.9 (deadlocks 2 vs 25). The edge is small and seed-dependent;
the deadlock removal is consistent. The leaderboard uses hidden agentic
LLM buyers, not these bots, so no dev-set number here is a prediction of
the hidden-run score.

## Files in this folder

- `our_evaluate_stdout.txt` — full printed output of our run.
- `baseline_evaluate_stdout.txt` — full printed output of the baseline run.
- `our_transcripts.jsonl` — all 210 negotiations, in full, for our seller.
- `baseline_transcripts.jsonl` — all 210 for the example seller.

## Rezolve — stated plainly

This kit is the no-Rezolve variant (`ps2-selling-to-machines-no-rezolve`),
and the dev-set run above neither needs nor uses any Rezolve capability,
so Rezolve does not block it. The challenge's Rezolve integration itself
is still **pending**: no Rezolve account or coupon has been found on the
portal or in the problem-statement PDF, so nothing about Rezolve is
claimed anywhere in this pack.

## Not done here (by instruction)

Nothing has been filed or submitted, no demo video has been recorded,
and the demo website was not touched. This folder is the "dev-set
outputs" piece of the Round 1 pack, ready to sit next to the abstract,
the video and the code repo.
