import { resoudreLangue, traduire, type CleTraduction, type PreferenceLangue, type VariablesTraduction } from '../shared/i18n'

let localeSysteme = 'fr-FR'
let obtenirPreference: () => PreferenceLangue = () => 'auto'

export function initialiserI18nMain(locale: string, preference: () => PreferenceLangue): void {
  localeSysteme = locale
  obtenirPreference = preference
}

export function tMain(cle: CleTraduction, variables?: VariablesTraduction): string {
  return traduire(resoudreLangue(obtenirPreference(), localeSysteme), cle, variables)
}
