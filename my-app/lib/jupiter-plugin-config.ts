/**
 * Jupiter Plugin Configuration Service
 * Handles plugin initialization and configuration management
 */

import { IInit, FormProps, JupiterSwapConfig, SwapAnalytics } from '@/types/jupiter-plugin';

export const JUPITER_PLUGIN_CONFIG = {
  // Referral configuration (will be set up in Phase 2)
  referral: {
    account: process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT || '',
    fee: parseInt(process.env.NEXT_PUBLIC_JUPITER_REFERRAL_FEE || '50'), // 0.5% (50 bps)
  },
  
  // Default settings
  defaults: {
    explorer: 'Solscan' as const,
    autoConnect: true,
    localStoragePrefix: 'jupiter-launchpad-',
  },
  
  // Styling
  theme: {
    containerClassName: 'jupiter-swap-container',
    widgetPosition: 'bottom-right' as const,
    widgetSize: 'default' as const,
  },
  
  // Feature flags
  features: {
    enableWalletPassthrough: false, // Use Jupiter's built-in wallet
    enableAnalytics: true,
    enableBranding: true,
  },
} as const;

/**
 * Jupiter Plugin Manager Class
 */
export class JupiterPluginManager {
  private static instance: JupiterPluginManager;
  private analytics: SwapAnalytics[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): JupiterPluginManager {
    if (!JupiterPluginManager.instance) {
      JupiterPluginManager.instance = new JupiterPluginManager();
    }
    return JupiterPluginManager.instance;
  }

  /**
   * Initialize Jupiter Plugin with default configuration
   */
  async initializePlugin(customConfig?: Partial<IInit>): Promise<boolean> {
    if (typeof window === 'undefined' || !window.Jupiter) {
      console.warn('Jupiter Plugin not available. Make sure the script is loaded.');
      return false;
    }

    const defaultConfig: IInit = {
      displayMode: 'modal',
      defaultExplorer: JUPITER_PLUGIN_CONFIG.defaults.explorer,
      autoConnect: JUPITER_PLUGIN_CONFIG.defaults.autoConnect,
      localStoragePrefix: JUPITER_PLUGIN_CONFIG.defaults.localStoragePrefix,
      enableWalletPassthrough: JUPITER_PLUGIN_CONFIG.features.enableWalletPassthrough,
      containerClassName: JUPITER_PLUGIN_CONFIG.theme.containerClassName,
      
      // Default form props with referral
      formProps: {
        referralAccount: JUPITER_PLUGIN_CONFIG.referral.account,
        referralFee: JUPITER_PLUGIN_CONFIG.referral.fee,
      },
      
      // Event handlers
      onSuccess: (result) => this.handleSwapSuccess(result),
      onSwapError: (error) => this.handleSwapError(error),
      onFormUpdate: (form) => this.handleFormUpdate(form),
      
      // Branding (if enabled)
      ...(JUPITER_PLUGIN_CONFIG.features.enableBranding && {
        branding: {
          name: 'Token Launchpad',
          // logoUri: '/logo.png', // Add your logo here
        }
      }),
    };

    const finalConfig = { ...defaultConfig, ...customConfig };

    try {
      window.Jupiter.init(finalConfig);
      this.isInitialized = true;
      console.log('Jupiter Plugin initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Jupiter Plugin:', error);
      return false;
    }
  }

