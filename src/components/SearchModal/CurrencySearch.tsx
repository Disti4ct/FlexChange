import { BaseCurrency, Currency, Token } from 'sdk'
import React, { KeyboardEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FixedSizeList } from 'react-window'
import { Text } from 'rebass'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useAllTokens, useToken, useIsUserAddedToken, useFoundOnInactiveList } from 'hooks/Tokens'
import { CloseIcon, TYPE } from 'theme'
import { isAddress } from 'utils'
import Column from '../Column'
import Row, { RowBetween /* RowFixed */ } from '../Row'
import CurrencyList from './CurrencyList'
import { filterTokens } from './filtering'
import { useTokenComparator } from './sorting'
import { PaddedColumn, SearchInput, Separator } from './styleds'
import styled from 'styled-components'
import useToggle from 'hooks/useToggle'
import { useBaseCurrency } from 'hooks/useCurrency'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import useTheme from 'hooks/useTheme'
import ImportRow from './ImportRow'
import { ButtonPrimary } from 'components/Button'

const ContentWrapper = styled(Column)`
  width: 100%;
  flex: 1 1;
  position: relative;
`

const CurrencyListWrapper = styled.div`
  flex: 1;
`

interface CurrencySearchProps {
  isOpen: boolean
  onDismiss: VoidFunction
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  otherSelectedCurrency?: Currency | null
  showManageView: VoidFunction
  showImportView: VoidFunction
  setImportToken: (token: Token) => void
}

