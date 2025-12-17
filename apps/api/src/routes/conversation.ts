import { Router, Request, Response } from 'express';
import { ConversationEngine, VisualizationGenerator, InsightEngine } from '@bank-app/ai-engine';
import { ConversationContext, ChatMessage, ApiResponse, Transaction } from '@bank-app/shared';
import { authenticateToken } from '../middleware/auth';
import { accountService } from '../services/account-service';

const router = Router();

// In-memory conversation storage (replace with database in production)
const conversations = new Map<string, ConversationContext>();

// Lazy-load conversation engine to ensure env vars are loaded
let conversationEngine: ConversationEngine | null = null;

function getConversationEngine(): ConversationEngine {
  if (!conversationEngine) {
    const apiKey = (process.env.OPENAI_API_KEY || '').trim().replace(/\n/g, '');
    console.log('🔑 Initializing OpenAI with key length:', apiKey.length);
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    conversationEngine = new ConversationEngine(apiKey);
  }
  return conversationEngine;
}

/**
 * POST /api/conversation/message
 * Send a message and get AI response
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    // For demo purposes, use mock user ID if not authenticated
    const userId = (req as any).user?.userId || 'demo-user';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Message is required',
        },
      });
    }

    // Get or create conversation context
    let context = conversations.get(userId);
    if (!context) {
      context = {
        userId,
        sessionId: `session-${Date.now()}`,
        messages: [],
        extractedEntities: {},
      };
      conversations.set(userId, context);
    }

    // Process message with AI
    const engine = getConversationEngine();
    const aiResponse = await engine.processMessage(message, context);
    
    console.log('💬 AI Response:', {
      response: aiResponse.response,
      intent: aiResponse.intent,
      hasContent: !!aiResponse.response
    });

    // Execute banking action if needed
    let finalResponse = aiResponse.response;
    let visualizationData = undefined;
    
    if (aiResponse.intent === 'check_balance') {
      // Get current balances from account service
      const balances = accountService.getBalances(userId);
      
      if (aiResponse.entities.accountType) {
        // Specific account type requested
        const accountType = aiResponse.entities.accountType;
        const balance = (balances as any)[accountType] || 0;
        finalResponse = `Your ${accountType} account balance is $${balance.toFixed(2)}.`;
      } else {
        // No specific account type - show all balances
        const totalBalance = balances.checking + balances.savings;
        finalResponse = `Here are your account balances:\n\n` +
          `💰 **Checking**: $${balances.checking.toFixed(2)}\n` +
          `💰 **Savings**: $${balances.savings.toFixed(2)}\n` +
          `💳 **Credit**: $${Math.abs(balances.credit).toFixed(2)} (owed)\n\n` +
          `**Total Balance**: $${totalBalance.toFixed(2)}`;
      }
    }
    
    if (aiResponse.intent === 'view_transactions') {
      // Mock transaction data for the requested account
      const accountType = aiResponse.entities.accountType || 'checking';
      let limit = aiResponse.entities.limit || 10;
      let paymentsOnly = aiResponse.entities.paymentsOnly || false;
      
      // Fallback: detect "payment" in original user message if OpenAI missed it
      const lowerMessage = message.toLowerCase();
      console.log('🔍 Checking message for payment keywords:', lowerMessage);
      console.log('🔍 paymentsOnly before fallback:', paymentsOnly);
      
      if (!paymentsOnly && lowerMessage.match(/\b(payment|paid|pay|bill)\b/)) {
        paymentsOnly = true;
        console.log('✅ Fallback detected payment keyword - setting paymentsOnly=true');
      }
      
      // Adjust limit based on "last" keyword if OpenAI missed it
      if (lowerMessage.includes('last') && limit > 3) {
        limit = 3;
        console.log('✅ Fallback detected "last" - setting limit=3');
      }
      
      console.log('🔍 Final settings - paymentsOnly:', paymentsOnly, 'limit:', limit);
      
      let allTransactions = [
        { date: '2024-12-10', description: 'Amazon Purchase', amount: -89.99, balance: 5420.50 },
        { date: '2024-12-08', description: 'Salary Deposit', amount: 3500.00, balance: 5510.49 },
        { date: '2024-12-07', description: 'Grocery Store', amount: -156.32, balance: 2010.49 },
        { date: '2024-12-05', description: 'Electric Bill', amount: -125.00, balance: 2166.81 },
        { date: '2024-12-03', description: 'Gas Station', amount: -45.50, balance: 2291.81 },
        { date: '2024-12-01', description: 'Restaurant', amount: -67.25, balance: 2337.31 },
        { date: '2024-11-28', description: 'ATM Withdrawal', amount: -200.00, balance: 2404.56 },
        { date: '2024-11-25', description: 'Online Transfer', amount: -500.00, balance: 2604.56 },
      ];
      
      // Filter for payments only if requested (negative amounts only)
      if (paymentsOnly) {
        allTransactions = allTransactions.filter(tx => tx.amount < 0);
      }
      
      const mockTransactions = allTransactions.slice(0, limit);
      
      const transactionList = mockTransactions
        .map(tx => `• ${tx.date} - ${tx.description}: ${tx.amount >= 0 ? '+' : ''}$${Math.abs(tx.amount).toFixed(2)}`)
        .join('\n');
      
      const typeLabel = paymentsOnly ? 'payments' : 'transactions';
      finalResponse = `Here are your recent ${typeLabel} for your ${accountType} account:\n\n${transactionList}\n\n` +
        `Current Balance: $${allTransactions[0]?.balance || 5420.50}`;
    }
    
    if (aiResponse.intent === 'spending_analysis') {
      // Mock transaction data
      const mockTransactions: Transaction[] = [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          type: 'debit',
          amount: -350.00,
          category: 'dining',
          description: 'Restaurants',
          status: 'completed',
          timestamp: new Date('2024-12-01'),
        },
        {
          id: 'tx-2',
          accountId: 'acc-1',
          type: 'debit',
          amount: -500.00,
          category: 'shopping',
          description: 'Retail purchases',
          status: 'completed',
          timestamp: new Date('2024-12-05'),
        },
        {
          id: 'tx-3',
          accountId: 'acc-1',
          type: 'debit',
          amount: -200.00,
          category: 'transportation',
          description: 'Gas and transit',
          status: 'completed',
          timestamp: new Date('2024-12-08'),
        },
        {
          id: 'tx-4',
          accountId: 'acc-1',
          type: 'debit',
          amount: -150.00,
          category: 'utilities',
          description: 'Electric and internet',
          status: 'completed',
          timestamp: new Date('2024-12-10'),
        },
      ];
      
      // Analyze spending patterns
      const patterns = InsightEngine.analyzeSpendingPatterns(mockTransactions, 'month');
      const totalSpent = patterns.reduce((sum, p) => sum + p.amount, 0);
      
      // Check if user asked about a specific category
      const requestedCategory = aiResponse.entities.category;
      
      if (requestedCategory) {
        // Find the specific category
        const categoryPattern = patterns.find(p => p.category.toLowerCase() === requestedCategory.toLowerCase());
        
        if (categoryPattern) {
          finalResponse = `You spent **$${categoryPattern.amount.toFixed(2)}** on ${requestedCategory} last month. This represents ${categoryPattern.percentage.toFixed(1)}% of your total spending ($${totalSpent.toFixed(2)}).`;
          
          // Still show visualization for context
          visualizationData = VisualizationGenerator.generateSpendingBreakdown(patterns);
        } else {
          finalResponse = `I don't have any ${requestedCategory} transactions recorded for last month. Your spending was in these categories: ${patterns.map(p => p.category).join(', ')}.`;
        }
      } else {
        // General spending analysis
        // Generate visualization
        visualizationData = VisualizationGenerator.generateSpendingBreakdown(patterns);
        
        // Create detailed response
        const topCategories = patterns.slice(0, 3).map(p => 
          `${p.category}: $${p.amount.toFixed(2)} (${p.percentage.toFixed(1)}%)`
        ).join(', ');
        
        finalResponse = `This month you've spent a total of $${totalSpent.toFixed(2)}. Your top spending categories are: ${topCategories}. I've created a visualization below to show the breakdown.`;
      }
    }

    if (aiResponse.intent === 'loan_eligibility') {
      // Mock loan eligibility assessment
      const loanType = aiResponse.entities.loanType || 'personal';
      const accountBalance = 5420.50 + 12850.00; // Total from checking + savings
      const mockCreditScore = 720;
      const mockAnnualIncome = 75000;
      
      // Simple eligibility logic
      const isEligible = mockCreditScore >= 650 && accountBalance >= 5000;
      const estimatedAmount = isEligible ? Math.floor(mockAnnualIncome * 3.5) : 0;
      
      if (isEligible) {
        finalResponse = `Great news! Based on your financial profile, you appear to be eligible for a ${loanType} loan. Here's a summary:\n\n` +
          `✅ Credit Score: ${mockCreditScore} (Excellent)\n` +
          `✅ Available Funds: $${accountBalance.toFixed(2)}\n` +
          `✅ Estimated Loan Amount: Up to $${estimatedAmount.toLocaleString()}\n\n` +
          `Your estimated interest rate would be around 5.5% - 6.5% based on current market conditions. ` +
          `I recommend scheduling an appointment with one of our loan specialists to discuss your options and get pre-approved.`;
      } else {
        finalResponse = `Based on your current financial profile, you may need to improve a few areas before qualifying for a ${loanType} loan:\n\n` +
          `${mockCreditScore < 650 ? '• Credit Score: Consider improving your credit score to at least 650\n' : ''}` +
          `${accountBalance < 5000 ? '• Savings: Building up your savings to at least $5,000 would strengthen your application\n' : ''}` +
          `\nDon't worry! I can help you create a plan to reach your loan eligibility goals. Would you like personalized recommendations?`;
      }
    }

    if (aiResponse.intent === 'transfer_money') {
      // Extract transfer details
      const amount = aiResponse.entities.amount || 0;
      const fromAccount = aiResponse.entities.fromAccount || 'checking';
      const toAccount = aiResponse.entities.toAccount || 'savings';
      
      // Validate transfer amount
      if (amount <= 0) {
        finalResponse = `I noticed you want to make a transfer, but I need to know the amount. How much would you like to transfer?`;
      } else {
        // Perform transfer using account service
        const result = accountService.transfer(userId, fromAccount, toAccount, amount);
        
        if (!result.success) {
          finalResponse = `I'm sorry, but the transfer could not be completed. ${result.message}`;
        } else {
          // Successful transfer
          const confirmationNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          
          finalResponse = `✅ Transfer completed successfully!\n\n` +
            `**Transfer Details:**\n` +
            `• Amount: $${amount.toFixed(2)}\n` +
            `• From: ${fromAccount.charAt(0).toUpperCase() + fromAccount.slice(1)} account\n` +
            `• To: ${toAccount.charAt(0).toUpperCase() + toAccount.slice(1)} account\n` +
            `• Confirmation #: ${confirmationNumber}\n` +
            `• Date: ${new Date().toLocaleString()}\n\n` +
            `**Updated Balances:**\n` +
            `• ${fromAccount.charAt(0).toUpperCase() + fromAccount.slice(1)}: $${(result.newBalances as any)[fromAccount].toFixed(2)}\n` +
            `• ${toAccount.charAt(0).toUpperCase() + toAccount.slice(1)}: $${(result.newBalances as any)[toAccount].toFixed(2)}\n\n` +
            `Your transfer has been processed instantly. Is there anything else I can help you with?`;
        }
      }
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: finalResponse,
      timestamp: new Date(),
      metadata: {
        intent: aiResponse.intent,
        entities: aiResponse.entities,
        ...(visualizationData && { visualizationData }),
      },
    };

    // Update conversation context
    context.messages.push(userMessage, assistantMessage);
    context.currentIntent = aiResponse.intent;
    context.extractedEntities = { ...context.extractedEntities, ...aiResponse.entities };

    const response: ApiResponse<ChatMessage> = {
      success: true,
      data: assistantMessage,
      metadata: {
        timestamp: new Date(),
        requestId: `req-${Date.now()}`,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Conversation error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERSATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process message',
      },
    });
  }
});

/**
 * GET /api/conversation/history
 * Get conversation history
 */
router.get('/history', (req: Request, res: Response) => {
  const userId = (req as any).user?.userId || 'demo-user';
  const context = conversations.get(userId);

  res.json({
    success: true,
    data: context?.messages || [],
  });
});

/**
 * DELETE /api/conversation/clear
 * Clear conversation history
 */
router.delete('/clear', (req: Request, res: Response) => {
  const userId = (req as any).user?.userId || 'demo-user';
  conversations.delete(userId);

  res.json({
    success: true,
    data: { message: 'Conversation cleared' },
  });
});

export default router;
