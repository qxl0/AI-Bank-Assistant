/**
 * In-Memory Account Service
 * Tracks account balances with state management
 * Replace with database implementation for production
 */

interface AccountBalance {
  checking: number;
  savings: number;
  credit: number;
}

interface TransferRecord {
  id: string;
  timestamp: Date;
  fromAccount: string;
  toAccount: string;
  amount: number;
  confirmationNumber: string;
}

class AccountService {
  private balances: Map<string, AccountBalance> = new Map();
  private transfers: Map<string, TransferRecord[]> = new Map();

  /**
   * Get initial balances for a user
   */
  private getInitialBalances(): AccountBalance {
    return {
      checking: 5420.50,
      savings: 12850.00,
      credit: -1250.00,
    };
  }

  /**
   * Get balances for a user
   */
  getBalances(userId: string): AccountBalance {
    if (!this.balances.has(userId)) {
      const initial = this.getInitialBalances();
      this.balances.set(userId, initial);
    }
    return this.balances.get(userId)!;
  }

  /**
   * Get specific account balance
   */
  getAccountBalance(userId: string, accountType: 'checking' | 'savings' | 'credit'): number {
    const balances = this.getBalances(userId);
    return balances[accountType];
  }

  /**
   * Transfer money between accounts
   */
  transfer(
    userId: string,
    fromAccount: 'checking' | 'savings' | 'credit',
    toAccount: 'checking' | 'savings' | 'credit',
    amount: number
  ): { success: boolean; message: string; newBalances: AccountBalance } {
    const balances = this.getBalances(userId);

    // Validate transfer
    if (amount <= 0) {
      return {
        success: false,
        message: 'Transfer amount must be positive',
        newBalances: balances,
      };
    }

    if (fromAccount === toAccount) {
      return {
        success: false,
        message: 'Cannot transfer to the same account',
        newBalances: balances,
      };
    }

    // Check sufficient funds (for non-credit accounts)
    if (fromAccount !== 'credit' && balances[fromAccount] < amount) {
      return {
        success: false,
        message: `Insufficient funds in ${fromAccount} account`,
        newBalances: balances,
      };
    }

    // Perform transfer
    balances[fromAccount] -= amount;
    balances[toAccount] += amount;

    // Update stored balances
    this.balances.set(userId, balances);
    
    // Record the transfer
    const confirmationNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const transfer: TransferRecord = {
      id: `transfer-${Date.now()}`,
      timestamp: new Date(),
      fromAccount,
      toAccount,
      amount,
      confirmationNumber,
    };
    
    if (!this.transfers.has(userId)) {
      this.transfers.set(userId, []);
    }
    this.transfers.get(userId)!.unshift(transfer); // Add to beginning
    
    return {
      success: true,
      message: 'Transfer completed successfully',
      newBalances: balances,
    };
  }

  /**
   * Get transfer history for a user
   */
  getTransfers(userId: string): TransferRecord[] {
    return this.transfers.get(userId) || [];
  }

  /**
   * Update account balance directly
   */
  updateBalance(
    userId: string,
    accountType: 'checking' | 'savings' | 'credit',
    newBalance: number
  ): void {
    const balances = this.getBalances(userId);
    balances[accountType] = newBalance;
    this.balances.set(userId, balances);
  }

  /**
   * Reset balances to initial state
   */
  resetBalances(userId: string): void {
    this.balances.set(userId, this.getInitialBalances());
  }
}

// Singleton instance
export const accountService = new AccountService();
