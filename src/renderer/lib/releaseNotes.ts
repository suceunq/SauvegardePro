export function formaterNotesVersion(notes: string): string {
  if (!notes.includes('<')) return notes.trim()
  const documentHtml = new DOMParser().parseFromString(notes, 'text/html')
  const lignes: string[] = []
  documentHtml.querySelectorAll('p, h1, h2, h3').forEach((element) => {
    const texte = element.textContent?.trim()
    if (texte) lignes.push(texte)
  })
  documentHtml.querySelectorAll('li').forEach((element) => {
    const texte = element.textContent?.trim()
    if (texte) lignes.push(`• ${texte}`)
  })
  return (lignes.length ? lignes.join('\n') : documentHtml.body.textContent ?? '').trim()
}
