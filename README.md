# EverydayBench

Existing computer-use benchmarks (like [WebArena](https://webarena.dev), [OSWorld](https://os-world.github.io) and
[OSWorld 2.0](https://osworld-v2.xlang.ai)) cover lots of use cases and websites, but miss several of the workflows I
find myself using most consistently for personal agent tasks while daily driving
[biscotti](https://github.com/lucasgelfond/biscotti). Initially these tasks were:

- Password resets and sign-in codes through an inbox
- Seat maps and showtimes
- More complex payment flows, and sites where checkout involves a redirect

However, I've since begun to update this as I find tasks agents are bad at in day-to-day life. I also wanted to assert
that agents would:

- Function across sites with different flows and UI that do the same thing, so that real-world variety doesn't get in
  the way
- Cause no side effects (taking inspiration from [τ²-bench](https://github.com/sierra-research/tau2-bench))

The sites are each on a hostname of one server, i.e. `showlark.everydaybench.test`, `lumiscope.everydaybench.test`. Each runs on its
own, isolated SQLite database, so we can assert that actions verifiably took place.

Some sites are hard twins of a sibling (Zigzephyr Air, Knickwhistle, Tabletangle): the same data and tasks, with the
controls real sites make hard to click, like custom dropdowns, calendar-only dates and slide-to-confirm buttons.
