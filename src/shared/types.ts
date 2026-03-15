export interface ConfigItem {
  name: string
  connections: Record<string, any>
  connection: string
  tileSize: number
  direction: string
  tiles: any[]
  [key: string]: any
}

export interface ConfigFileFormat {
  title: string
  configs: ConfigItem[]
  currentConfigIndex: number
  selectConfigAtLaunch: boolean
}
