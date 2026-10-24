<form method="GET" action="/check-in/trip" class="card mx-auto max-w-sm space-y-4">
	<h1 class="text-xl font-bold">Check in</h1>
	<p class="text-sm text-muted">Online check-in opens 24 hours before departure and closes 45 minutes before.</p>
	<label class="label">Confirmation code <input class="field font-mono uppercase" name="code" autocomplete="off" required /></label>
	<label class="label">Last name <input class="field" name="last" autocomplete="family-name" required /></label>
	<button class="btn w-full">Find my trip</button>
</form>
