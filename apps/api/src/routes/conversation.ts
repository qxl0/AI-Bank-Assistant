import { Router, Request, Response } from 'express';
import { ChatMessage, ApiResponse, VisualizationData, TableData, IntentType } from '@bank-app/shared';
import fetch from 'node-fetch'; // ensure this is installed

const router = Router();

interface BackendUIMessage {
  type: 'text';
  content: string;
}

interface BackendChartComponent {
  type: 'chart';
  chartType: 'pie' | 'bar';
  title: string;
  data: any[];
}

interface BackendTableComponent {
  type: 'table';
  title: string;
  columns: string[];
  rows: string[][];
}

interface BackendResponse {
  query: {
    intent?: IntentType;
    is_banking_domain?: boolean;
    time_range?: any;
    params?: any;
  };
  ui: {
    messages: BackendUIMessage[];
    components: Array<BackendChartComponent | BackendTableComponent>;
  };
}

// Adapter: BackendResponse → ChatMessage[]
function mapBackendResponseToChatMessages(response: BackendResponse): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // Text messages
  for (const msg of response.ui.messages) {
    messages.push({
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: msg.content,
      timestamp: new Date(),
      metadata: {
        intent: response.query.intent,
      },
    });
  }

  // Components (charts / tables)
  for (const component of response.ui.components) {
    if (component.type === 'chart') {
      const visualizationData: VisualizationData = {
        type: component.chartType,
        title: component.title,
        data: component.data.map(d => ({
          label: d.category ?? d.merchant ?? d.label,
          value: d.total ?? d.value,
        })),
      };

      messages.push({
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: component.title,
        timestamp: new Date(),
        metadata: { visualizationData },
      });
    }

    if (component.type === 'table') {
      const tableData: TableData = {
        columns: component.columns,
        rows: component.rows,
      };

      messages.push({
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: component.title,
        timestamp: new Date(),
        metadata: { tableData },
      });
    }
  }

  return messages;
}

router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, userId = 'default-user' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // User message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // -----------------------------
    // Real backend API call
    // -----------------------------
    // const backendUrl = process.env.AI_BACKEND_URL || 'http://174.138.83.171:8000/chat';
    const backendUrl = 'http://174.138.83.171:8000/chat';

    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'A123', message }),
    });

    if (!backendRes.ok) {
      throw new Error(`Backend returned ${backendRes.status}`);
    }

    const backendResponse: BackendResponse = await backendRes.json();

    // Map to ChatMessage[]
    const assistantMessages = mapBackendResponseToChatMessages(backendResponse);

    // Return both user and assistant messages
    const responsePayload: ApiResponse<ChatMessage[]> = {
      success: true,
      data: [userMessage, ...assistantMessages],
      metadata: {
        timestamp: new Date(),
        requestId: `req-${Date.now()}`,
      },
    };

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process message',
    });
  }
});

export default router;
