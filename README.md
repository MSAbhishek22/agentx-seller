# AgentX Seller — "Selling to Machines"

A seller agent for **AgentX — The Agentic Commerce Challenge** (Techfest, IIT
Bombay), **Challenge 2: Selling to Machines**. Built solo by M S Abhishek,
team "Abhi Solo", Competition ID AX-B093BC8933D5.

**Live demo:** https://msabhishek22.github.io/agentx-seller/ — the site in
this repo is the demo; the Python seller below is the entry itself.

## What the seller is

The buyers are AI bots. They send offers as JSON, each talk can run up to
10 rounds, and one of the kit's buyers is built to cheat — it slips
out-of-stock items, over-stock quantities and one-rupee lines into its
bids, and makes claims ("the manager approved it", "your policy changed")
that are not true.

The seller in [`seller/seller.py`](seller/seller.py) is two layers:

1. **Policy gate.** Every offer and every acceptance is checked against
   the store's own files (`store.csv` + `policy.json`) before anything is
   sent: known SKU, quantity within stock, and
   `floor <= unit price <= list price`, where
   `floor = ceil(max(cost / (1 - min margin for the category), list * (1 - max discount)))`.
   Buyer text is never read for facts — claims change nothing. A bid is
   checked as a whole, so one bad line rejects the whole bid.
2. **Strategy.** Anchor at list price; concede a quarter of the remaining
   gap above the floor on each counter; accept any bid that passes the
   gate exactly. If a bid fails only because of lines slipped in on top of
   a clean basket, counter with exactly the sellable basket at the buyer's
   own prices. On the last round, close at the floor if the bid has
   reached 90% of the floor total, otherwise walk away instead of burning
   all 10 rounds into a deadlock.

## Run it against the starter kit

You need the official starter kit (`ps2-selling-to-machines`: `store.csv`,
`policy.json`, `harness.py`, `buyers.py`, `evaluate.py`,
`example_seller.py`). Then, from the kit folder:

```bash
# baseline — the kit's example seller
python3 evaluate.py --log baseline_transcripts.jsonl

# this seller
python3 evaluate.py --seller /path/to/seller/seller.py --log our_transcripts.jsonl
```

`evaluate.py` re-runs the baseline on the same scenarios, so the two
scores are directly comparable.

## Measured results — public dev set

Scorer: the kit's own `evaluate.py`, default run — **210 negotiations,
seed 0**, cycling the kit's three rule-based buyer bots (cooperative,
hard_bargainer, manipulator). Run 25 Nov 2026. Full stdout and all 210
transcripts per seller are in
[`devset-outputs/`](devset-outputs/RESULTS.md).

| Metric | This seller | Example seller (baseline) |
|---|---|---|
| **Score** | **50.1** | **48.5** |
| Deal rate | 0.752 | 0.757 |
| Deal rate where a deal was possible | 0.975 | 0.981 |
| Margin kept (on deals) | 0.666 | 0.673 |
| Policy violations | **0** | 0 |
| Truth violations | **0** | 0 |
| Deadlocks | **0** | **21** |

Honest note: the score edge is small and seed-dependent (seed 1: 49.1 vs
48.3; seed 2: 43.0 vs 42.9). The consistent win is deadlock removal —
21 → 0 on the default run — at a small cost in deal rate and margin. The
final scoring uses hidden LLM buyers, not these bots, so no number here
is a prediction of the hidden-run score.

## Round 1 pack

- **Abstract (498 words):** [`ABSTRACT_FINAL.md`](ABSTRACT_FINAL.md)
- **Code:** this repo — seller in `seller/`, demo site at the root
- **Dev-set outputs:** [`devset-outputs/`](devset-outputs/RESULTS.md)
- **Demo video:** recorded from the live site; filed with the pack on the
  Techfest site by 30 Nov 2026, 23:59 IST

## Rezolve — stated plainly

The kit in hand is the no-Rezolve variant, and the dev-set run neither
needs nor uses any Rezolve capability. The challenge's Rezolve
integration is still pending — no Rezolve account or coupon has been
found on the portal or in the problem-statement PDF — so nothing about
Rezolve is claimed here.
