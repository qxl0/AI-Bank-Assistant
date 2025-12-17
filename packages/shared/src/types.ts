// Core Banking Types

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'credit';
  balance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  createdAt: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'debit' | 'credit' | 'transfer';
  amount: number;
  category: string;
  description: string;
  merchantName?: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  scheduledDate?: Date;
  createdAt: Date;
}

// AI Conversation Types

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: IntentType;
    entities?: Record<string, any>;
    visualizationData?: VisualizationData;
    tableData?: TableData;
  };
}

export type IntentType =
  | 'check_balance'
  | 'view_transactions'
  | 'transfer_money'
  | 'pay_bill'
  | 'spending_analysis'
  | 'savings_goal'
  | 'loan_eligibility'
  | 'general_inquiry'
  | 'visualize_data';

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  currentIntent?: IntentType;
  extractedEntities: Record<string, any>;
}

// Financial Insights Types

export interface SpendingPattern {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  comparisonPeriod?: {
    previous: number;
    change: number;
  };
}

export interface FinancialInsight {
  id: string;
  type: 'spending' | 'saving' | 'alert' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  relatedData?: any;
  createdAt: Date;
}

export interface BudgetRecommendation {
  category: string;
  currentSpending: number;
  recommendedLimit: number;
  reasoning: string;
}

// Visualization Types

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

export interface VisualizationData {
  type: ChartType;
  title: string;
  data: Array<{
    label: string;
    value: number;
    color?: string;
    metadata?: Record<string, any>;
  }>;
  config?: {
    xAxisLabel?: string;
    yAxisLabel?: string;
    showLegend?: boolean;
    animate?: boolean;
  };
}

export interface TableData {
  columns: string[];
  rows: string[][];
}

// Loan & Product Types

export interface LoanEligibility {
  productType: 'home' | 'auto' | 'personal' | 'business';
  eligible: boolean;
  maxAmount?: number;
  estimatedRate?: number;
  reasons: string[];
  requirements?: string[];
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  monthlyContribution: number;
  status: 'on-track' | 'behind' | 'ahead' | 'completed';
}

// API Response Types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}
