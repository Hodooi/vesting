import Vue from 'vue'
import vestingContract from "./HodooiVesting.json"
import tokenContract from "./DummyERC20.json";

/**
 * When using the walletconnect protocol we need to make sure to use the custom requests.
 * https://docs.binance.org/walletconnect.html
 */
import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3 from 'web3'
const web3 = new Web3()
web3.setProvider(process.env.NUXT_ENV_BSC_RPC)

const walletProvider = new WalletConnectProvider({
  chainId: process.env.NUXT_ENV_BSC_NETWORK_ID,
  rpc: {
    56: process.env.NUXT_ENV_BSC_RPC
  },
  qrcodeModalOptions: {
    mobileLinks: ["metamask", "trust", "rainbow", "argent"]
  }
})

export default (context, inject) => {
  const bsc = new Vue({
    data() {
      return {
        explorer: process.env.NUXT_ENV_BLOCKEXPLORER,
        wallet: null,
        loginModal: false,
        tokenBalance: null,
        bnbAvailable: null,
        updater: null,
        transaction: null,
        transactionError: null,
        metamask: window.ethereum || null,
        binance: window.BinanceChain || null,
        walletConnect: walletProvider || null, //connect to mobile wallet; trust, metamask, ...
        walletConnected: null, // Does it make sense to do this at the beginning?
        currentProvider: null,
        tokenAddress: process.env.NUXT_ENV_TOKEN_ADDRESS,
        vestingAddress: process.env.NUXT_ENV_VESTING_ADDRESS,
      }
    },
    created() {
      // this.updater = setInterval(() => {
      //   this.updateAccount()
      // }, 10000)
    },
    beforeDestroy() {
      clearInterval(this.updater)
    },

    methods: {
      async logout() {

        if (this.currentProvider) {
          if(this.currentProvider == this.walletConnect) {
            // This method is only available for WalletConnect
            await this.walletConnect.disconnect()
            this.wallet = null
            window.location.reload()
          } else {
            this.wallet = null
          }
        }
        this.clear()

      },

      updateAccount() {
        if (this.wallet) {
          // this.getTokenBalance()
        }
      },

      clear() {
        this.clearTransaction()
        Object.assign(this.$data, this.$options.data.call(this))
      },

      /**
       * Vesting contract should be the same as the one that is defined here.
       * Provide the address of the custom vesting contract in order to get the beneficiary.
       */
      async getBeneficiary(vestingContractAddress) {
        const contract = new web3.eth.Contract(vestingContract.abi, vestingContractAddress)
        const response = await contract.methods.beneficiary().call()
        return response
      },
      async getCliff(vestingContractAddress) {
        const contract = new web3.eth.Contract(vestingContract.abi, vestingContractAddress)
        const response = await contract.methods.cliff().call()
        return response
      },
      async getDuration(vestingContractAddress) {
        const contract = new web3.eth.Contract(vestingContract.abi, vestingContractAddress)
        const response = await contract.methods.duration().call()
        return response
      },
      async getStart(vestingContractAddress) {
        const contract = new web3.eth.Contract(vestingContract.abi, vestingContractAddress)
        const response = await contract.methods.start().call()
        return response
      },
      /**
       * Get balance of vesting contract
       * @params contracAddress, the address of the vestingContract that is deployed for this user.
       */
      async getBalanceVestingContract(contractAddress) {
        const contract = new web3.eth.Contract(tokenContract.abi, process.env.NUXT_ENV_TOKEN_ADDRESS)
        const balance = await contract.methods.balanceOf(contractAddress).call()
        if (balance) {
          return web3.utils.fromWei(balance.toString())
        }
      },

      /**
       * Get funds that funds that have been released.
       */
      async getReleasedFunds (userVestingAddress){
        const contract = new web3.eth.Contract(vestingContract.abi, userVestingAddress)
        const released = await contract.methods.released(process.env.NUXT_ENV_TOKEN_ADDRESS).call()
        if (released) return web3.utils.fromWei(released.toString())
      },

      /**
       * TODO How to check if this transaction is succesfull?
       * Release funds to beneficiary, does not return an output
       * @params vestingContract address of user.
       */
      releaseFunds (userVestingAddress) {
        const web32 = new Web3(this.currentProvider);
        const contract = new web32.eth.Contract(vestingContract.abi, userVestingAddress)
        return contract.methods.release(process.env.NUXT_ENV_TOKEN_ADDRESS)
      },

      /**
       * Get Ether amount for this address
       * @params address, look up the value for this address
       */
      async getNativeBalance(address) { // ETH
        if (this.currentProvider && this.wallet) { // make sure that there is a wallet as well
          try {
            const response = await this.currentProvider.request({
              method: 'eth_getBalance',
              params: [
                address
              ]
            })

            if (response != undefined) this.bnbAvailable = web3.utils.fromWei(response.toString())
          } catch (balanceError) {
            console.error(balanceError)
          }
        }
      },

      handleTransaction(actions) {
        this.clearTransaction()

        // TODO: handle bsc transaction
      },

      checkBinanceInstalled() {
        return Boolean(this.binance)
      },

      checkBscFormat(bscAddress) {
        const response =  web3.utils.isAddress(bscAddress, process.NUXT_ENV_BSC_NETWORK_ID)
        return response
      },

      clearTransaction() {
        this.transaction = null
        this.transactionError = null
      },
      async onTrustWalletConnect() {
        try {
          this.registerProviderListener(this.metamask)
          this.wallet = await this.currentProvider.request({
            method: 'eth_requestAccounts'
          })
          this.updateAccount()
          this.checkBscFormat(this.wallet[0])
        } catch (mmError) {
          console.error(mmError)
          if (mmError) {
            return Promise.reject(mmError)
          }
        }
      },
      async onMetaMaskConnect() {
        try {
          this.registerProviderListener(this.metamask)
          this.wallet = await this.currentProvider.request({
            method: 'eth_requestAccounts'
          })
          this.updateAccount()
          this.checkBscFormat(this.wallet[0])
        } catch (mmError) {
          console.error(mmError)
          if (mmError) {
            return Promise.reject(mmError)
          }
        }
      },

      async onBinanceConnect() {
        try {
          if(!this.binance) this.binance = window.BinanceChain
          this.registerProviderListener(this.binance)
          this.wallet = await this.currentProvider.request({
            method: 'eth_requestAccounts'
          })
          this.updateAccount()
        } catch (bscError) {
          return Promise.reject(bscError)
        }
      },

      async onWalletConnectWeb3() {
        try {
          // Launches QR-Code Modal
          await this.walletConnect.enable()

          this.registerProviderListener(this.walletConnect)
          this.wallet = this.walletConnect.accounts
          // this.updateAccount()
          this.walletConnect.updateRpcUrl(process.env.NUXT_ENV_BSC_NETWORK_ID, process.env.NUXT_ENV_BSC_RPC)

        } catch (walletConnectError) {
          return Promise.reject(walletConnectError)
        }
      },

      // Handle when the user changes their account number
      async handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
          // MetaMask is locked or the user has not connected any accounts
        } else if (accounts[0] !== this.wallet) {
          this.wallet = accounts[0];
        }
      },

      /**
       * Method to add the correct chain to the wallet of the user.
       * method `wallet_addEthereumChain` is not supported on the BinanceChain rpc provider.
       * We cannot add or remove chains with the Binance Chain wallet.
       *
       * But it is currenlty implemented for Metamask
       * https://docs.metamask.io/guide/rpc-api.html#wallet-addethereumchain
       */
      async addChain() {
        const chainId = await this.getCurrentChainNetwork();

        if (chainId != process.env.NUXT_ENV_BSC_HEX_ID) {
          try {

            if (this.currentProvider == this.metamask) {

              // Create BSC network configuration object.
              const chainObject = {
                chainId: process.env.NUXT_ENV_BSC_HEX_ID,
                chainName: process.env.NUXT_ENV_CHAIN_NAME,
                nativeCurrency: {
                  name: process.env.NUXT_ENV_TOKEN_NAME,
                  symbol: process.env.NUXT_ENV_TOKEN_SYMBOL,
                  decimals: 18
                },
                rpcUrls: [process.env.NUXT_ENV_BSC_RPC, 'https://bsc-dataseed1.binance.org'],
                blockExplorerUrls: [process.env.NUXT_ENV_BLOCKEXPLORER]
              }
              // This method is only available for metamask right now.
              const updatedChainId = await this.currentProvider.request({
                method: 'wallet_addEthereumChain',
                params: [chainObject]
              })
              //if (updatedChainId =! null) throw Error(`AddChainError: ${updatedChainId}`)
              if (updatedChainId) {
              }
            } else {
              // Notify the user to change the chain they are on manually.
              alert(`Please update the current chain in your wallet.`)
              return
            }

          } catch (addChainError) {
            console.error(addChainError)
          }
        }
      },

      /**
       * Retrieve current network the wallet is listening to. can be testnet or mainnet of either bsc or ethereum for example.
       * In what format does this method return the chain id?
       */
      async getCurrentChainNetwork() {
        try {
          return await this.currentProvider.request({method: 'eth_chainId'})
        } catch (error) {
          console.error(error)
          console.error('Error requesting currentChain')
        }
      },

      async onCorrectChain(){
        try {
          const currentChain = await this.getCurrentChainNetwork()
          const bool = Boolean(currentChain == process.env.NUXT_ENV_BSC_HEX_ID)
          return bool
        } catch (error) {
          console.error('Something went wrong retrieving chain.')
        }
      },

      /**
       * Assign provider to currentProvider, and register eventlisteners.
       *
       */
      async registerProviderListener(provider) {
        // assign provider to this.currentProvider, there are differenct provider objects
        this.currentProvider = provider

        // Change boolean of walletconnected status
        this.walletConnected = true

        // Connection status does not refer to connection with wallet
        // it just means that connection with provider is available and thus requests can be made to it.

        // Connected, requests can be made to provider.
        this.currentProvider.on('connect', () => {
          this.walletConnected = true
        })

        // Disconnected, requests can no longer be made with provider.
        this.currentProvider.on('disconnect', () => {
          this.walletConnected = false
        })

        // Inform user of account change, only one account can be selected
        this.currentProvider.on('accountsChanged', (newWallet) => {
          this.wallet = newWallet
        })

        // Inform user of chain change
        this.currentProvider.on('chainChanged', (_chainId) => {
          if (_chainId != process.env.NUXT_ENV_BSC_HEX_ID) {
            alert(`Please switch to the correct chain: Binance Smart Chain, Mainnet, chainId: ${process.env.NUXT_ENV_BSC_NETWORK_ID}`)
          }
        })

        this.addChain()

      }
    }
  })

  inject('bsc', bsc)
}

