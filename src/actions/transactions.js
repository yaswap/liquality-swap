import { replace } from 'connected-react-router'
import moment from 'moment'
import { assets as cryptoassets, chains } from '@liquality/cryptoassets'
import config from '../config'
import { actions as swapActions } from './swap'
import { steps } from '../components/SwapProgressStepper/steps'
import { getClient } from '../services/chainClient'
import { sleep } from '../utils/async'
import { getFundExpiration } from '../utils/expiration'
import { generateLink } from '../utils/app-links'

const types = {
  SET_TRANSACTION: 'SET_TRANSACTION',
  SET_START_BLOCK: 'SET_START_BLOCK',
  SET_IS_VERIFIED: 'SET_IS_VERIFIED'
}

function setIsVerified (isVerified) {
  return async (dispatch, getState) => {
    dispatch({ type: types.SET_IS_VERIFIED, isVerified })
    updateStep(dispatch, getState)
  }
}

function setStep (assets, transactions, isPartyB, isVerified, dispatch) {
  let step = steps.INITIATION
  const isInitiationERC20 = config.assets[assets.a.currency].type === 'erc20'
  const fundComplete = !isInitiationERC20 || transactions.a.fund.hash
  if (transactions.a.initiation.hash && fundComplete) {
    console.log("TACA ===> transactions.js, setStep, already has transaction a")
    step = steps.AGREEMENT
    if (transactions.b.initiation.hash) {
      console.log("TACA ===> transactions.js, setStep, already has transaction b")
      const aMinConfirmations = chains[cryptoassets[assets.a.currency].chain].safeConfirmations
      const bMinConfirmations = chains[cryptoassets[assets.b.currency].chain].safeConfirmations
      console.log("TACA ===> transactions.js, setStep, current confirmation of a = ", transactions.a.initiation.confirmations, ", expected confirmation = ", aMinConfirmations)
      console.log("TACA ===> transactions.js, setStep, current confirmation of b = ", transactions.b.initiation.confirmations, ", expected confirmation = ", bMinConfirmations)
      if (transactions.a.initiation.confirmations >= aMinConfirmations && transactions.b.initiation.confirmations >= bMinConfirmations) {
        if ((transactions.b.claim.hash || !isPartyB) && isVerified) {
          step = steps.CLAIMING
        }
        if (transactions.a.claim.hash) {
          step = steps.SETTLED
        }
      }
    }
  }

  console.log("TACA ===> transactions.js, setStep, step = ", step)
  dispatch(swapActions.setStep(step))
}

function setLocation (swap, currentLocation, dispatch) {
  // Do not navigate away from backup link
  console.log("TACA ===> transactions.js, setLocation, swap = ", swap)
  console.log("TACA ===> transactions.js, setLocation, currentLocation = ", currentLocation)
  if (currentLocation.pathname === '/backupLink') return
  if (currentLocation.pathname === '/counterPartyLink') return

  const hasInitiated = swap.transactions.a.initiation.hash && swap.transactions.a.initiation.confirmations > 0
  const hasRefunded = swap.transactions.a.refund && swap.transactions.a.refund.hash
  const canRefund = !swap.transactions.b.claim.hash || swap.transactions.b.claim.confirmations === 0
  const canClaim = swap.transactions.b.claim.hash && swap.secretParams.secret
  const swapExpiration = getFundExpiration(swap.expiration, swap.isPartyB ? 'b' : 'a').time
  const swapExpired = moment().isAfter(swapExpiration)

  console.log("TACA ===> transactions.js, setLocation, hasInitiated = ", hasInitiated)
  console.log("TACA ===> transactions.js, setLocation, hasRefunded = ", hasRefunded)
  console.log("TACA ===> transactions.js, setLocation, canRefund = ", canRefund)
  console.log("TACA ===> transactions.js, setLocation, canClaim = ", canClaim)
  console.log("TACA ===> transactions.js, setLocation, swapExpiration = ", swapExpiration)
  console.log("TACA ===> transactions.js, setLocation, swapExpired = ", swapExpired)

  if (hasInitiated && swapExpired && !canClaim) {
    if (hasRefunded) {
      console.log("TACA ===> transactions.js, setLocation, calling replace(/refunded)")
      dispatch(replace('/refunded'))
    } else if (canRefund) {
      console.log("TACA ===> transactions.js, setLocation, calling replace(/refund)")
      dispatch(replace('/refund'))
    }
  } else if (swap.step === steps.AGREEMENT) {
    console.log("TACA ===> transactions.js, setLocation, calling replace(/waiting)")
    dispatch(replace('/waiting'))
  } else if (swap.step === steps.CLAIMING) {
    console.log("TACA ===> transactions.js, setLocation, calling replace(/redeem)")
    dispatch(replace('/redeem'))
  } else if (swap.step === steps.SETTLED) {
    console.log("TACA ===> transactions.js, setLocation, calling replace(/completed)")
    dispatch(replace('/completed'))
  }
}

