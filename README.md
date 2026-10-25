# EverydayBench

Existing agent computer-use benchmarks (like [WebArena](https://webarena.dev), [OSWorld](https://os-world.github.io) and
[OSWorld 2.0](https://osworld-v2.xlang.ai)) cover lots of use cases, but miss several I most consistently reach for while daily driving
[biscotti](https://github.com/lucasgelfond/biscotti). Initially these tasks/failures were:

- Password resets and sign-in codes through an inbox
- Seat maps and showtimes
- More complex payment flows, and sites where checkout involves a redirect
- Functioning across sites different / unintuitive navigation, across real-world virality
- Not causing side effects unrelated to the task
- Navigating complex / difficult-to-click navigation items (taking inspiration from [τ²-bench](https://github.com/sierra-research/tau2-bench))
- Multi-site tasks (i.e. book a flight, book a hotel nearby)
- Mid-task interrupts (I.e. "I changed my mind, make the table for three")

I wanted a way to test when I'd made changes that caused regressions or helped me improve at a task. I combined the approaches of WebArena (self-hosted websites) and [REAL](https://www.realevals.xyz/) which spun up copycat sites of popular websites for deterministic agent tasks but kept them closed source / only possible to access. EverydayBench:
 
- Exposes a bunch of LLM-gennerated copycat versions of sites (i.e. fictional airlines like Larkspan Airways, a residents portal at Fernwick Residents, etc) I've done actual tasks on
- Each site has its own SQLite database and state, so we can deterministically assert if there were side effects or if the correct action was taken
- The sites are hosted on one server on different hostnames (i.e. `showlark.everydaybench.test`, `lumiscope.everydaybench.test`)
- There's many near-dupes of sites that have harder layouts or input elements 

![A few of the sites](public/sites.gif)

My plan is to keep updating this (and maybe release it as a v0) once I've found more challenging tasks frontier models don't quite saturate. Admittedly it becomes a bit tricky to prevent this repo from being visited / consumed, so the onus would be on the user to verify none of this ended up in the eval runs. 
