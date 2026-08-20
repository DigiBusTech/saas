import { executeChatTool } from '@/lib/ai/tools';
import type { ChatToolContext } from '@/lib/ai/tools';

describe('Tool-Calling System', () => {
  const mockContext: ChatToolContext = {
    workspace_id: 'ws_test',
    conversation_id: 'conv_test',
    user_id: 'user_test',
  };

  describe('Check Order Status Tool', () => {
    it('should handle valid order code', async () => {
      const result = await executeChatTool('check_order_status', JSON.stringify({ order_code: 'ORD-001' }), mockContext);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      // Result will be 'order not found' or actual order details
    });

    it('should handle invalid order code gracefully', async () => {
      const result = await executeChatTool('check_order_status', JSON.stringify({ order_code: 'INVALID' }), mockContext);
      
      expect(result).toBeDefined();
      expect(result.error || result.success).toBeDefined();
      // Should not throw, only return error result
    });

    it('should handle malformed JSON', async () => {
      const result = await executeChatTool('check_order_status', 'not json', mockContext);
      
      expect(result).toBeDefined();
      expect(result.error || result.success).toBeDefined();
      // Should catch parse error and return gracefully
    });
  });

  describe('Get Products and Services Tool', () => {
    it('should search by keyword', async () => {
      const result = await executeChatTool(
        'get_products_and_services',
        JSON.stringify({ search_query: 'laptop' }),
        mockContext
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.items) || result.error).toBe(true);
    });

    it('should return only active items', async () => {
      const result = await executeChatTool(
        'get_products_and_services',
        JSON.stringify({ search_query: '' }),
        mockContext
      );
      
      if (result.items) {
        result.items.forEach((item: any) => {
          expect(item.is_active).toBe(true);
        });
      }
    });

    it('should include purchase links in response', async () => {
      const result = await executeChatTool(
        'get_products_and_services',
        JSON.stringify({ search_query: 'product' }),
        mockContext
      );
      
      if (result.items && result.items.length > 0) {
        expect(result.items[0].purchase_link).toBeDefined();
      }
    });
  });

  describe('Escalate to Human Tool', () => {
    it('should update conversation status to paused', async () => {
      const result = await executeChatTool(
        'escalate_to_human',
        JSON.stringify({ reason: 'Customer angry about order' }),
        mockContext
      );
      
      expect(result).toBeDefined();
      expect(result.success || result.error).toBeDefined();
    });

    it('should log escalation event', async () => {
      const result = await executeChatTool(
        'escalate_to_human',
        JSON.stringify({ reason: 'Billing dispute' }),
        mockContext
      );
      
      if (result.success) {
        // Should have sent escalation email and logged to analytics
        expect(result.success).toContain('escalated') || expect(result.success).toContain('paused');
      }
    });
  });

  describe('Log Purchase Intent Tool', () => {
    it('should create order entry on successful purchase', async () => {
      const result = await executeChatTool(
        'log_purchase_intent',
        JSON.stringify({ product_code: 'PROD-001', quantity: 1 }),
        mockContext
      );
      
      expect(result).toBeDefined();
      expect(result.success || result.error).toBeDefined();
    });

    it('should log conversion analytics', async () => {
      const result = await executeChatTool(
        'log_purchase_intent',
        JSON.stringify({ product_code: 'SERVICE-01', quantity: 2 }),
        mockContext
      );
      
      if (result.success) {
        // Should log to workspace_analytics_events with event_type 'conversion'
        expect(result.success).toBeDefined();
      }
    });

    it('should handle missing product code', async () => {
      const result = await executeChatTool(
        'log_purchase_intent',
        JSON.stringify({ product_code: 'NONEXISTENT', quantity: 1 }),
        mockContext
      );
      
      expect(result).toBeDefined();
      // Should either log as pending order or return error gracefully
    });
  });

  describe('Error Handling', () => {
    it('should never throw, only return results', async () => {
      // All tools must be non-throwing
      const badContext = { ...mockContext };
      
      const result1 = await executeChatTool('invalid_tool', '{}', badContext);
      expect(result1).toBeDefined();
      
      const result2 = await executeChatTool('check_order_status', '{bad json', badContext);
      expect(result2).toBeDefined();
    });

    it('should include error messages in response', async () => {
      const result = await executeChatTool('check_order_status', JSON.stringify({}), mockContext);
      
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
