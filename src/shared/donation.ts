const DOMAINES_PAYPAL = ['paypal.com', 'paypal.me'] as const

export const URL_DON_PAYPAL_DEFAUT =
  'https://www.paypal.com/donate/?cmd=_donations&business=X6TNHGN5K7QA&item_name=SauvegardePro&currency_code=EUR'

export function estUrlPaypalValide(valeur: string): boolean {
  try {
    const url = new URL(valeur.trim())
    if (url.protocol !== 'https:') return false

    const hote = url.hostname.toLowerCase()
    return DOMAINES_PAYPAL.some((domaine) => hote === domaine || hote.endsWith(`.${domaine}`))
  } catch {
    return false
  }
}
