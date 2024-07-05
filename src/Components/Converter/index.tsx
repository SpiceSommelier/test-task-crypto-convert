import './converter.scss'
import { ChangeEvent, useCallback, useEffect, useReducer } from 'react'
import Input from 'antd/es/input/Input'
import { Select } from 'antd'
import { DefaultOptionType } from 'antd/es/select'

type AssetType = 'BTC' | 'USDT' | 'ETH' | undefined

let fetchCurrencyRates = async (
  firstAsset: AssetType,
  secondAsset: AssetType
) => {
  if (firstAsset === secondAsset) return { price: 1 }
  const API_BASE = 'https://api.binance.com/api/v3/'
  const requestBuilder = (): string => {
    const endpoint = 'ticker/price?symbol='
    if (firstAsset === 'ETH')
      return `${API_BASE}${endpoint}${firstAsset}${secondAsset}`
    if (secondAsset === 'ETH')
      return `${API_BASE}${endpoint}${secondAsset}${firstAsset}`
    if (firstAsset === 'BTC')
      return `${API_BASE}${endpoint}${firstAsset}${secondAsset}`
    if (secondAsset === 'BTC')
      return `${API_BASE}${endpoint}${secondAsset}${firstAsset}`
    throw new Error('Invalid asset')
  }
  const request = await fetch(requestBuilder())
  if (request.ok) {
    return await request.json()
  } else {
    throw new Error(`Error ${request.status}`)
  }
}

const debounce = <F extends (...args: any[]) => Promise<any>>(
  func: F,
  wait: number
) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve, reject) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        func(...args)
          .then(resolve)
          .catch(reject)
      }, wait)
    })
  }
}

fetchCurrencyRates = debounce(fetchCurrencyRates, 150)

const options: DefaultOptionType[] = [
  {
    value: 'USDT',
    label: <div className="converter__selector--USDT">USDT</div>,
  },
  {
    value: 'BTC',
    label: <div className="converter__selector--BTC">BTC</div>,
  },
  {
    value: 'ETH',
    label: <div className="converter__selector--ETH">ETH</div>,
  },
]

type State = {
  loading?: boolean
  error?: boolean
  fromAsset: AssetType
  toAsset: AssetType
  fromValue?: number
  toValue?: number
  course?: number
  requestDate?: Date
}

type ActionObj = {
  type: string
  loading?: boolean
  error?: boolean
  fromAsset?: AssetType
  toAsset?: AssetType
  fromValue?: number
  toValue?: number
  course?: number
  requestDate?: Date
}

type Reducer = (state: State, action: ActionObj) => State

const initialState: State = {
  error: false,
  loading: false,
  fromAsset: options[1].value as AssetType,
  toAsset: options[0].value as AssetType,
  fromValue: 1,
  toValue: 0,
  course: 0,
  requestDate: new Date(),
}

const reducer: Reducer = (state, action) => {
  switch (action.type) {
    case 'setError':
      return {
        ...state,
        error: action.error,
      }
    case 'setLoading':
      return {
        ...state,
        loading: action.loading,
      }
    case 'setFromAsset':
      return {
        ...state,
        fromAsset: action.fromAsset,
      }
    case 'setToAsset':
      return {
        ...state,
        toAsset: action.toAsset,
      }
    case 'setFromValue':
      return {
        ...state,
        fromValue: action.fromValue,
      }
    case 'setToValue':
      return {
        ...state,
        toValue: action.toValue,
      }
    case 'setCourse':
      return {
        ...state,
        course: action.course,
      }
    case 'setRequestDate':
      return {
        ...state,
        requestDate: action.requestDate,
      }
    default:
      throw new Error('Invalid action type')
  }
}

