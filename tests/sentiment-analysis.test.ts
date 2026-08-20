import { analyzeSentiment } from '@/lib/ai/sentiment';

describe('Sentiment Analysis', () => {
  describe('Positive Sentiment', () => {
    it('should detect positive messages', () => {
      const result = analyzeSentiment('I love your products! Thank you so much!');
      expect(result.label).toBe('positive');
      expect(result.score).toBeGreaterThan(0.3);
    });

    it('should handle multiple positive triggers', () => {
      const result = analyzeSentiment('Great job! Excellent service! Amazing experience!');
      expect(result.label).toBe('positive');
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe('Negative Sentiment', () => {
    it('should detect negative messages', () => {
      const result = analyzeSentiment('This product is bad and has many issues.');
      expect(result.label).toBe('negative');
      expect(result.score).toBeLessThan(-0.1);
    });

    it('should detect angry sentiment', () => {
      const result = analyzeSentiment('This is a SCAM! FRAUD! I am furious!!!');
      expect(result.label).toBe('angry');
      expect(result.score).toBeLessThan(-0.5);
    });

    it('should handle multiple angry triggers', () => {
      const result = analyzeSentiment('COMPLETE FRAUD! DISHONEST! I will SUE!!!');
      expect(result.label).toBe('angry');
      expect(result.score).toBeLessThan(-0.7);
    });
  });

  describe('Neutral Sentiment', () => {
    it('should detect neutral messages', () => {
      const result = analyzeSentiment('I received my order today.');
      expect(result.label).toBe('neutral');
      expect(Math.abs(result.score)).toBeLessThan(0.2);
    });

    it('should handle factual questions', () => {
      const result = analyzeSentiment('What are your business hours?');
      expect(result.label).toBe('neutral');
      expect(Math.abs(result.score)).toBeLessThan(0.3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = analyzeSentiment('');
      expect(result.label).toBe('neutral');
      expect(result.score).toBe(0);
    });

    it('should handle mixed sentiment (positive overrides)', () => {
      const result = analyzeSentiment('Bad service but I still love you guys!');
      expect(result.score).toBeGreaterThan(0); // Love overrides bad
    });

    it('should handle case insensitivity', () => {
      const result1 = analyzeSentiment('I LOVE your product!');
      const result2 = analyzeSentiment('I love your product!');
      expect(result1.score).toBe(result2.score);
    });
  });

  describe('Escalation Logic', () => {
    it('should recommend escalation for negative sentiment', () => {
      const result = analyzeSentiment('Your product completely failed and ruined my day.');
      expect(result.label).toBe('negative');
      expect(result.score < -0.3).toBe(true); // Signal for escalation
    });

    it('should recommend escalation for angry sentiment', () => {
      const result = analyzeSentiment('YOU ARE A SCAM!');
      expect(result.label).toBe('angry');
      expect(result.score < -0.5).toBe(true); // Definite escalation
    });
  });
});