function updateStep (dispatch, getState) {
  let state = getState()
  console.log("TACA ===> transactions.js, updateStep, state = ", state)
  setStep(state.swap.assets, state.swap.transactions, state.swap.isPartyB, state.swap.transactions.isVerified, dispatch)
  state = getState()
  setLocation(state.swap, state.router.location, dispatch)
}

async function monitorTransaction (swap, party, kind, tx, dispatch, getState) {
  console.log("TACA ===> transactions.js, monitorTransaction, BEGIN LOOP for tx = ", tx)
  while (true) {
    console.log("TACA ===> transactions.js, monitorTransaction, swap = ", swap)
    console.log("TACA ===> transactions.js, monitorTransaction, party = ", party)
    console.log("TACA ===> transactions.js, monitorTransaction, kind = ", kind)
    console.log("TACA ===> transactions.js, monitorTransaction, tx = ", tx)
    let client
    if (kind === 'claim') {
      const currentParty = party === 'a' ? 'b' : 'a'
      client = getClient(swap.assets[currentParty].currency, swap.wallets[currentParty].type)
    } else if (kind === 'initiation') {
      client = getClient(swap.assets[party].currency, swap.wallets[party].type)
    } else if (kind === 'fund') {
      client = getClient(swap.assets[party].currency, swap.wallets[party].type)
    } else if (kind === 'refund') {
      client = getClient(swap.assets[party].currency, swap.wallets[party].type)
    }
    let updatedTransaction
    try {
      updatedTransaction = await client.chain.getTransactionByHash(tx.hash)
    } catch (e) {
      console.warn(`Getting transaction ${tx.hash} failed. Trying again later.`)
    }
    if (updatedTransaction) {
      dispatch({ type: types.SET_TRANSACTION, party, kind, tx: updatedTransaction })
    }
    console.log("TACA ===> transactions.js, monitorTransaction, calling updateStep")
    updateStep(dispatch, getState)
    console.log("TACA ===> transactions.js, monitorTransaction, sleep 5s")
    await sleep(5000)
  }
}

function setTransaction (party, kind, tx) {
  return async (dispatch, getState) => {
    console.log("TACA ===> transactions.js, setTransaction, party = ", party)
    console.log("TACA ===> transactions.js, setTransaction, kind = ", kind)
    console.log("TACA ===> transactions.js, setTransaction, tx = ", tx)
    dispatch({ type: types.SET_TRANSACTION, party, kind, tx })
    let swap = getState().swap
    const link = generateLink(getState().swap)
    dispatch(swapActions.setLink(link))
    if (tx.hash) { // Only start monitoring when a hash is available
      swap = getState().swap
      await monitorTransaction(swap, party, kind, tx, dispatch, getState)
    }
  }
}

function setStartBlock (party, blockNumber) {
  return async (dispatch, getState) => {
    dispatch({type: types.SET_START_BLOCK, party, blockNumber})
    const link = generateLink(getState().swap)
    dispatch(swapActions.setLink(link))
  }
}

const actions = {
  setTransaction,
  setStartBlock,
  setIsVerified
}

export { types, actions }
