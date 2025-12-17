import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { accountService } from '../services/account-service';

const router = Router();

/**
 * GET /api/accounts
 * Get all user accounts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'demo-user';

    // Get current balances from account service
    const balances = accountService.getBalances(userId);

    // Mock data - replace with database query
    const accounts = [
      {
        id: 'acc-1',
        userId,
        accountNumber: '****1234',
        accountType: 'checking',
        balance: balances.checking,
        currency: 'USD',
        status: 'active',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'acc-2',
        userId,
        accountNumber: '****5678',
        accountType: 'savings',
        balance: balances.savings,
        currency: 'USD',
        status: 'active',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'acc-3',
        userId,
        accountNumber: '****9012',
        accountType: 'credit',
        balance: balances.credit,
        currency: 'USD',
        status: 'active',
        createdAt: new Date('2024-02-01'),
      },
    ];

    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch accounts',
      },
    });
  }
});

/**
 * GET /api/accounts/transfers/history
 * Get transfer history for the user
 */
router.get('/transfers/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || 'demo-user';
    const transfers = accountService.getTransfers(userId);
    
    console.log('📋 Fetching transfers for', userId, '- Found:', transfers.length);
    
    res.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch transfer history',
      },
    });
  }
});

/**
 * GET /api/accounts/:id
 * Get specific account details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Mock data
    const account = {
      id,
      userId: (req as any).user.userId,
      accountNumber: '****1234',
      accountType: 'checking',
      balance: 5420.50,
      currency: 'USD',
      status: 'active',
      createdAt: new Date('2024-01-15'),
    };

    res.json({
      success: true,
      data: account,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch account',
      },
    });
  }
});

export default router;
