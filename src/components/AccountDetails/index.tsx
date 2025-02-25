import React, { useCallback, useContext } from 'react'
import { useDispatch } from 'react-redux'
import styled, { ThemeContext } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useActiveWeb3React } from 'hooks'
import { AppDispatch } from 'state'
import { clearAllTransactions } from 'state/transactions/actions'
import { shortenAddress } from 'utils'
import { AutoRow } from '../Row'
import Copy from './Copy'
import Transaction from './Transaction'
import { useETHBalances } from 'state/wallet/hooks'
import { SUPPORTED_WALLETS } from '../../constants'
import { ReactComponent as Close } from 'assets/images/x.svg'
import { getExplorerLink } from 'utils'
import { injected, newWalletlink, newWalletConnect } from 'connectors'
import CoinbaseWalletIcon from 'assets/images/coinbaseWalletIcon.svg'
import WalletConnectIcon from 'assets/images/walletConnectIcon.svg'
import Identicon from '../Identicon'
import { ButtonSecondary } from '../Button'
import { ExternalLink as LinkIcon } from 'react-feather'
import { ExternalLink, LinkStyledButton, TYPE } from 'theme'

const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${(props) => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const InfoCard = styled.div`
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.bg3};
  border-radius: 20px;
  position: relative;
  display: grid;
  grid-row-gap: 12px;
  margin-bottom: 20px;
`

const AccountGroupingRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  justify-content: space-between;
  align-items: center;
  font-weight: 400;
  color: ${({ theme }) => theme.text1};

  div {
    ${({ theme }) => theme.flexRowNoWrap}
    align-items: center;
  }
`

const AccountSection = styled.div`
  background-color: ${({ theme }) => theme.bg1};
  padding: 0rem 1rem;
  ${({ theme }) => theme.mediaWidth.upToMedium`padding: 0rem 1rem 1.5rem 1rem;`};
`

const YourAccount = styled.div`
  h5 {
    margin: 0 0 1rem 0;
    font-weight: 400;
  }

  h4 {
    margin: 0;
    font-weight: 500;
  }
`

const LowerSection = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  padding: 1.5rem;
  flex-grow: 1;
  overflow: auto;
  background-color: ${({ theme }) => theme.bg2};
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  h5 {
    margin: 0;
    font-weight: 400;
    color: ${({ theme }) => theme.text3};
  }
`

const AccountControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  width: 100%;
  font-weight: 500;
  font-size: 1.3rem;

  a:hover {
    text-decoration: underline;
  }

  p {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const AddressLink = styled(ExternalLink)<{ hasENS: boolean; isENS: boolean }>`
  color: ${({ theme }) => theme.text3};
  margin-left: 1rem;
  font-size: 0.825rem;
  display: flex;
  :hover {
    color: ${({ theme }) => theme.text2};
  }
`

const CloseIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 14px;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const CloseColor = styled(Close)`
  path {
    stroke: ${({ theme }) => theme.text4};
  }
`

const WalletName = styled.div`
  width: initial;
  font-size: 0.825rem;
  font-weight: 500;
  color: ${({ theme }) => theme.text3};
`

const IconWrapper = styled.div<{ size?: number }>`
  ${({ theme }) => theme.flexColumnNoWrap};
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  & > img,
  span {
    height: ${({ size }) => (size ? size + 'px' : '32px')};
    width: ${({ size }) => (size ? size + 'px' : '32px')};
  }
  ${({ theme }) => theme.mediaWidth.upToMedium`
    align-items: flex-end;
  `};
`

const TransactionListWrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap};
`

const WalletAction = styled(ButtonSecondary)`
  cursor: pointer;
  width: fit-content;
  font-weight: 400;
  margin-left: 8px;
  font-size: 0.825rem;
  padding: 4px 6px;
`

const BalanceText = styled.p`
  padding: 0;
  margin: 0;
  font-weight: 500;
`

function renderTransactions(transactions: string[]) {
  return (
    <TransactionListWrapper>
      {transactions.map((hash, i) => {
        return <Transaction key={i} hash={hash} />
      })}
    </TransactionListWrapper>
  )
}

interface AccountDetailsProps {
  toggleWalletModal: VoidFunction
  pendingTransactions: string[]
  confirmedTransactions: string[]
  ENSName?: string
  openOptions: VoidFunction
}

export default function AccountDetails({
  toggleWalletModal,
  pendingTransactions,
  confirmedTransactions,
  ENSName,
  openOptions,
}: AccountDetailsProps) {
  const { t } = useTranslation()
  const { chainId, account, connector, deactivate } = useActiveWeb3React()
  const theme = useContext(ThemeContext)
  const dispatch = useDispatch<AppDispatch>()

  const baseCoinBalance = useETHBalances(account ? [account] : [])?.[account ?? '']

  function formatConnectorName() {
    const { ethereum } = window
    const isMetaMask = !!(ethereum && ethereum.isMetaMask)
    const name = Object.keys(SUPPORTED_WALLETS)
      .filter(
        (k) =>
          SUPPORTED_WALLETS[k].connector === connector && (connector !== injected || isMetaMask === (k === 'METAMASK'))
      )
      .map((k) => SUPPORTED_WALLETS[k].name)[0]
    return (
      <WalletName>
        {t('connectedWith')} {name}
      </WalletName>
    )
  }

  function getStatusIcon() {
    if (connector === injected) {
      return (
        <IconWrapper size={16}>
          <Identicon />
        </IconWrapper>
      )
    } else if (chainId && connector === newWalletConnect(chainId)) {
      return (
        <IconWrapper size={16}>
          <img src={WalletConnectIcon} alt={'wallet connect logo'} />
        </IconWrapper>
      )
    } else if (chainId && connector === newWalletlink(chainId)) {
      return (
        <IconWrapper size={16}>
          <img src={CoinbaseWalletIcon} alt={'coinbase wallet logo'} />
        </IconWrapper>
      )
    }
    return null
  }

  const clearAllTransactionsCallback = useCallback(() => {
    if (chainId) dispatch(clearAllTransactions({ chainId }))
  }, [dispatch, chainId])

  return (
    <>
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <CloseColor />
        </CloseIcon>
        <HeaderRow>{t('account')}</HeaderRow>
        <AccountSection>
          <YourAccount>
            <InfoCard>
              <AccountGroupingRow>
                {formatConnectorName()}
                <div>
                  <WalletAction
                    style={{ fontSize: '.825rem', fontWeight: 400, marginRight: '8px' }}
                    onClick={deactivate}
                  >
                    {t('disconnect')}
                  </WalletAction>
                  <WalletAction style={{ fontSize: '.825rem', fontWeight: 400 }} onClick={openOptions}>
                    {t('change')}
                  </WalletAction>
                </div>
              </AccountGroupingRow>

              <AccountGroupingRow id="web3-account-identifier-row">
                <AccountControl>
                  {ENSName ? (
                    <div>
                      {getStatusIcon()}
                      <p> {ENSName}</p>
                    </div>
                  ) : (
                    <div>
                      {getStatusIcon()}
                      <p> {account && shortenAddress(account)}</p>
                    </div>
                  )}
                </AccountControl>
              </AccountGroupingRow>

              <AccountGroupingRow>
                {account && baseCoinBalance ? (
                  <BalanceText>
                    {t('balance')} {baseCoinBalance?.toSignificant(4)}
                  </BalanceText>
                ) : null}
              </AccountGroupingRow>

              <AccountGroupingRow>
                {ENSName ? (
                  <AccountControl>
                    {account && <Copy toCopy={account}>{t('copyAddress')}</Copy>}
                    {chainId && account && (
                      <AddressLink
                        hasENS={!!ENSName}
                        isENS={true}
                        href={chainId ? getExplorerLink(chainId, ENSName, 'address') : ''}
                      >
                        <LinkIcon size={16} />
                        <span style={{ marginLeft: '4px' }}>{t('viewIn')} Explorer</span>
                      </AddressLink>
                    )}
                  </AccountControl>
                ) : (
                  <AccountControl>
                    {account && (
                      <Copy toCopy={account}>
                        <span style={{ marginLeft: '4px' }}>{t('copyAddress')}</span>
                      </Copy>
                    )}
                    {chainId && account && (
                      <AddressLink hasENS={!!ENSName} isENS={false} href={getExplorerLink(chainId, account, 'address')}>
                        <LinkIcon size={16} />
                        <span style={{ marginLeft: '4px' }}>{t('viewIn')} Explorer</span>
                      </AddressLink>
                    )}
                  </AccountControl>
                )}
              </AccountGroupingRow>
            </InfoCard>
          </YourAccount>
        </AccountSection>
      </UpperSection>
      {!!pendingTransactions.length || !!confirmedTransactions.length ? (
        <LowerSection>
          <AutoRow mb={'1rem'} style={{ justifyContent: 'space-between' }}>
            <TYPE.body>{t('recentTransactions')}</TYPE.body>
            <LinkStyledButton onClick={clearAllTransactionsCallback}>({t('clearAll')})</LinkStyledButton>
          </AutoRow>
          {renderTransactions(pendingTransactions)}
          {renderTransactions(confirmedTransactions)}
        </LowerSection>
      ) : (
        <LowerSection>
          <TYPE.body color={theme.text1}>{t('yourTransactionsAppearHere')}...</TYPE.body>
        </LowerSection>
      )}
    </>
  )
}
