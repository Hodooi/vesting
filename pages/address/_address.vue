<template>
  <div>
    <error-modal/>
    <section class="section">
      <div class="container">
        <div class="has-text-centered block">
          <img :src="require('@/assets/img/logo-vertical.png')" width="175" class="mb-4">
          <h1 class="site-title is-spaced title">Vesting<span class="has-text-secondary">.</span></h1>
          <h3 class="subtitle">Claim your vested HOD Tokens</h3>
        </div>
      </div>
    </section>
    <div class="container">
      <div  class="is-horizontal-centered has-limited-width">
      <div v-if="loading">
        <progress class="progress is-small is-secondary" max="100"></progress>
      </div>
      <div class="box has-background-image bg-dark p-6">
        <div class="mb-3">
          <nuxt-link to="/" class="has-text-white"><i class="fas fa-chevron-left"></i> Back</nuxt-link>
        </div>
        <h3 class="subtitle">Claim your tokens in your vesting contract</h3>

        <div v-if="!$bsc.checkBscFormat(this.address)">
          <h3 class="subtitle has-text-danger">Invalid address</h3>
          <nuxt-link to="/" class="button">Home</nuxt-link>
        </div>
        <form @submit.prevent="claim" v-else>
          <div>Locked in</div>
          <h3 class="subtitle blockchain-address">{{ address }}</h3>
          <div>Beneficiary account</div>
          <h3 class="subtitle blockchain-address"><span
            v-if="vesting.beneficiary !== null">{{ vesting.beneficiary }}</span><span v-else>...</span></h3>
          <div class="columns is-multiline">
<!--            <div class="column">-->
<!--              <div>Locked tokens</div>-->
<!--              <h2 class="subtitle"><span v-if="vesting.locked !== null">{{ vesting.locked }}</span><span-->
<!--                v-else>...</span></h2>-->
<!--            </div>-->
<!--            <div class="column is-half">-->
<!--              <div>Start date</div>-->
<!--              <small><span v-if="vesting.start">{{ new Date(parseInt(vesting.start) * 1000) }}</span><span-->
<!--                v-else>...</span></small>-->
<!--            </div>-->
            <div class="column is-half">
              <div>25% Unlock Cliff</div>
              <small><span v-if="vesting.cliff">{{ new Date(vesting.cliff * 1000) }}</span><span
                v-else>...</span></small>
            </div>
            <div class="column is-half">
              <div>End date</div>
              <small><span v-if="vesting.start && vesting.duration">{{ new Date((parseInt(vesting.start) + parseInt(vesting.duration)) * 1000) }}</span><span
                v-else>...</span></small>
            </div>
            <div class="column is-half">
              <div>Released tokens</div>
              <h2 class="subtitle"><span v-if="vesting.released !== null">{{ +vesting.released.toFixed(2) }} / {{ +(vesting.locked + vesting.released).toFixed(2) }} HOD</span><span
                v-else>...</span></h2>
            </div>
            <div class="column is-half">
              <div>Currently claimable</div>
              <h2 class="subtitle"><span v-if="releasable !== null">~{{ +releasable.toFixed(4) }} HOD</span><span v-else>...</span>
              </h2>
            </div>
          </div>
          <div v-if="!bscWallet" class="button is-medium is-secondary is-fullwidth mt-5"
               @click="$bsc.loginModal = true">
            <strong>Connect Wallet</strong>
          </div>
          <div v-else>
            <button class="button is-medium is-accent is-fullwidth mt-5" :class="{'is-loading': loading}" :disabled="loading || !address || !bscWallet || !releasable"
                    type="submit">
              <strong>Claim HOD</strong>
            </button>
            <div class="has-text-centered mt-2">
              <a @click="$bsc.logout" class="is-size-6  has-text-danger">Logout</a>
            </div>
          </div>
        </form>
      </div>
      <div v-if="tx !== null && tx.transactionHash" class="notification is-success">
        <button class="delete" @click="tx = null"/>
        Transaction sent: <a :href="`${explorer}/transaction/${tx.transactionHash}`">{{ tx.transactionHash }}</a>
      </div>
    </div>
    </div>
    <!-- Educational Resources -->
    <div class="has-text-centered my-5">
      <a class="" href="https://hodooi.com" target="_blank">
        <strong>Learn more about HoDooi.com</strong>
      </a>
    </div>
  </div>
</template>

<script>
import ErrorModal from '@/components/ErrorModal'

