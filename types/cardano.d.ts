interface Window {
  cardano: {
    eternl: {
      enable: () => Promise<any>
      isEnabled: () => Promise<boolean>
    }
    nami?: {
      enable: () => Promise<any>
      isEnabled: () => Promise<boolean>
    }
    lace?: {
      enable: () => Promise<any>
      isEnabled: () => Promise<boolean>
    }
  }
}