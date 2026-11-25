"""AgentX Seller — Challenge 2 "Selling to Machines", Techfest IIT Bombay.

Two layers, exactly as designed:

1. POLICY GATE — nothing is offered or accepted unless it passes the store's
   own files (store.csv + policy.json). For every line: known SKU, whole
   quantity within stock, and floor <= unit_price <= list price, where

       floor(sku) = ceil(max(cost / (1 - min_margin[category]),
                             list * (1 - max_discount)))

   Buyer text is never read for facts. Claims about discounts, stock,
   budgets, competitor prices or a manager's approval are untrusted input
   and change nothing — only the buyer's priced items are looked at, and
   only through the gate. That is what stops the manipulator's slipped-in
   lines (out-of-stock items, over-stock quantities, one-rupee lines):
   the gate checks a bid as a whole, so one bad line rejects it all —
   including a bid that asks for an out-of-stock item, which could never
   be accepted without breaking the stock rule.

2. STRATEGY — anchor at list price; on each buyer counter, concede a
   quarter of the remaining gap above the floor; accept any bid that
   passes the gate exactly (our lines, our quantities, every price at or
   above its floor). If a bid fails the gate only because of lines slipped
   in on top of a basket whose own prices all pass the gate, counter with
   exactly the clean basket at the buyer's own prices for it — the deal
   the buyer actually priced, minus the trick. On the last round, walk
   away from a bid that is still nowhere near the floor rather than burn
   all 10 rounds into a deadlock.

Seller text is kept plain on purpose: the only number it ever states is
the offer total, and it makes no stock, scarcity or pressure claims, so
there is nothing in it the store's data does not support.

    class Seller:
        def __init__(self, store, policy)
        def start(self, negotiation_id)
        def respond(self, message) -> dict
"""
import math


