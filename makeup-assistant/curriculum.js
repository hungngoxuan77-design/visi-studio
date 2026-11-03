/* Visi Studio — JSON curriculum & personalization engine.
 * Data comes from data/steps.sample.json at runtime; no hardcoded step copy.
 * Public API is pure, which makes selection rules testable without browser/camera.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisiCurriculum = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PLAN_IDS = ['basic', 'advanced'];
  const SKIN_IDS = ['normal', 'oily', 'dry', 'combination', 'sensitive'];
  const TONE_IDS = ['light', 'medium', 'tan', 'deep'];
  const STYLE_IDS = ['vietnam', 'douyin', 'western'];

  function validate(data) {
    if (!data || typeof data !== 'object' || !data.steps || typeof data.steps !== 'object' || Array.isArray(data.steps)) {
      throw new Error('JSON phải có đối tượng steps.');
    }
    const entries = Object.entries(data.steps);
    if (!entries.length) throw new Error('JSON không có bước trang điểm.');
    for (const [id, step] of entries) {
      if (!step || step.id !== id || typeof step.title !== 'string' || !step.title.trim()) throw new Error(`Bước ${id}: thiếu id hoặc title.`);
      if (!Array.isArray(step.instructionSteps) || !step.instructionSteps.length) throw new Error(`Bước ${id}: thiếu instructionSteps.`);
      if (!step.displayConditions || !Array.isArray(step.displayConditions.plans) || !step.displayConditions.plans.length) throw new Error(`Bước ${id}: thiếu displayConditions.plans.`);
      if (step.displayConditions.plans.some(p => !PLAN_IDS.includes(p))) throw new Error(`Bước ${id}: gói không hợp lệ.`);
      if (!Array.isArray(step.products) || !Array.isArray(step.tools)) throw new Error(`Bước ${id}: products/tools phải là mảng.`);
    }
    return data;
  }

  function getPlans(data) {
    const result = {basic: [], advanced: []};
    for (const [id, step] of Object.entries(validate(data).steps)) {
      for (const tier of step.displayConditions.plans) result[tier].push(id);
    }
    return result;
  }

  function isEligible(step, {skinType = 'combination', timeOfDay = 'day'} = {}) {
    const rules = step.displayConditions || {};
    if (Array.isArray(rules.eligibleSkinTypes) && rules.eligibleSkinTypes.length && !rules.eligibleSkinTypes.includes(skinType)) return false;
    if (Array.isArray(rules.timeOfDay) && rules.timeOfDay.length && !rules.timeOfDay.includes(timeOfDay)) return false;
    if (step.skinTypeConditions?.[skinType]?.enabled === false) return false;
    return true;
  }

  function getPlan(data, options = {}) {
    const {plan = 'auto', recommendedTier = 'basic', skinType = 'combination', timeOfDay = 'day', inventory = []} = options;
    const tier = plan === 'auto' ? (recommendedTier === 'advanced' ? 'advanced' : 'basic') : (PLAN_IDS.includes(plan) ? plan : 'basic');
    const owned = new Set(Array.isArray(inventory) ? inventory : []);
    const hasInventory = owned.size > 0;
    return getPlans(data)[tier].filter(id => {
      const step = data.steps[id];
      if (!isEligible(step, {skinType, timeOfDay})) return false;
      // Explicit plans show the full curriculum, with preparation warnings for missing items.
      // Auto plan hides *optional* steps marked as skippable when products are missing.
      if (plan !== 'auto' || !hasInventory || !step.displayConditions?.optional) return true;
      const need = step.displayConditions.inventoryCategories || step.requiredProductCategories || [];
      if (!need.length) return true;
      const available = need.some(cat => owned.has(cat));
      if (!available && step.displayConditions.missingInventoryAction === 'offer_skip_or_substitute') return false;
      return true;
    });
  }

  function missingProducts(step, owned = []) {
    if (!Array.isArray(owned) || !owned.length) return [];
    const categories = step.displayConditions?.inventoryCategories || step.requiredProductCategories || [];
    return categories.filter(category => !owned.includes(category));
  }

  function personalize(step, options = {}) {
    if (!step) throw new Error('Bước trang điểm không tồn tại.');
    const skinType = SKIN_IDS.includes(options.skinType) ? options.skinType : 'combination';
    const tone = TONE_IDS.includes(options.tone) ? options.tone : 'medium';
    const style = STYLE_IDS.includes(options.style) ? options.style : 'vietnam';
    const skin = step.skinTypeConditions?.[skinType] || null;
    const color = step.toneSuggestions?.[tone] || null;
    const styleGuidance = step.styleVariations?.[style] || '';
    return {
      ...step,
      skinGuidance: skin?.guidance || '',
      quantityGuidance: skin?.quantityGuidance || '',
      suggestedColors: Array.isArray(color?.suggestedColors) ? color.suggestedColors : [],
      toneNote: color?.note || '',
      styleGuidance,
      actions: [...(step.instructionSteps || [])].sort((a,b) => (a.order || 0) - (b.order || 0)),
      productNotes: Array.isArray(step.productNotes) ? step.productNotes : []
    };
  }

  return {validate, getPlans, getPlan, isEligible, missingProducts, personalize};
});
