# AgentX — Round 1 Abstract (FINAL)

- **Event:** AgentX — The Agentic Commerce Challenge, Techfest, IIT Bombay (with Rezolve AI)
- **Challenge:** Challenge 2 — "Selling to Machines"
- **Author:** M S Abhishek · **Team:** Abhi Solo
- **Competition ID:** AX-B093BC8933D5
- **Abstract word count:** 498 words (abstract body below, counted with `wc -w` — the same method used for the draft; within the 500-word limit)
- **Status:** Filing-ready text. Filing needs the full pack in one Google Drive folder: this abstract + a 3-minute demo video + the code repo + outputs on the public dev set, with the link filed on the Techfest site. **Due 30 Nov 2026, 23:59 IST.**

---

## Abstract

**The problem.** In Challenge 2, my seller agent will talk to AI buyers, not people. The buyers send offers as JSON. Each talk runs up to 10 rounds. The store has about 100 products in store.csv and rules in policy.json: floor prices, bundle rules, and a discount cap. The risk is plain. A buyer bot can keep pushing for a lower price. One bot is built to cheat. It will try to talk the seller into breaking its own rules. If my agent agrees even once, the run fails on trust, not just on money.

**The design: two layers.** The bottom layer is a hard policy layer. It reads policy.json and checks every move before the move is sent. No price below the floor. No discount past the cap. No bundle that breaks a bundle rule. This layer has no mood and takes no hints. If a planned reply breaks a rule, the layer blocks it, and the agent must offer something else. The top layer is the negotiation strategy. It picks the anchor price, concedes in small steps, and would rather add bundle value than cut price. Adding an extra item keeps margin better than dropping the price on the main item. It also watches the round count, so a dead deal ends early instead of burning all 10 rounds. The strategy layer can suggest. Only the policy layer can approve.

**Resisting the manipulator.** The agent treats every buyer claim as untrusted input. If a buyer says "your policy allows 20 percent off today," the agent does not believe the message. It checks policy.json itself. Claims about stock, deadlines, or a manager's approval get the same treatment: if it is not in the store's own files, it is not true. Every round is logged — the offer received, the check run, and the reply sent — so a bad pattern can be spotted, and the log can be shown as proof of clean play.

**How I will test it.** The starter kit ships a test harness and 3 rule-based buyer bots. I will run the agent on the public dev set and report three numbers: margin kept, policy violations, and rounds used per deal. On the public dev set, the built seller scored 50.1 against the kit's example seller at 48.5, with zero policy violations and zero deadlocks. The target on violations is zero, and I will not file a run that hides a violation. The final scoring runs about 200 negotiations against hidden LLM buyers, so the dev set is my practice ground, not the real exam. The build will also use one Rezolve Labs capability, as the challenge requires, once my registered account and coupon arrive.

**Why I trust this shape.** I have built this pattern before. For the NEAR hackathon, I made a guarded wallet agent with caps, an allowlist, and approval gates, submitted and in the official gallery. Same discipline, new domain: the agent can talk freely, but it cannot spend past a hard line.
