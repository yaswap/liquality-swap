import React, { Component } from 'react'
import BrandCard from '../../components/BrandCard/BrandCard'
import Button from '../../components/Button/Button'
import { assets as cryptoassets } from '@yaswap/cryptoassets'
import { getClaimErrors } from '../../utils/validation'
import TransactionDetails from '../../components/TransactionDetails'

import './SwapRedemption.css'

class SwapRedemption extends Component {
  render () {
    const errors = getClaimErrors(this.props.transactions, this.props.isPartyB)
    const claimCurrency = cryptoassets[this.props.assets.b.currency]

    return <div className='SwapRedemption_bigWrap'>
      <BrandCard className='SwapRedemption' title='Claiming'>
        <div className='SwapRedemption_info mt-4'>
          <p className='d-flex justify-content-center pt-4'>
          Before you claim,
          Connect the account that you provided as <br /> {claimCurrency.code} receiving address
          </p>
          <p className='SwapRedemption_buttonWrap'>
            {!errors.claim && <Button className='SwapRedemption_claimButton mt-5' wide primary loadingMessage={this.props.loadingMessage} onClick={() => this.props.redeemSwap()}>Claim {this.props.assets.b.value.toFixed()} {claimCurrency.code}</Button>}
            {errors.claim && <div className='SwapRedemption_errorMessage'>{errors.claim}</div>}
          </p>
        </div>
        <TransactionDetails isClaim />
      </BrandCard>
    </div>
  }
}

export default SwapRedemption
