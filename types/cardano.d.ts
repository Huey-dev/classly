// In your existing type declaration file (wherever this Window interface is)
interface CardanoWalletAPI {
  enable: () => Promise<any>
  isEnabled: () => Promise<boolean>
}

interface Window {
  cardano?: {
    eternl?: CardanoWalletAPI
    nami?: CardanoWalletAPI
    lace?: CardanoWalletAPI
    flint?: CardanoWalletAPI
    [key: string]: CardanoWalletAPI | undefined
  }
}