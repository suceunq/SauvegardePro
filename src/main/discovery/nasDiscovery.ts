import dgram from 'node:dgram'
import net from 'node:net'
import os from 'node:os'
import dns from 'node:dns/promises'
import type { AppareilReseau } from '@shared/types'

const SSDP_ADDR = '239.255.255.250'
const SSDP_PORT = 1900

/** Decouverte SSDP/UPnP reelle : la plupart des NAS grand public (Synology, QNAP...) y repondent. */
export function decouvrirSsdp(dureeMs = 3000): Promise<AppareilReseau[]> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4')
    const trouves = new Map<string, AppareilReseau>()

    const requete = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\n' +
        `HOST: ${SSDP_ADDR}:${SSDP_PORT}\r\n` +
        'MAN: "ssdp:discover"\r\n' +
        'MX: 2\r\n' +
        'ST: ssdp:all\r\n' +
        '\r\n'
    )

    const finir = (): void => {
      try {
        socket.close()
      } catch {
        // deja ferme
      }
      resolve([...trouves.values()])
    }

    socket.on('message', (msg, rinfo) => {
      const texte = msg.toString('utf8')
      const location = texte.match(/LOCATION:\s*(.+)\r?\n/i)?.[1]?.trim()
      const serveur = texte.match(/SERVER:\s*(.+)\r?\n/i)?.[1]?.trim()

      if (!trouves.has(rinfo.address)) {
        trouves.set(rinfo.address, {
          nom: serveur || rinfo.address,
          adresseIp: rinfo.address,
          url: location ?? null,
          source: 'ssdp'
        })
      }
    })

    socket.on('error', finir)

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true)
        socket.send(requete, SSDP_PORT, SSDP_ADDR)
      } catch {
        finir()
      }
    })

    setTimeout(finir, dureeMs)
  })
}

function prefixesReseauLocaux(): string[] {
  const interfaces = os.networkInterfaces()
  const prefixes: string[] = []

  for (const infos of Object.values(interfaces)) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        prefixes.push(info.address.split('.').slice(0, 3).join('.'))
      }
    }
  }

  return [...new Set(prefixes)]
}

function testerPort445(ip: string, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolu = false
    const finir = (ok: boolean): void => {
      if (resolu) return
      resolu = true
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finir(true))
    socket.once('timeout', () => finir(false))
    socket.once('error', () => finir(false))
    socket.connect(445, ip)
  })
}

/** Balaie le sous-reseau local (port 445/SMB) : detecte les NAS/partages sans UPnP. */
export async function balayerReseauSmb(): Promise<AppareilReseau[]> {
  const prefixes = prefixesReseauLocaux()
  const resultats: AppareilReseau[] = []
  const CONCURRENCE = 32

  for (const prefixe of prefixes) {
    const hotes = Array.from({ length: 254 }, (_, i) => `${prefixe}.${i + 1}`)

    for (let i = 0; i < hotes.length; i += CONCURRENCE) {
      const lot = hotes.slice(i, i + CONCURRENCE)
      const reponses = await Promise.all(lot.map(async (ip) => ({ ip, ouvert: await testerPort445(ip) })))

      for (const { ip, ouvert } of reponses) {
        if (!ouvert) continue
        let nom = ip
        try {
          const noms = await dns.reverse(ip)
          if (noms[0]) nom = noms[0]
        } catch {
          // pas de nom DNS resolu : on garde l'adresse IP
        }
        resultats.push({ nom, adresseIp: ip, url: `\\\\${ip}`, source: 'scan-smb' })
      }
    }
  }

  return resultats
}

export async function detecterAppareilsReseau(): Promise<AppareilReseau[]> {
  const [ssdp, smb] = await Promise.all([decouvrirSsdp(), balayerReseauSmb()])
  const parIp = new Map<string, AppareilReseau>()
  for (const appareil of [...ssdp, ...smb]) {
    if (!parIp.has(appareil.adresseIp)) parIp.set(appareil.adresseIp, appareil)
  }
  return [...parIp.values()]
}