export default {
  components: {
    ErrorModal
  },
  data() {
    return {
      address: this.$route.params.address,
      error: null,
      loading: false,
      refreshReleasable: true,
      explorer: process.env.NUXT_ENV_BLOCKEXPLORER,
      vesting: {
        locked: null,
        released: null,
        beneficiary: null,
        start: null,
        cliff: null,
        duration: null
      },
      tx: {}
    }
  },

  created() {
    if (!this.$bsc.checkBscFormat(this.address)) {
      this.error = 'Invalid address'
    } else {
      this.timer = setInterval(() => { this.refreshReleasable = !this.refreshReleasable }, 1000)
      this.getBalanceVestingContract()
      this.getReleasedFunds()
      this.getBeneficiary()
      this.getCliff()
      this.getStart()
      this.getDuration()
    }
  },

  beforeDestroy () {
    clearInterval(this.timer)
  },

  computed: {
    bscWallet() {
      return (this.$bsc) ? this.$bsc.wallet : null
    },
    releasable() {
      // eslint-disable-next-line
      this.refreshReleasable
      if (this.vesting.start && this.vesting.cliff && this.vesting.duration && this.vesting.locked !== null &&  this.vesting.released !== null) {
        return this.calculateReleasable(this.vesting.start, this.vesting.cliff, this.vesting.duration, this.vesting.locked, this.vesting.released)
      }
      return null
    }
  },

  methods: {
    calculateReleasable(start, cliff, duration, locked, released) {
      if (!locked) {
        return 0
      }

      const now = new Date()
      if (now < new Date(cliff * 1000)) {
        return 0
      }
      const releasable = (((locked+released) * (now.getTime()/1000 - start))/duration) - released;
      return Math.max(0, Math.min(locked, releasable))
    },
    handleError(error) {
      console.error(error)
      if (error.response && error.response.data) {
        if (error.response.data.error) {
          this.error = error.response.data.error
        } else if (error.response.data.message) {
          this.error = error.response.data.message
        } else {
          this.error = error.response.data
        }
      } else if (error.message) {
        this.error = error.message
      } else {
        this.error = error
      }
    },
    async getCliff() {
      this.loading = true
      try {
        const response = await this.$bsc.getCliff(this.address)
        this.vesting.cliff = parseInt(response)
      } catch (error) {
        this.handleError(error)
      }
    },
    async getDuration() {
      this.loading = true
      try {
        const response = await this.$bsc.getDuration(this.address)
        this.vesting.duration = parseInt(response)
      } catch (error) {
        this.handleError(error)
      }
    },
    async getStart() {
      this.loading = true
      try {
        const response = await this.$bsc.getStart(this.address)
        this.vesting.start = parseInt(response)
      } catch (error) {
        this.handleError(error)
      }
    },
    async getBeneficiary() {
      this.loading = true
      try {
        const response = await this.$bsc.getBeneficiary(this.address)
        this.vesting.beneficiary = response
      } catch (error) {
        this.handleError(error)
      }
      this.loading = false
    },
    async getReleasedFunds() {
      this.loading = true
      try {
        const response = await this.$bsc.getReleasedFunds(this.address)
        this.vesting.released = parseFloat(response)
      } catch (error) {
        this.handleError(error)
      }
      this.loading = false
    },
    async getBalanceVestingContract() {
      this.loading = true
      try {
        const response = await this.$bsc.getBalanceVestingContract(this.address)
        this.vesting.locked = parseFloat(response)
      } catch (error) {
        this.handleError(error)
      }
      this.loading = false
    },
    async claim() {
      if (!this.address) {
        this.error = "No vesting contract selected"
        return
      }
      if (!this.bscWallet) {
        this.$bsc.loginModal = true
        return
      }
      this.loading = true
      try {
        this.$bsc.releaseFunds(this.address)
          .send({from: this.$bsc.wallet[0]})
          .on('transactionHash', hash =>{
            this.$set(this.tx, 'transactionHash', hash)
          })
          .on('confirmation', (confirmationNumber, receipt) => {
            console.log("conf", confirmationNumber)
          })
          .on('receipt', receipt => {
            this.tx = receipt
            this.loading = false
            this.getBalanceVestingContract()
            this.getReleasedFunds()
          })
          .on('error', error => {
            this.handleError(error)
            this.tx = null
            this.loading = false
          });
      } catch (error) {
        this.handleError(error)
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.site-title {
  font-size: 75px;
}

.blockchain-address {
  font-family: monospace;
  text-overflow: ellipsis;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  display: block;
}
</style>
