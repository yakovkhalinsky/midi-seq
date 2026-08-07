<script lang="ts">
  interface Props {
    outputs: MIDIOutput[]
    selectedId: string | null
    onSelect: (id: string | null) => void
  }

  let { outputs, selectedId, onSelect }: Props = $props()
</script>

<div class="midi-selector">
  <label for="midi-out">MIDI Output</label>
  <select
    id="midi-out"
    value={selectedId ?? ''}
    onchange={(e) => {
      const value = e.currentTarget.value
      onSelect(value === '' ? null : value)
    }}
  >
    <option value="">{outputs.length === 0 ? 'No MIDI outputs' : 'Internal preview'}</option>
    {#each outputs as output}
      <option value={output.id}>{output.name || `Output ${output.id}`}</option>
    {/each}
  </select>
</div>

<style>
  .midi-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }

  select {
    min-width: 180px;
  }
</style>
