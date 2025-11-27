import { describe, it, expect } from 'vitest';
import { classifyItem, isAmbiguous, formatClarificationQuestion } from '../../../server/itemClassifier.js';

describe('Item Classifier', () => {
  describe('classifyItem', () => {
    describe('keyword-based classification (highest priority)', () => {
      it('should classify items with "frozen" keyword to freezer', () => {
        const items = ['frozen fish', 'frozen peas', 'frozen pizza', 'frozen vegetables'];
        items.forEach(item => {
          const result = classifyItem(item);
          expect(result.category).toBe('freezer');
          expect(result.isAmbiguous).toBe(false);
          expect(result.reason).toBe('keyword');
        });
      });

      it('should classify items with "fresh" keyword to fridge', () => {
        const items = ['fresh salmon', 'fresh chicken', 'fresh vegetables', 'fresh prawns'];
        items.forEach(item => {
          const result = classifyItem(item);
          expect(result.category).toBe('fridge');
          expect(result.isAmbiguous).toBe(false);
          expect(result.reason).toBe('keyword');
        });
      });

      it('should classify items with "tinned/canned" keyword to cupboard', () => {
        const items = ['tinned peas', 'canned soup', 'tinned beans', 'canned tuna'];
        items.forEach(item => {
          const result = classifyItem(item);
          expect(result.category).toBe('cupboard');
          expect(result.isAmbiguous).toBe(false);
          expect(result.reason).toBe('keyword');
        });
      });

      it('should classify items with "dried" keyword to pantry_staples', () => {
        const items = ['dried beans', 'dried herbs', 'dried pasta'];
        items.forEach(item => {
          const result = classifyItem(item);
          expect(result.category).toBe('pantry_staples');
          expect(result.isAmbiguous).toBe(false);
          expect(result.reason).toBe('keyword');
        });
      });
    });

    describe('multi-word item classification', () => {
      it('should classify known multi-word items', () => {
        expect(classifyItem('ice cream').category).toBe('freezer');
        expect(classifyItem('fish fingers').category).toBe('freezer');
        expect(classifyItem('baked beans').category).toBe('cupboard');
        expect(classifyItem('peanut butter').category).toBe('cupboard');
        expect(classifyItem('olive oil').category).toBe('pantry_staples');
      });
    });

    describe('single-word item classification', () => {
      it('should classify fridge items correctly', () => {
        const fridgeItems = ['milk', 'cheese', 'yogurt', 'butter', 'eggs', 'bacon', 'ham'];
        fridgeItems.forEach(item => {
          expect(classifyItem(item).category).toBe('fridge');
        });
      });

      it('should classify cupboard items correctly', () => {
        const cupboardItems = ['cereal', 'honey', 'crackers', 'biscuits', 'onions', 'potatoes'];
        cupboardItems.forEach(item => {
          expect(classifyItem(item).category).toBe('cupboard');
        });
      });

      it('should classify pantry staples correctly', () => {
        const pantryItems = ['pasta', 'rice', 'flour', 'sugar', 'salt', 'oats'];
        pantryItems.forEach(item => {
          expect(classifyItem(item).category).toBe('pantry_staples');
        });
      });
    });

    describe('ambiguous items', () => {
      it('should mark fish without qualifier as ambiguous', () => {
        const result = classifyItem('fish');
        expect(result.isAmbiguous).toBe(true);
        expect(result.category).toBe(null);
        expect(result.possibleCategories).toContain('fridge');
        expect(result.possibleCategories).toContain('freezer');
      });

      it('should mark bread without qualifier as ambiguous', () => {
        const result = classifyItem('bread');
        expect(result.isAmbiguous).toBe(true);
        expect(result.category).toBe(null);
        expect(result.possibleCategories).toContain('cupboard');
        expect(result.possibleCategories).toContain('freezer');
      });

      it('should mark berries without qualifier as ambiguous', () => {
        const result = classifyItem('berries');
        expect(result.isAmbiguous).toBe(true);
        expect(result.possibleCategories).toContain('fridge');
        expect(result.possibleCategories).toContain('freezer');
      });
    });

    describe('unknown items', () => {
      it('should return unknown for unrecognized items', () => {
        const result = classifyItem('xyzitem');
        expect(result.category).toBe(null);
        expect(result.isAmbiguous).toBe(false);
        expect(result.reason).toBe('unknown');
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase items', () => {
        expect(classifyItem('MILK').category).toBe('fridge');
        expect(classifyItem('FROZEN PEAS').category).toBe('freezer');
      });

      it('should handle mixed case items', () => {
        expect(classifyItem('Frozen Fish').category).toBe('freezer');
        expect(classifyItem('Tinned Beans').category).toBe('cupboard');
      });
    });
  });

  describe('isAmbiguous', () => {
    it('should return true for ambiguous items', () => {
      expect(isAmbiguous('fish')).toBe(true);
      expect(isAmbiguous('bread')).toBe(true);
      expect(isAmbiguous('berries')).toBe(true);
    });

    it('should return false for non-ambiguous items', () => {
      expect(isAmbiguous('milk')).toBe(false);
      expect(isAmbiguous('frozen fish')).toBe(false);
      expect(isAmbiguous('tinned beans')).toBe(false);
    });
  });

  describe('formatClarificationQuestion', () => {
    it('should format question with two options correctly', () => {
      const question = formatClarificationQuestion('fish', ['fridge', 'freezer']);
      expect(question).toBe('You said fish. Should that go in the fridge or freezer?');
    });

    it('should format question with three options correctly', () => {
      const question = formatClarificationQuestion('peas', ['fridge', 'freezer', 'cupboard']);
      expect(question).toBe('You said peas. Should that go in the fridge, freezer, or cupboard?');
    });

    it('should format pantry_staples as "pantry staples"', () => {
      const question = formatClarificationQuestion('beans', ['cupboard', 'pantry_staples']);
      expect(question).toBe('You said beans. Should that go in the cupboard or pantry staples?');
    });
  });
});
