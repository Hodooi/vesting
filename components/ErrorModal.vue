<template>
  <div class="modal" :class="{'is-active': $parent.error}">
    <div class="modal-background" @click="$parent.error = null"></div>
    <div class="modal-content p-5 has-background-danger has-radius has-text-white">
      <h2 class="subtitle is-3">Error</h2>
      <p>{{$parent.error}}</p>
      <button class="modal-close is-large" aria-label="close" @click="$parent.error = null"></button>
      <div class="has-text-right">
        <button class="button" @click="$parent.error = null">OK</button>
      </div>
    </div>
  </div>
</template>