export function CurrencySearch({
  selectedCurrency,
  onCurrencySelect,
  otherSelectedCurrency,
  onDismiss,
  isOpen,
  showManageView,
  showImportView,
  setImportToken,
}: CurrencySearchProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const baseCurrency = useBaseCurrency()

  // refs for fixed size lists
  const fixedList = useRef<FixedSizeList>()

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [invertSearchOrder] = useState<boolean>(false)

  const allTokens = useAllTokens()

  // if they input an address, use it
  const searchToken = useToken(searchQuery)
  const searchTokenIsAdded = useIsUserAddedToken(searchToken)

  const showETH: boolean = useMemo(() => {
    const s = searchQuery.toLowerCase().trim()
    return s === '' || s === 'e' || s === 'et' || s === 'eth'
  }, [searchQuery])

  const tokenComparator = useTokenComparator(invertSearchOrder)

  const filteredTokens: Token[] = useMemo(() => {
    return filterTokens(Object.values(allTokens), searchQuery)
  }, [allTokens, searchQuery])

  const filteredSortedTokens: Token[] = useMemo(() => {
    const sorted = filteredTokens.sort(tokenComparator)
    const symbolMatch = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((s) => s.length > 0)

    if (symbolMatch.length > 1) {
      return sorted
    }

    return [
      // sort any exact symbol matches first
      ...sorted.filter((token) => token.symbol?.toLowerCase() === symbolMatch[0]),

      // sort by tokens whos symbols start with search substrng
      ...sorted.filter(
        (token) =>
          token.symbol?.toLowerCase().startsWith(searchQuery.toLowerCase().trim()) &&
          token.symbol?.toLowerCase() !== symbolMatch[0]
      ),

      // rest that dont match upove
      ...sorted.filter(
        (token) =>
          !token.symbol?.toLowerCase().startsWith(searchQuery.toLowerCase().trim()) &&
          token.symbol?.toLowerCase() !== symbolMatch[0]
      ),
    ]
  }, [filteredTokens, searchQuery, tokenComparator])

  const handleCurrencySelect = useCallback(
    (currency: Currency | BaseCurrency) => {
      onCurrencySelect(currency)
      onDismiss()
    },
    [onDismiss, onCurrencySelect]
  )

  // clear the input on open
  useEffect(() => {
    if (isOpen) setSearchQuery('')
  }, [isOpen])

  // manage focus on modal show
  const inputRef = useRef<HTMLInputElement>()
  const handleInput = useCallback((event) => {
    const input = event.target.value
    const checksummedInput = isAddress(input)
    setSearchQuery(checksummedInput || input)
    fixedList.current?.scrollTo(0)
  }, [])

  const handleEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const s = searchQuery.toLowerCase().trim()
        if (baseCurrency && s === baseCurrency.symbol?.toLowerCase()) {
          //@ts-ignore
          handleCurrencySelect(baseCurrency)
        } else if (filteredSortedTokens.length > 0) {
          if (
            filteredSortedTokens[0].symbol?.toLowerCase() === searchQuery.trim().toLowerCase() ||
            filteredSortedTokens.length === 1
          ) {
            handleCurrencySelect(filteredSortedTokens[0])
          }
        }
      }
    },
    [filteredSortedTokens, handleCurrencySelect, searchQuery, baseCurrency]
  )

  // menu ui
  const [open, toggle] = useToggle(false)
  const node = useRef<HTMLDivElement>()
  useOnClickOutside(node, open ? toggle : undefined)

  // if no results on main list, show option to expand into inactive
  const [showExpanded, setShowExpanded] = useState(false)
  const inactiveTokens = useFoundOnInactiveList(searchQuery)

  // reset expanded results on query reset
  useEffect(() => {
    if (searchQuery === '') {
      setShowExpanded(false)
    }
  }, [setShowExpanded, searchQuery])

  return (
    <ContentWrapper>
      <PaddedColumn gap="16px">
        <RowBetween>
          <Text fontWeight={500} fontSize={16}>
            {t('selectToken')}
          </Text>
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
        <Row>
          <SearchInput
            type="text"
            id="token-search-input"
            placeholder={t('tokenSearchPlaceholder')}
            autoComplete="off"
            value={searchQuery}
            ref={inputRef as RefObject<HTMLInputElement>}
            onChange={handleInput}
            onKeyDown={handleEnter}
          />
        </Row>
      </PaddedColumn>
      <Separator />
      {searchToken && !searchTokenIsAdded ? (
        <Column style={{ padding: '20px 0', height: '100%' }}>
          <ImportRow token={searchToken} showImportView={showImportView} setImportToken={setImportToken} />
        </Column>
      ) : filteredSortedTokens?.length > 0 || (showExpanded && inactiveTokens && inactiveTokens.length > 0) ? (
        <CurrencyListWrapper>
          <AutoSizer disableWidth>
            {({ height }) => (
              <CurrencyList
                height={height}
                showETH={showETH}
                currencies={
                  showExpanded && inactiveTokens ? filteredSortedTokens.concat(inactiveTokens) : filteredSortedTokens
                }
                onCurrencySelect={handleCurrencySelect}
                otherCurrency={otherSelectedCurrency}
                selectedCurrency={selectedCurrency}
                fixedListRef={fixedList}
                showImportView={showImportView}
                setImportToken={setImportToken}
              />
            )}
          </AutoSizer>
        </CurrencyListWrapper>
      ) : (
        <Column style={{ padding: '20px', height: '100%' }}>
          <TYPE.main color={theme.text3} textAlign="center" mb="20px">
            {t('noTokenResultsFound')}
          </TYPE.main>
          {inactiveTokens &&
            inactiveTokens.length > 0 &&
            !(searchToken && !searchTokenIsAdded) &&
            searchQuery.length > 1 &&
            filteredSortedTokens?.length === 0 && (
              // expand button in line with no results
              <Row align="center" width="100%" justify="center">
                <ButtonPrimary
                  width="fit-content"
                  borderRadius="12px"
                  padding="8px 12px"
                  onClick={() => setShowExpanded(!showExpanded)}
                >
                  {!showExpanded
                    ? `Show ${inactiveTokens.length} more inactive ${inactiveTokens.length === 1 ? 'token' : 'tokens'}`
                    : 'Hide expanded search'}
                </ButtonPrimary>
              </Row>
            )}
        </Column>
      )}

      {inactiveTokens &&
        inactiveTokens.length > 0 &&
        !(searchToken && !searchTokenIsAdded) &&
        (searchQuery.length > 1 || showExpanded) &&
        (filteredSortedTokens?.length !== 0 || showExpanded) && (
          // button fixed to bottom
          <Row align="center" width="100%" justify="center" style={{ position: 'absolute', bottom: '80px', left: 0 }}>
            <ButtonPrimary
              width="fit-content"
              borderRadius="12px"
              padding="8px 12px"
              onClick={() => setShowExpanded(!showExpanded)}
            >
              {!showExpanded
                ? `Show ${inactiveTokens.length} more inactive ${inactiveTokens.length === 1 ? 'token' : 'tokens'}`
                : 'Hide expanded search'}
            </ButtonPrimary>
          </Row>
        )}
    </ContentWrapper>
  )
}
