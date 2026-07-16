export function formaterNotesVersion(notes: string): string {
  // Certaines API ou commandes de publication peuvent renvoyer les retours a la ligne
  // sous forme de caracteres litteraux "\\n". On les normalise avant l'affichage.
  const normalise = notes.replace(/\\r\\n|\\n|\\r/g, '\n')
  if (!normalise.includes('<')) {
    return normalise
      .split('\n')
      .map((ligne) => ligne.trim().replace(/^[-*]\s+/, '• '))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  const documentHtml = new DOMParser().parseFromString(normalise, 'text/html')
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
