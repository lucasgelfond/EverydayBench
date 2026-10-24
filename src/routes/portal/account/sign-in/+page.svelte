<script lang="ts">
	import SignIn from '#lib/ui/account/SignIn.svelte';
	let { data, form } = $props();
</script>

<SignIn {form} title="Sign in to {data.site.name}" />