  /**
   * Create a swap interface with custom configuration
   */
  createSwapInterface(config: JupiterSwapConfig): string {
    const targetId = `jupiter-swap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const initConfig: IInit = {
      displayMode: config.mode,
      integratedTargetId: config.mode === 'integrated' ? targetId : undefined,
      widgetStyle: config.mode === 'widget' ? {
        position: JUPITER_PLUGIN_CONFIG.theme.widgetPosition,
        size: JUPITER_PLUGIN_CONFIG.theme.widgetSize,
      } : undefined,
      containerStyles: config.containerStyles,
      containerClassName: config.containerClassName || JUPITER_PLUGIN_CONFIG.theme.containerClassName,
      formProps: {
        referralAccount: JUPITER_PLUGIN_CONFIG.referral.account,
        referralFee: JUPITER_PLUGIN_CONFIG.referral.fee,
        ...config.formProps,
      },
      onSuccess: (result) => {
        this.handleSwapSuccess(result);
        config.onSuccess?.(result);
      },
      onSwapError: (error) => {
        this.handleSwapError(error);
        config.onError?.(error.error);
      },
      onFormUpdate: (form) => {
        this.handleFormUpdate(form);
        config.onFormUpdate?.(form);
      },
    };

    if (typeof window !== 'undefined' && window.Jupiter) {
      window.Jupiter.init(initConfig);
    }

    return targetId;
  }

  /**
   * Pre-configured swap for newly launched tokens
   */
  createPostLaunchSwap(mintAddress: string, platform: 'pump' | 'bonk'): string {
    return this.createSwapInterface({
      mode: 'integrated',
      formProps: {
        initialOutputMint: mintAddress,
        swapMode: 'ExactIn',
        initialAmount: platform === 'pump' ? '0.1' : '0.5', // Suggest different amounts
      },
      containerClassName: 'post-launch-swap',
      onSuccess: (result) => {
        console.log(`🎉 First trade executed for ${platform} token!`, result);
        // Track post-launch trading activity
        this.trackLaunchpadSwap(mintAddress, platform, result);
      }
    });
  }

  /**
   * Quick swap modal for token discovery
   */
  openQuickSwap(tokenMint: string, tokenSymbol?: string): void {
    if (typeof window !== 'undefined' && window.Jupiter) {
      window.Jupiter.init({
        displayMode: 'modal',
        formProps: {
          initialOutputMint: tokenMint,
          referralAccount: JUPITER_PLUGIN_CONFIG.referral.account,
          referralFee: JUPITER_PLUGIN_CONFIG.referral.fee,
        },
        onSuccess: (result) => {
          console.log(`✅ Swap completed for ${tokenSymbol || tokenMint}`, result);
          this.handleSwapSuccess(result);
        },
      });
    }
  }

  /**
   * Fixed amount payment swap (for specific use cases)
   */
  createPaymentSwap(tokenMint: string, amount: string): string {
    return this.createSwapInterface({
      mode: 'integrated',
      formProps: {
        swapMode: 'ExactOut',
        initialOutputMint: tokenMint,
        fixedMint: tokenMint,
        initialAmount: amount,
        fixedAmount: true,
      },
      containerClassName: 'payment-swap',
    });
  }

  /**
   * Handle successful swap (analytics and tracking)
   */
  private handleSwapSuccess(result: any): void {
    if (!JUPITER_PLUGIN_CONFIG.features.enableAnalytics) return;

    const analytics: SwapAnalytics = {
      txid: result.txid,
      timestamp: Date.now(),
      inputMint: result.swapResult?.inputAddress || 'unknown',
      outputMint: result.swapResult?.outputAddress || 'unknown',
      inputAmount: result.swapResult?.inputAmount || 0,
      outputAmount: result.swapResult?.outputAmount || 0,
      priceImpact: result.quoteResponseMeta?.priceImpactPct || 0,
      referralFee: JUPITER_PLUGIN_CONFIG.referral.fee,
      platform: 'jupiter-plugin',
    };

    this.analytics.push(analytics);
    console.log('Swap analytics recorded:', analytics);

    // Store in localStorage for persistence
    try {
      const stored = localStorage.getItem('jupiter-swap-analytics') || '[]';
      const allAnalytics = JSON.parse(stored);
      allAnalytics.push(analytics);
      
      // Keep only last 100 swaps to prevent storage bloat
      if (allAnalytics.length > 100) {
        allAnalytics.splice(0, allAnalytics.length - 100);
      }
      
      localStorage.setItem('jupiter-swap-analytics', JSON.stringify(allAnalytics));
    } catch (error) {
      console.warn('Failed to store swap analytics:', error);
    }
  }

  /**
   * Handle swap errors
   */
  private handleSwapError(error: any): void {
    console.error('Jupiter Plugin swap error:', error);
    
    // Track error for debugging
    const errorLog = {
      timestamp: Date.now(),
      error: error.error?.message || 'Unknown error',
      code: error.error?.code,
    };

    try {
      const stored = localStorage.getItem('jupiter-swap-errors') || '[]';
      const errors = JSON.parse(stored);
      errors.push(errorLog);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('jupiter-swap-errors', JSON.stringify(errors));
    } catch (err) {
      console.warn('Failed to store error log:', err);
    }
  }

  /**
   * Handle form updates (for analytics and UX improvements)
   */
  private handleFormUpdate(form: any): void {
    // Track user interactions for UX improvements
    console.log('Jupiter Plugin form update:', form);
  }

  /**
   * Track launchpad-specific swap analytics
   */
  private trackLaunchpadSwap(mintAddress: string, platform: string, result: any): void {
    const launchpadAnalytics = {
      type: 'post-launch-swap',
      mintAddress,
      platform,
      result,
      timestamp: Date.now(),
    };

    try {
      const stored = localStorage.getItem('launchpad-swap-analytics') || '[]';
      const analytics = JSON.parse(stored);
      analytics.push(launchpadAnalytics);
      localStorage.setItem('launchpad-swap-analytics', JSON.stringify(analytics));
    } catch (error) {
      console.warn('Failed to store launchpad analytics:', error);
    }
  }

  /**
   * Get swap analytics
   */
  getSwapAnalytics(): SwapAnalytics[] {
    try {
      const stored = localStorage.getItem('jupiter-swap-analytics') || '[]';
      return JSON.parse(stored);
    } catch {
      return this.analytics;
    }
  }

  /**
   * Get total swap volume
   */
  getTotalSwapVolume(): { totalSwaps: number; totalVolume: number; referralRevenue: number } {
    const analytics = this.getSwapAnalytics();
    const totalSwaps = analytics.length;
    const totalVolume = analytics.reduce((sum, swap) => sum + (swap.outputAmount || 0), 0);
    const referralRevenue = analytics.reduce((sum, swap) => {
      const swapValue = swap.outputAmount || 0;
      const feeRate = (swap.referralFee || 0) / 10000; // Convert bps to decimal
      return sum + (swapValue * feeRate * 0.8); // 80% after Jupiter's cut
    }, 0);

    return {
      totalSwaps,
      totalVolume,
      referralRevenue,
    };
  }

  /**
   * Close Jupiter Plugin
   */
  close(): void {
    if (typeof window !== 'undefined' && window.Jupiter) {
      window.Jupiter.close();
    }
  }

  /**
   * Resume Jupiter Plugin
   */
  resume(): void {
    if (typeof window !== 'undefined' && window.Jupiter) {
      window.Jupiter.resume();
    }
  }

  /**
   * Check if plugin is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.Jupiter;
  }

  /**
   * Get plugin status
   */
  getStatus(): { available: boolean; initialized: boolean; analytics: any } {
    return {
      available: this.isAvailable(),
      initialized: this.isInitialized,
      analytics: this.getTotalSwapVolume(),
    };
  }
}

// Export singleton instance
export const jupiterPluginManager = JupiterPluginManager.getInstance();

// Export helper functions
export const initializeJupiterPlugin = (config?: Partial<IInit>) => 
  jupiterPluginManager.initializePlugin(config);

export const createSwapInterface = (config: JupiterSwapConfig) => 
  jupiterPluginManager.createSwapInterface(config);

export const openQuickSwap = (tokenMint: string, tokenSymbol?: string) => 
  jupiterPluginManager.openQuickSwap(tokenMint, tokenSymbol);

export const createPostLaunchSwap = (mintAddress: string, platform: 'pump' | 'bonk') => 
  jupiterPluginManager.createPostLaunchSwap(mintAddress, platform);