class Seller:
    def __init__(self, store, policy):
        self.store, self.policy = store, policy

    # ---------------------------------------------------------- policy gate

    def floor(self, sku):
        """The lowest unit price policy allows for this product."""
        row = self.store[sku]
        margin = self.policy["min_margin"][row["category"]]
        return math.ceil(max(row["cost"] / (1 - margin),
                             row["price"] * (1 - self.policy["max_discount"])))

    def gate(self, items):
        """True only if these priced lines, taken as a whole, break no rule
        and are exactly the basket we can sell: our SKUs, our quantities,
        every unit price between its floor and its list price."""
        if not isinstance(items, list) or not items or self.lines is None:
            return False
        seen = set()
        for line in items:
            if not isinstance(line, dict):
                return False
            sku, qty, price = line.get("sku"), line.get("qty"), line.get("unit_price")
            if sku not in self.lines or sku in seen:
                return False
            seen.add(sku)
            if not isinstance(qty, int) or isinstance(qty, bool) or qty != self.lines[sku]:
                return False
            if not isinstance(price, (int, float)) or isinstance(price, bool):
                return False
            if not self.floor(sku) <= price <= self.store[sku]["price"]:
                return False
        return seen == set(self.lines)

    # ---------------------------------------------------------- lifecycle

    def start(self, negotiation_id):
        self.lines = None        # sku -> qty we can actually sell (capped at stock)
        self.prices = None       # sku -> our current asking unit price

    def respond(self, message):
        if self.lines is None:
            self._open(message)
            if not self.lines:
                return {"type": "walk_away",
                        "text": "Sorry, I cannot sell that. Thank you for your time."}

        mtype = message.get("type")
        if mtype in ("request", "counter"):
            items = message.get("items")
            if self.gate(items):
                return {"type": "accept", "text": "Deal, thank you."}
            clean = self._clean_prices(items)
            if clean is not None and self._total(clean) >= self._ask_total():
                return self._offer_at(clean)
            if mtype == "counter":
                self._concede()
            if message.get("round", 0) >= self.policy["max_rounds"]:
                return self._final_round(items, clean)
        return self._offer()

    # ---------------------------------------------------------- strategy

    def _open(self, message):
        """First message: work out what of the basket we can actually sell,
        before any number is said. Out-of-stock lines are dropped; if
        nothing is sellable there is nothing to negotiate."""
        wanted = {}
        for i in message.get("items") or []:
            if isinstance(i, dict) and i.get("sku") in self.store \
                    and isinstance(i.get("qty"), int) and not isinstance(i.get("qty"), bool) \
                    and i["qty"] > 0:
                wanted[i["sku"]] = i["qty"]
        self.lines = {sku: min(qty, self.store[sku]["stock"]) for sku, qty in wanted.items()
                      if self.store[sku]["stock"] > 0}
        self.prices = {sku: self.store[sku]["price"] for sku in self.lines}

    def _concede(self):
        """Give up a quarter of what is left above the floor, per line."""
        for sku, price in self.prices.items():
            floor = self.floor(sku)
            self.prices[sku] = max(floor, math.ceil(price - (price - floor) / 4))

    def _clean_prices(self, items):
        """The buyer's own prices for exactly our basket, if every one of
        them passes the gate — else None. Extra lines in the bid (the
        manipulator's trick lines, or an item that is out of stock) are
        simply not part of our basket; a line of ours that is missing,
        duplicated, mis-quantified or priced outside its floor-to-list
        range makes the basket itself unclean."""
        if not isinstance(items, list) or self.lines is None:
            return None
        priced = {}
        for i in items:
            if not isinstance(i, dict):
                return None
            sku = i.get("sku")
            if sku in self.lines:
                if sku in priced:
                    return None
                qty, price = i.get("qty"), i.get("unit_price")
                if not isinstance(qty, int) or isinstance(qty, bool) or qty != self.lines[sku]:
                    return None
                if not isinstance(price, (int, float)) or isinstance(price, bool):
                    return None
                if not self.floor(sku) <= price <= self.store[sku]["price"]:
                    return None
                priced[sku] = price
        return priced if set(priced) == set(self.lines) else None

    def _final_round(self, items, clean):
        """Last turn. A clean basket at the buyer's own prices closes for
        certain — their prices only ever rise toward their limit, so a
        basket they priced inside the gate is one they can take. Failing
        that, if their bid has reached 90% of the floor total, one final
        offer at the floor can still close a deal they are able to take.
        Below that, their limit sits under the floor and no compliant
        deal exists — walk away in time rather than deadlock. (The 90%
        line was set by measuring the kit's own evaluate.py on the dev
        set at several lines — see devset-outputs/RESULTS.md.)"""
        if clean is not None:
            return self._offer_at(clean)
        if self._bid_total(items) >= 0.9 * self._floor_total():
            return self._offer_at({sku: self.floor(sku) for sku in self.lines})
        return {"type": "walk_away",
                "text": "Sorry, we cannot make that work. Thank you for your time."}

    # ---------------------------------------------------------- helpers

    def _total(self, prices):
        return sum(self.lines[sku] * price for sku, price in prices.items())

    def _ask_total(self):
        return self._total(self.prices)

    def _floor_total(self):
        return sum(qty * self.floor(sku) for sku, qty in self.lines.items())

    def _bid_total(self, items):
        """The buyer's bid total over our lines only, at matching
        quantities (a slipped-in line does not count toward it)."""
        if not isinstance(items, list) or self.lines is None:
            return 0
        total = 0
        for i in items:
            if isinstance(i, dict) and i.get("sku") in self.lines \
                    and i.get("qty") == self.lines[i["sku"]] \
                    and isinstance(i.get("unit_price"), (int, float)) \
                    and not isinstance(i.get("unit_price"), bool):
                total += i["qty"] * i["unit_price"]
        return total

    def _offer_at(self, prices):
        items = [{"sku": sku, "qty": qty, "unit_price": prices[sku]}
                 for sku, qty in self.lines.items()]
        total = sum(i["qty"] * i["unit_price"] for i in items)
        names = " and ".join(f"{i['qty']} x {self.store[i['sku']]['name']}" for i in items)
        return {"type": "offer", "items": items, "text": f"I can do {names} for ₹{total:,}."}

    def _offer(self):
        return self._offer_at(self.prices)
