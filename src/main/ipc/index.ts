import { enregistrerJobsIpc } from './jobsIpc'
import { enregistrerRunsIpc } from './runsIpc'
import { enregistrerDiscoveryIpc } from './discoveryIpc'
import { enregistrerSettingsIpc } from './settingsIpc'
import { enregistrerUpdaterIpc } from './updaterIpc'
import type { DependancesIpc } from './types'

export function enregistrerTousLesIpc(deps: DependancesIpc): void {
  enregistrerJobsIpc(deps)
  enregistrerRunsIpc(deps)
  enregistrerDiscoveryIpc(deps)
  enregistrerSettingsIpc(deps)
  enregistrerUpdaterIpc(deps)
}

export type { DependancesIpc }
