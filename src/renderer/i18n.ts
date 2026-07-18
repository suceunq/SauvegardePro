import { useCallback } from 'react'
import { LOCALES, resoudreLangue, traduire, type CleTraduction, type VariablesTraduction } from '@shared/i18n'
import { useAppStore } from './state/store'

export function useI18n() {
  const preference = useAppStore((etat) => etat.parametres?.langue ?? 'auto')
  const langue = resoudreLangue(preference, navigator.language)
  const t = useCallback(
    (cle: CleTraduction, variables?: VariablesTraduction) => traduire(langue, cle, variables),
    [langue]
  )
  return { t, langue, locale: LOCALES[langue] }
}
