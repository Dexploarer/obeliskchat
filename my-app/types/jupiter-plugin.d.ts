/**
 * Jupiter Plugin TypeScript Declarations
 * Based on Jupiter Plugin API documentation
 */

declare global {
  interface Window {
    Jupiter: JupiterPlugin;
  }
}

export type WidgetPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export type WidgetSize = 'sm' | 'default';
export type SwapMode = "ExactInOrOut" | "ExactIn" | "ExactOut";
export type DefaultExplorer = 'Solana Explorer' | 'Solscan' | 'Solana Beach' | 'SolanaFM';

export interface FormProps {
  swapMode?: SwapMode;
  initialAmount?: string;
  initialInputMint?: string;
  initialOutputMint?: string;
  fixedAmount?: boolean;
  fixedMint?: string;
  referralAccount?: string;
  referralFee?: number;
}

export interface BrandingProps {
  logoUri?: string;
  name?: string;
}

export interface IInit {
  localStoragePrefix?: string;
  formProps?: FormProps;
  defaultExplorer?: DefaultExplorer;
  autoConnect?: boolean;
  displayMode?: 'modal' | 'integrated' | 'widget';
  integratedTargetId?: string;
  widgetStyle?: {
    position?: WidgetPosition;
    size?: WidgetSize;
  };
  containerStyles?: React.CSSProperties;
  containerClassName?: string;
  enableWalletPassthrough?: boolean;
  passthroughWalletContextState?: WalletContextState;
  onRequestConnectWallet?: () => void | Promise<void>;
  onSwapError?: ({
    error,
    quoteResponseMeta,
  }: {
    error?: TransactionError;
    quoteResponseMeta: QuoteResponse | null;
  }) => void;
  onSuccess?: ({
    txid,
    swapResult,
    quoteResponseMeta,
  }: {
    txid: string;
    swapResult: SwapResult;
    quoteResponseMeta: QuoteResponse | null;
  }) => void;
  onFormUpdate?: (form: IForm) => void;
  onScreenUpdate?: (screen: IScreen) => void;
  branding?: BrandingProps;
}

export interface JupiterPlugin {
  _instance: JSX.Element | null;
  init: (props: IInit) => void;
  resume: () => void;
  close: () => void;
  root: Root | null;
  enableWalletPassthrough: boolean;
  onRequestConnectWallet: IInit['onRequestConnectWallet'];
  store: ReturnType<typeof createStore>;
  syncProps: (props: { 
    passthroughWalletContextState?: IInit['passthroughWalletContextState'] 
  }) => void;
  onSwapError: IInit['onSwapError'];
  onSuccess: IInit['onSuccess'];
  onFormUpdate: IInit['onFormUpdate'];
  onScreenUpdate: IInit['onScreenUpdate'];
  localStoragePrefix: string;
}

// Supporting types
export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: SwapMode;
  slippageBps: number;
  priceImpactPct: number;
  routePlan: RoutePlan[];
}

export interface SwapResult {
  txid: string;
  inputAddress: string;
  outputAddress: string;
  inputAmount: number;
  outputAmount: number;
}

export interface TransactionError {
  name: string;
  message: string;
  code?: number;
}

export interface RoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface IForm {
  fromMint: string;
  toMint: string;
  fromValue: string;
  toValue: string;
  swapMode: SwapMode;
}

export interface IScreen {
  screenId: string;
  title: string;
}

export interface WalletContextState {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  wallet: Wallet | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions
  ) => Promise<TransactionSignature>;
  signTransaction?: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions?: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

// Utility types for our application
export interface JupiterSwapConfig {
  mode: 'modal' | 'integrated' | 'widget';
  formProps?: FormProps;
  containerStyles?: React.CSSProperties;
  containerClassName?: string;
  onSuccess?: (result: SwapResult) => void;
  onError?: (error: TransactionError) => void;
  onFormUpdate?: (form: IForm) => void;
}

export interface SwapAnalytics {
  txid: string;
  timestamp: number;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  referralFee?: number;
  platform: 'jupiter-plugin';
}

export { };