const Converter = () => {
  const [state, dispatch] = useReducer<React.Reducer<State, ActionObj>>(
    reducer,
    initialState
  )

  const calculateValuesFrom = useCallback(() => {
    if (state.course === 1)
      dispatch({ type: 'setToValue', toValue: state.fromValue })
    if (
      state.fromAsset === 'ETH' ||
      (state.fromAsset === 'BTC' && state.toAsset === 'USDT')
    )
      dispatch({
        type: 'setToValue',
        toValue:
          state.course && state.fromValue
            ? state.course * state.fromValue
            : undefined,
      })
    if (state.fromAsset === 'BTC' && state.toAsset === 'ETH') {
      dispatch({
        type: 'setToValue',
        toValue:
          state.course && state.fromValue
            ? state.fromValue / state.course
            : undefined,
      })
    }
    if (state.fromAsset === 'USDT') {
      dispatch({
        type: 'setToValue',
        toValue:
          state.course && state.fromValue
            ? Number((state.fromValue / state.course).toFixed(14))
            : undefined,
      })
    }
  }, [state.fromAsset, state.fromValue, state.course])

  useEffect(() => {
    try {
      fetchCurrencyRates(state.fromAsset, state.toAsset).then(
        ({ price }: { price: number }) =>
          dispatch({ type: 'setCourse', course: price })
      )
    } catch (error) {
      dispatch({ type: 'setError', error: true })
    }
  }, [])

  useEffect(() => {
    calculateValuesFrom()
    dispatch({ type: 'setRequestDate', requestDate: new Date() })
  }, [state.course])

  useEffect(() => {
    try {
      fetchCurrencyRates(state.fromAsset, state.toAsset).then(
        ({ price }: { price: number }) => {
          dispatch({ type: 'setCourse', course: price })
          calculateValuesFrom()
          dispatch({ type: 'setRequestDate', requestDate: new Date() })
        }
      )
    } catch (error) {
      dispatch({ type: 'setError', error: true })
    }
  }, [state.fromAsset, state.fromValue, state.toAsset])

  const handleInput = (
    evt: ChangeEvent<HTMLInputElement>,
    valueType: string
  ): void => {
    const key = `${valueType[0].toLowerCase()}${valueType.slice(1)}`
    dispatch({ type: `set${valueType}`, [key]: evt.target.value })
  }

  const handleSelect = (value: AssetType, assetType: keyof State) => {
    const type = `set${assetType.charAt(0).toUpperCase() + assetType.slice(1)}`
    dispatch({ type: type, [assetType]: value })
  }
  const handleClick = () => {
    const temp = {
      ...state,
    }
    dispatch({ type: 'setFromAsset', fromAsset: state.toAsset })
    dispatch({ type: 'setFromValue', fromValue: state.toValue })
    dispatch({ type: 'setToAsset', toAsset: temp.fromAsset })
    dispatch({ type: 'setToValue', toValue: temp.fromValue })
  }

  const handleCourseInfo = () => {
    if (state.fromAsset === 'ETH')
      return `1 ${state.fromAsset} = ${state.course} ${state.toAsset}`
    if (state.fromAsset === 'BTC' && state.toAsset !== 'ETH')
      return `1 ${state.fromAsset} = ${state.course} ${state.toAsset}`
    if (state.fromAsset === 'BTC' && state.toAsset === 'ETH')
      return `1 ${state.fromAsset} = ${(1 / (state.course || 0)).toFixed(6)} ${
        state.toAsset
      }`
    if (state.fromAsset === 'USDT')
      return `1 ${state.fromAsset} = ${(1 / (state.course || 0)).toFixed(6)} ${
        state.toAsset
      }`
  }

  return (
    <div className="converter">
      <Input
        value={state.fromValue}
        onChange={(evt: ChangeEvent<HTMLInputElement>) => {
          handleInput(evt, 'FromValue')
        }}
        className="no-spinners"
        autoFocus
        style={{
          width: '45%',
          height: '35px',
        }}
        inputMode="numeric"
        type="number"
        addonAfter={
          <Select
            value={state.fromAsset}
            onChange={(value: AssetType) => handleSelect(value, 'fromAsset')}
            defaultValue={state.fromAsset}
            style={{
              width: '90px',
              height: '35px',
              borderLeft: 'unset',
            }}
            options={options}
          />
        }
      />
      <button className="converter__convert-btn" onClick={handleClick} />
      <Input
        disabled
        onChange={(evt: ChangeEvent<HTMLInputElement>) => {
          handleInput(evt, 'ToValue')
        }}
        value={state.toValue}
        style={{
          width: '45%',
          height: '35px',
        }}
        inputMode="numeric"
        type="number"
        addonAfter={
          <Select
            value={state.toAsset}
            onChange={(value: AssetType) => handleSelect(value, 'toAsset')}
            defaultValue={state.toAsset}
            style={{
              width: '90px',
              height: '35px',
              borderLeft: 'unset',
            }}
            options={options}
          />
        }
      />
      <p className="converter__course">{handleCourseInfo()}</p>
      <p className="converter__disclaimer">
        Данные носят ознакомительный характер -{' '}
        {`${state.requestDate?.toLocaleDateString(
          'ru-RU'
        )} ${state.requestDate?.getHours()}:${state.requestDate?.getMinutes()} МСК`}
      </p>
    </div>
  )
}

export default Converter
